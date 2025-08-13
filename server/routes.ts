import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import multer from "multer";
import path from "path";
import fs from "fs";
import csv from "csv-parser";
import { storage } from "./storage";
import { whatsappService } from "./services/whatsapp";
import { schedulerService } from "./services/scheduler";
import QRCode from 'qrcode';
import { parseSpintax, validateSpintax, countSpintaxVariations } from "./services/spintax";
import { 
  insertContactSchema, 
  insertSessionSchema, 
  insertCampaignSchema, 
  insertAutoReplyRuleSchema 
} from "@shared/schema";

// Configure multer for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = path.join(process.cwd(), 'uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}-${file.originalname}`;
      cb(null, uniqueName);
    }
  }),
  limits: {
    fileSize: 16 * 1024 * 1024 // 16MB limit
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // WebSocket server for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  const clients = new Set<WebSocket>();

  wss.on('connection', (ws) => {
    clients.add(ws);
    console.log('WebSocket client connected');

    ws.on('close', () => {
      clients.delete(ws);
      console.log('WebSocket client disconnected');
    });
  });

  // Broadcast function for real-time updates
  function broadcast(data: any) {
    const message = JSON.stringify(data);
    clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  // ========== CONTACTS API ==========
  
  app.get('/api/contacts', async (req, res) => {
    try {
      const contacts = await storage.getContacts();
      res.json(contacts);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch contacts' });
    }
  });

  app.post('/api/contacts', async (req, res) => {
    try {
      const validatedData = insertContactSchema.parse(req.body);
      const contact = await storage.createContact(validatedData);
      broadcast({ type: 'contact_created', data: contact });
      res.json(contact);
    } catch (error) {
      res.status(400).json({ error: 'Invalid contact data' });
    }
  });

  app.put('/api/contacts/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const contact = await storage.updateContact(id, req.body);
      if (!contact) {
        return res.status(404).json({ error: 'Contact not found' });
      }
      broadcast({ type: 'contact_updated', data: contact });
      res.json(contact);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update contact' });
    }
  });

  app.delete('/api/contacts/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteContact(id);
      if (!deleted) {
        return res.status(404).json({ error: 'Contact not found' });
      }
      broadcast({ type: 'contact_deleted', data: { id } });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete contact' });
    }
  });

  // Import contacts from CSV
  app.post('/api/contacts/import', upload.single('csv'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No CSV file uploaded' });
      }

      const results: any[] = [];
      const errors: string[] = [];

      fs.createReadStream(req.file.path)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', async () => {
          let imported = 0;
          
          for (const row of results) {
            try {
              const contactData = {
                name: row.name || row.Name || '',
                phone: row.phone || row.Phone || '',
                email: row.email || row.Email || '',
                groups: row.groups ? row.groups.split(',').map((g: string) => g.trim()) : []
              };

              if (!contactData.name || !contactData.phone) {
                errors.push(`Skipped row: missing name or phone - ${JSON.stringify(row)}`);
                continue;
              }

              await storage.createContact(contactData);
              imported++;
            } catch (error) {
              errors.push(`Error importing row: ${JSON.stringify(row)} - ${error}`);
            }
          }

          // Clean up uploaded file
          fs.unlinkSync(req.file!.path);

          broadcast({ type: 'contacts_imported', data: { imported, errors: errors.length } });
          res.json({ 
            imported, 
            errors: errors.length,
            errorDetails: errors.slice(0, 10) // Return first 10 errors
          });
        });

    } catch (error) {
      res.status(500).json({ error: 'Failed to import contacts' });
    }
  });

  // Export contacts to CSV
  app.get('/api/contacts/export', async (req, res) => {
    try {
      const contacts = await storage.getContacts();
      
      // Generate CSV content
      const csvHeader = 'name,phone,email,groups\n';
      const csvContent = contacts.map(contact => 
        `"${contact.name}","${contact.phone}","${contact.email || ''}","${contact.groups?.join(',') || ''}"`
      ).join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=contacts.csv');
      res.send(csvHeader + csvContent);
    } catch (error) {
      res.status(500).json({ error: 'Failed to export contacts' });
    }
  });

  // ========== WHATSAPP SESSIONS API ==========

  app.get('/api/sessions', async (req, res) => {
    try {
      const sessions = await storage.getSessions();
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch sessions' });
    }
  });

  app.post('/api/sessions', async (req, res) => {
    try {
      const validatedData = insertSessionSchema.parse(req.body);
      const session = await storage.createSession(validatedData);
      
      // Create WhatsApp connection
      const { qrCode } = await whatsappService.createSession(session.sessionId);
      
      if (qrCode) {
        await storage.updateSession(session.id, { qrCode, status: 'qr_pending' });
      }

      const updatedSession = await storage.getSession(session.id);
      broadcast({ type: 'session_created', data: updatedSession });
      res.json(updatedSession);
    } catch (error) {
      console.error('Error creating session:', error);
      res.status(500).json({ error: 'Failed to create session' });
    }
  });

  app.delete('/api/sessions/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const session = await storage.getSession(id);
      
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      // Disconnect WhatsApp session
      await whatsappService.disconnectSession(session.sessionId);
      
      // Delete from storage
      await storage.deleteSession(id);
      
      broadcast({ type: 'session_deleted', data: { id } });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete session' });
    }
  });

  app.get('/api/sessions/:id/qr', async (req, res) => {
    try {
      const { id } = req.params;
      const session = await storage.getSession(id);
      
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      let qrCode = session.qrCode;
      
      // If QR code exists and is not already a data URL, convert it
      if (qrCode && !qrCode.startsWith('data:image/')) {
        try {
          qrCode = await QRCode.toDataURL(qrCode);
          // Update the database with the converted QR code
          await storage.updateSession(id, { qrCode });
        } catch (error) {
          console.error('Error converting QR code to data URL:', error);
        }
      }

      res.json({ qrCode });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get QR code' });
    }
  });

  // ========== CAMPAIGNS API ==========

  app.get('/api/campaigns', async (req, res) => {
    try {
      const campaigns = await storage.getCampaigns();
      res.json(campaigns);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch campaigns' });
    }
  });

  app.post('/api/campaigns', upload.single('media'), async (req, res) => {
    try {
      const campaignData = JSON.parse(req.body.data || '{}');
      const validatedData = insertCampaignSchema.parse(campaignData);
      
      // Handle media upload
      if (req.file) {
        validatedData.mediaUrl = req.file.path;
        validatedData.mediaType = req.file.mimetype.startsWith('image/') ? 'image' :
                                  req.file.mimetype.startsWith('video/') ? 'video' :
                                  req.file.mimetype.startsWith('audio/') ? 'audio' : 'document';
      }

      const campaign = await storage.createCampaign(validatedData);
      
      // Schedule or start campaign
      if (campaign.scheduledAt) {
        await schedulerService.scheduleCampaign(campaign);
      } else {
        // Start immediately
        await schedulerService.scheduleCampaign(campaign);
      }

      broadcast({ type: 'campaign_created', data: campaign });
      res.json(campaign);
    } catch (error) {
      console.error('Error creating campaign:', error);
      res.status(400).json({ error: 'Invalid campaign data' });
    }
  });

  app.put('/api/campaigns/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const campaign = await storage.updateCampaign(id, req.body);
      if (!campaign) {
        return res.status(404).json({ error: 'Campaign not found' });
      }
      broadcast({ type: 'campaign_updated', data: campaign });
      res.json(campaign);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update campaign' });
    }
  });

  app.delete('/api/campaigns/:id', async (req, res) => {
    try {
      const { id } = req.params;
      
      // Cancel scheduled campaign
      schedulerService.cancelScheduledCampaign(id);
      
      const deleted = await storage.deleteCampaign(id);
      if (!deleted) {
        return res.status(404).json({ error: 'Campaign not found' });
      }
      
      broadcast({ type: 'campaign_deleted', data: { id } });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete campaign' });
    }
  });

  // Pause/Resume campaign
  app.post('/api/campaigns/:id/pause', async (req, res) => {
    try {
      const { id } = req.params;
      const campaign = await storage.updateCampaign(id, { status: 'paused' });
      if (!campaign) {
        return res.status(404).json({ error: 'Campaign not found' });
      }
      broadcast({ type: 'campaign_paused', data: campaign });
      res.json(campaign);
    } catch (error) {
      res.status(500).json({ error: 'Failed to pause campaign' });
    }
  });

  // ========== AUTO-REPLY RULES API ==========

  app.get('/api/auto-reply-rules', async (req, res) => {
    try {
      const { sessionId } = req.query;
      const rules = await storage.getAutoReplyRules(sessionId as string);
      res.json(rules);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch auto-reply rules' });
    }
  });

  app.post('/api/auto-reply-rules', async (req, res) => {
    try {
      const validatedData = insertAutoReplyRuleSchema.parse(req.body);
      const rule = await storage.createAutoReplyRule(validatedData);
      broadcast({ type: 'auto_reply_rule_created', data: rule });
      res.json(rule);
    } catch (error) {
      res.status(400).json({ error: 'Invalid auto-reply rule data' });
    }
  });

  app.put('/api/auto-reply-rules/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const rule = await storage.updateAutoReplyRule(id, req.body);
      if (!rule) {
        return res.status(404).json({ error: 'Auto-reply rule not found' });
      }
      broadcast({ type: 'auto_reply_rule_updated', data: rule });
      res.json(rule);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update auto-reply rule' });
    }
  });

  app.delete('/api/auto-reply-rules/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteAutoReplyRule(id);
      if (!deleted) {
        return res.status(404).json({ error: 'Auto-reply rule not found' });
      }
      broadcast({ type: 'auto_reply_rule_deleted', data: { id } });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete auto-reply rule' });
    }
  });

  // ========== SPINTAX API ==========

  app.post('/api/spintax/validate', async (req, res) => {
    try {
      const { text } = req.body;
      const validation = validateSpintax(text);
      const variations = countSpintaxVariations(text);
      res.json({ ...validation, variations });
    } catch (error) {
      res.status(500).json({ error: 'Failed to validate spintax' });
    }
  });

  app.post('/api/spintax/preview', async (req, res) => {
    try {
      const { text } = req.body;
      const examples = [];
      
      for (let i = 0; i < 5; i++) {
        examples.push(parseSpintax(text));
      }
      
      res.json({ examples });
    } catch (error) {
      res.status(500).json({ error: 'Failed to generate spintax preview' });
    }
  });

  // ========== ANALYTICS API ==========

  app.get('/api/analytics/dashboard', async (req, res) => {
    try {
      const { sessionId, startDate, endDate } = req.query;
      
      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;
      
      const analytics = await storage.getMessageAnalytics(
        sessionId as string, 
        start, 
        end
      );

      const campaigns = await storage.getCampaigns();
      const contacts = await storage.getContacts();
      const sessions = await storage.getSessions();

      // Calculate statistics
      const messagesSent = analytics.filter(a => a.messageType === 'sent').length;
      const messagesDelivered = analytics.filter(a => a.messageType === 'delivered').length;
      const messagesResponded = analytics.filter(a => a.messageType === 'received').length;
      const activeContacts = contacts.length;

      res.json({
        messagesSent,
        messagesDelivered,
        messagesResponded,
        activeContacts,
        deliveryRate: messagesSent > 0 ? (messagesDelivered / messagesSent * 100).toFixed(1) : '0',
        responseRate: messagesSent > 0 ? (messagesResponded / messagesSent * 100).toFixed(1) : '0',
        campaigns: campaigns.slice(0, 10), // Recent campaigns
        sessions: sessions.filter(s => s.status === 'connected')
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch analytics' });
    }
  });

  app.get('/api/analytics/message-queue', async (req, res) => {
    try {
      const { sessionId } = req.query;
      const messageQueue = await storage.getMessageQueue(sessionId as string);
      res.json(messageQueue);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch message queue' });
    }
  });

  return httpServer;
}
