import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const baileys = require('@whiskeysockets/baileys');
const {
  makeWASocket,
  ConnectionState, 
  DisconnectReason, 
  useMultiFileAuthState, 
  MessageType,
  proto,
  downloadMediaMessage,
  WAMessageKey
} = baileys;
import type { WASocket } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';
import { storage } from '../storage';
import type { WhatsappSession } from '@shared/schema';

interface SessionData {
  socket: WASocket | null;
  qr: string | null;
  status: string;
  phone: string | null;
}

export class WhatsAppService {
  private sessions: Map<string, SessionData> = new Map();
  private authDir = path.join(process.cwd(), 'auth_sessions');

  constructor() {
    // Ensure auth directory exists
    if (!fs.existsSync(this.authDir)) {
      fs.mkdirSync(this.authDir, { recursive: true });
    }
  }

  async createSession(sessionId: string): Promise<{ qrCode: string | null }> {
    try {
      const sessionPath = path.join(this.authDir, sessionId);
      
      // Ensure session directory exists
      if (!fs.existsSync(sessionPath)) {
        fs.mkdirSync(sessionPath, { recursive: true });
      }

      const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
      
      const socket = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        browser: ['Waziper', 'Chrome', '1.0.0']
      });

      // Initialize session data
      const sessionData: SessionData = {
        socket,
        qr: null,
        status: 'connecting',
        phone: null
      };

      this.sessions.set(sessionId, sessionData);

      // Handle connection events
      socket.ev.on('connection.update', async (update) => {
        await this.handleConnectionUpdate(sessionId, update);
      });

      socket.ev.on('creds.update', saveCreds);

      // Handle incoming messages for auto-reply
      socket.ev.on('messages.upsert', async (m) => {
        await this.handleIncomingMessages(sessionId, m);
      });

      // Handle message status updates
      socket.ev.on('message-receipt.update', async (updates) => {
        await this.handleMessageReceipts(sessionId, updates);
      });

