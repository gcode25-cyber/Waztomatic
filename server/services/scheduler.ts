import cron from 'node-cron';
import { storage } from '../storage';
import { whatsappService } from './whatsapp';
import { parseSpintax } from './spintax';
import type { Campaign, MessageQueue } from '@shared/schema';

export class SchedulerService {
  private scheduledJobs: Map<string, cron.ScheduledTask> = new Map();
  private messageProcessor: NodeJS.Timeout | null = null;

  constructor() {
    // Start message processor every 30 seconds
    this.startMessageProcessor();
  }

  private startMessageProcessor() {
    this.messageProcessor = setInterval(async () => {
      await this.processQueuedMessages();
    }, 30000); // Process every 30 seconds
  }

  async scheduleCampaign(campaign: Campaign): Promise<void> {
    if (!campaign.scheduledAt) {
      // If no scheduled time, process immediately
      await this.processCampaign(campaign);
      return;
    }

    const scheduleTime = new Date(campaign.scheduledAt);
    const now = new Date();

    if (scheduleTime <= now) {
      // If scheduled time is in the past, process immediately
      await this.processCampaign(campaign);
      return;
    }

    // Create cron job for future execution
    const cronExpression = this.dateToCronExpression(scheduleTime);
    
    const job = cron.schedule(cronExpression, async () => {
      await this.processCampaign(campaign);
      this.scheduledJobs.delete(campaign.id);
    }, {
      timezone: "UTC"
    });

    job.start();
    this.scheduledJobs.set(campaign.id, job);

    // Update campaign status
    await storage.updateCampaign(campaign.id, { status: 'scheduled' });
  }

  private async processCampaign(campaign: Campaign): Promise<void> {
    try {
      // Update campaign status to sending
      await storage.updateCampaign(campaign.id, { status: 'sending' });

      // Get contacts based on contact groups
      let contacts = [];
      
      if (!campaign.contactGroups || campaign.contactGroups.length === 0) {
        // If no specific groups, get all contacts
        contacts = await storage.getContacts();
      } else {
        contacts = await storage.getContactsByGroups(campaign.contactGroups);
      }

      // Update total recipients
      await storage.updateCampaign(campaign.id, { 
        totalRecipients: contacts.length 
      });

      // Create message queue entries for each contact
      for (const contact of contacts) {
        // Parse message with contact variables
        let personalizedMessage = this.personalizeMessage(campaign.message, contact);
        
        // Apply spintax
        personalizedMessage = parseSpintax(personalizedMessage);

        await storage.createQueuedMessage({
          campaignId: campaign.id,
          contactId: contact.id,
          message: personalizedMessage,
          mediaUrl: campaign.mediaUrl,
          mediaType: campaign.mediaType,
          status: 'pending',
          scheduledAt: new Date(),
          sessionId: campaign.sessionId
        });
      }

      console.log(`Campaign ${campaign.name} processed: ${contacts.length} messages queued`);

    } catch (error) {
      console.error('Error processing campaign:', error);
      await storage.updateCampaign(campaign.id, { status: 'failed' });
    }
  }

  private async processQueuedMessages(): Promise<void> {
    try {
      // Get all active sessions
      const sessions = await storage.getSessions();
      
      for (const session of sessions) {
        if (session.status !== 'connected') continue;

        // Get pending messages for this session
        const pendingMessages = await storage.getPendingMessages(session.id);
        
        if (pendingMessages.length === 0) continue;

        // Get campaign for rate limiting
        const firstMessage = pendingMessages[0];
        const campaign = firstMessage.campaignId ? 
          await storage.getCampaign(firstMessage.campaignId) : null;
        
        const rateLimit = campaign?.rateLimit || 30; // messages per minute
        const batchSize = Math.min(rateLimit, pendingMessages.length);
        const messagesToProcess = pendingMessages.slice(0, batchSize);

        console.log(`Processing ${messagesToProcess.length} messages for session ${session.sessionId}`);

        for (const message of messagesToProcess) {
          try {
            const contact = await storage.getContact(message.contactId!);
            if (!contact) continue;

            // Send message via WhatsApp
            await whatsappService.sendMessage(
              session.sessionId,
              contact.phone,
              message.message,
              message.mediaUrl || undefined,
              message.mediaType || undefined
            );

            // Update message status
            await storage.updateQueuedMessage(message.id, {
              status: 'sent',
              sentAt: new Date()
            });

            // Update campaign stats
            if (message.campaignId) {
              const currentCampaign = await storage.getCampaign(message.campaignId);
              if (currentCampaign) {
                await storage.updateCampaign(message.campaignId, {
                  messagesSent: (currentCampaign.messagesSent || 0) + 1
                });
              }
            }

            // Delay between messages to avoid rate limiting
            if (batchSize > 1) {
              await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
            }

          } catch (error) {
            console.error('Error sending message:', error);
            
            // Update message status to failed
            await storage.updateQueuedMessage(message.id, {
              status: 'failed',
              errorMessage: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }

        // Check if campaign is complete
        if (firstMessage.campaignId) {
          await this.checkCampaignCompletion(firstMessage.campaignId);
        }
      }

    } catch (error) {
      console.error('Error processing message queue:', error);
    }
  }

  private async checkCampaignCompletion(campaignId: string): Promise<void> {
    const campaign = await storage.getCampaign(campaignId);
    if (!campaign) return;

    const pendingMessages = await storage.getMessageQueue();
    const campaignPending = pendingMessages.filter(msg => 
      msg.campaignId === campaignId && msg.status === 'pending'
    );

    if (campaignPending.length === 0) {
      // Campaign is complete
      await storage.updateCampaign(campaignId, { status: 'completed' });
      console.log(`Campaign ${campaign.name} completed`);
    }
  }

  private personalizeMessage(template: string, contact: any): string {
    let message = template;
    
    // Replace common variables
    message = message.replace(/\{name\}/g, contact.name || 'there');
    message = message.replace(/\{phone\}/g, contact.phone || '');
    message = message.replace(/\{email\}/g, contact.email || '');
    
    // Replace any custom metadata fields
    if (contact.metadata) {
      Object.keys(contact.metadata).forEach(key => {
        const regex = new RegExp(`\\{${key}\\}`, 'g');
        message = message.replace(regex, contact.metadata[key] || '');
      });
    }
    
    return message;
  }

  private dateToCronExpression(date: Date): string {
    const minute = date.getMinutes();
    const hour = date.getHours();
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    
    return `${minute} ${hour} ${day} ${month} *`;
  }

  cancelScheduledCampaign(campaignId: string): void {
    const job = this.scheduledJobs.get(campaignId);
    if (job) {
      job.stop();
      this.scheduledJobs.delete(campaignId);
    }
  }

  stopScheduler(): void {
    // Stop all scheduled jobs
    this.scheduledJobs.forEach(job => job.stop());
    this.scheduledJobs.clear();
    
    // Stop message processor
    if (this.messageProcessor) {
      clearInterval(this.messageProcessor);
      this.messageProcessor = null;
    }
  }
}

export const schedulerService = new SchedulerService();