      // Wait for QR or connection
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          resolve({ qrCode: sessionData.qr });
        }, 10000);

        socket.ev.on('connection.update', async (update) => {
          if (update.qr) {
            try {
              const qrCodeDataUrl = await QRCode.toDataURL(update.qr);
              sessionData.qr = qrCodeDataUrl;
              sessionData.status = 'qr_pending';
              clearTimeout(timeout);
              resolve({ qrCode: qrCodeDataUrl });
            } catch (error) {
              console.error('Error generating QR code:', error);
              clearTimeout(timeout);
              resolve({ qrCode: null });
            }
          } else if (update.connection === 'open') {
            clearTimeout(timeout);
            resolve({ qrCode: null });
          }
        });
      });

    } catch (error) {
      console.error('Error creating WhatsApp session:', error);
      throw new Error('Failed to create WhatsApp session');
    }
  }

  private async handleConnectionUpdate(sessionId: string, update: Partial<ConnectionState>) {
    const sessionData = this.sessions.get(sessionId);
    if (!sessionData) return;

    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      try {
        const qrCodeDataUrl = await QRCode.toDataURL(qr);
        sessionData.qr = qrCodeDataUrl;
        sessionData.status = 'qr_pending';
        
        // Update database
        await storage.updateSession(sessionId, { 
          qrCode: qrCodeDataUrl, 
          status: 'qr_pending' 
        });
      } catch (error) {
        console.error('Error generating QR code:', error);
      }
    }

    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
      
      if (shouldReconnect) {
        sessionData.status = 'connecting';
        await storage.updateSession(sessionId, { status: 'connecting' });
        // Reconnect after delay
        setTimeout(() => this.createSession(sessionId), 3000);
      } else {
        sessionData.status = 'disconnected';
        sessionData.socket = null;
        sessionData.phone = null;
        await storage.updateSession(sessionId, { 
          status: 'disconnected',
          phone: null,
          qrCode: null 
        });
      }
    } else if (connection === 'open') {
      sessionData.status = 'connected';
      sessionData.qr = null;
      
      // Get phone number
      const phoneNumber = sessionData.socket?.user?.id?.split(':')[0];
      if (phoneNumber) {
        sessionData.phone = phoneNumber;
      }

      await storage.updateSession(sessionId, { 
        status: 'connected',
        phone: sessionData.phone,
        qrCode: null,
        lastSeen: new Date()
      });
    }
  }

  private async handleIncomingMessages(sessionId: string, messageUpdate: any) {
    const messages = messageUpdate.messages;
    if (!messages || messages.length === 0) return;

    for (const message of messages) {
      if (message.key.fromMe) continue; // Skip messages sent by us

      const fromNumber = message.key.remoteJid?.split('@')[0];
      const messageText = message.message?.conversation || 
                         message.message?.extendedTextMessage?.text || '';

      if (!fromNumber || !messageText) continue;

      // Check auto-reply rules
      const autoReplyRules = await storage.getAutoReplyRules(sessionId);
      
      for (const rule of autoReplyRules) {
        if (!rule.isActive) continue;

        const shouldReply = this.checkAutoReplyTrigger(messageText, rule);
        
        if (shouldReply) {
          // Apply delay if specified
          if (rule.delay && rule.delay > 0) {
            setTimeout(() => {
              this.sendAutoReply(sessionId, fromNumber, rule.response);
            }, rule.delay * 1000);
          } else {
            await this.sendAutoReply(sessionId, fromNumber, rule.response);
          }
          break; // Only trigger first matching rule
        }
      }

      // Log message analytics
      await storage.createMessageAnalytic({
        messageId: null,
        contactPhone: fromNumber,
        messageType: 'received',
        timestamp: new Date(),
        sessionId
      });
    }
  }

  private checkAutoReplyTrigger(messageText: string, rule: any): boolean {
    const text = messageText.toLowerCase();
    
    switch (rule.triggerType) {
      case 'contains':
        return rule.keywords.some((keyword: string) => 
          text.includes(keyword.toLowerCase())
        );
      case 'exact':
        return rule.keywords.some((keyword: string) => 
          text === keyword.toLowerCase()
        );
      case 'starts_with':
        return rule.keywords.some((keyword: string) => 
          text.startsWith(keyword.toLowerCase())
        );
      case 'ends_with':
        return rule.keywords.some((keyword: string) => 
          text.endsWith(keyword.toLowerCase())
        );
      case 'any':
        return true;
      default:
        return false;
    }
  }

  private async sendAutoReply(sessionId: string, toNumber: string, response: string) {
    const sessionData = this.sessions.get(sessionId);
    if (!sessionData?.socket) return;

    try {
      await sessionData.socket.sendMessage(`${toNumber}@s.whatsapp.net`, {
        text: response
      });

      // Log sent message
      await storage.createMessageAnalytic({
        messageId: null,
        contactPhone: toNumber,
        messageType: 'sent',
        timestamp: new Date(),
        sessionId
      });
    } catch (error) {
      console.error('Error sending auto-reply:', error);
    }
  }

  private async handleMessageReceipts(sessionId: string, updates: any[]) {
    for (const update of updates) {
      const { key, receipt } = update;
      
      if (receipt?.readTimestamp || receipt?.deliveredTimestamp) {
        const messageType = receipt.readTimestamp ? 'read' : 'delivered';
        const contactPhone = key.remoteJid?.split('@')[0];
        
        if (contactPhone) {
          await storage.createMessageAnalytic({
            messageId: null,
            contactPhone,
            messageType,
            timestamp: new Date(),
            sessionId
          });
        }
      }
    }
  }

  async sendMessage(sessionId: string, toNumber: string, message: string, mediaUrl?: string, mediaType?: string): Promise<boolean> {
    const sessionData = this.sessions.get(sessionId);
    if (!sessionData?.socket || sessionData.status !== 'connected') {
      throw new Error('WhatsApp session not connected');
    }

    try {
      const jid = `${toNumber}@s.whatsapp.net`;
      
      if (mediaUrl && mediaType) {
        // Send media message
        const mediaBuffer = fs.readFileSync(mediaUrl);
        
        let messageContent: any = {};
        
        switch (mediaType) {
          case 'image':
            messageContent = { image: mediaBuffer, caption: message };
            break;
          case 'video':
            messageContent = { video: mediaBuffer, caption: message };
            break;
          case 'document':
            messageContent = { 
              document: mediaBuffer, 
              mimetype: 'application/pdf',
              fileName: path.basename(mediaUrl)
            };
            break;
          case 'audio':
            messageContent = { audio: mediaBuffer };
            break;
          default:
            messageContent = { text: message };
        }
        
        await sessionData.socket.sendMessage(jid, messageContent);
      } else {
        // Send text message
        await sessionData.socket.sendMessage(jid, { text: message });
      }

      // Log sent message
      await storage.createMessageAnalytic({
        messageId: null,
        contactPhone: toNumber,
        messageType: 'sent',
        timestamp: new Date(),
        sessionId
      });

      return true;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  async disconnectSession(sessionId: string): Promise<void> {
    const sessionData = this.sessions.get(sessionId);
    if (sessionData?.socket) {
      await sessionData.socket.logout();
      sessionData.socket = null;
    }
    
    this.sessions.delete(sessionId);
    await storage.updateSession(sessionId, { 
      status: 'disconnected',
      phone: null,
      qrCode: null
    });
  }

  getSessionStatus(sessionId: string): SessionData | null {
    return this.sessions.get(sessionId) || null;
  }

  getAllSessionStatuses(): Map<string, SessionData> {
    return this.sessions;
  }
}

export const whatsappService = new WhatsAppService();
