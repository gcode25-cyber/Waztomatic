import { 
  type Contact, 
  type InsertContact,
  type WhatsappSession,
  type InsertWhatsappSession,
  type Campaign,
  type InsertCampaign,
  type AutoReplyRule,
  type InsertAutoReplyRule,
  type MessageQueue,
  type InsertMessageQueue,
  type MessageAnalytics,
  type User, 
  type InsertUser 
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Contacts
  getContacts(): Promise<Contact[]>;
  getContact(id: string): Promise<Contact | undefined>;
  createContact(contact: InsertContact): Promise<Contact>;
  updateContact(id: string, contact: Partial<Contact>): Promise<Contact | undefined>;
  deleteContact(id: string): Promise<boolean>;
  getContactsByGroups(groups: string[]): Promise<Contact[]>;

  // WhatsApp Sessions
  getSessions(): Promise<WhatsappSession[]>;
  getSession(id: string): Promise<WhatsappSession | undefined>;
  getSessionBySessionId(sessionId: string): Promise<WhatsappSession | undefined>;
  createSession(session: InsertWhatsappSession): Promise<WhatsappSession>;
  updateSession(id: string, session: Partial<WhatsappSession>): Promise<WhatsappSession | undefined>;
  deleteSession(id: string): Promise<boolean>;

  // Campaigns
  getCampaigns(): Promise<Campaign[]>;
  getCampaign(id: string): Promise<Campaign | undefined>;
  createCampaign(campaign: InsertCampaign): Promise<Campaign>;
  updateCampaign(id: string, campaign: Partial<Campaign>): Promise<Campaign | undefined>;
  deleteCampaign(id: string): Promise<boolean>;

  // Auto Reply Rules
  getAutoReplyRules(sessionId?: string): Promise<AutoReplyRule[]>;
  getAutoReplyRule(id: string): Promise<AutoReplyRule | undefined>;
  createAutoReplyRule(rule: InsertAutoReplyRule): Promise<AutoReplyRule>;
  updateAutoReplyRule(id: string, rule: Partial<AutoReplyRule>): Promise<AutoReplyRule | undefined>;
  deleteAutoReplyRule(id: string): Promise<boolean>;

  // Message Queue
  getMessageQueue(sessionId?: string): Promise<MessageQueue[]>;
  getQueuedMessage(id: string): Promise<MessageQueue | undefined>;
  createQueuedMessage(message: InsertMessageQueue): Promise<MessageQueue>;
  updateQueuedMessage(id: string, message: Partial<MessageQueue>): Promise<MessageQueue | undefined>;
  getPendingMessages(sessionId: string): Promise<MessageQueue[]>;

  // Analytics
  getMessageAnalytics(sessionId?: string, startDate?: Date, endDate?: Date): Promise<MessageAnalytics[]>;
  createMessageAnalytic(analytic: Omit<MessageAnalytics, 'id'>): Promise<MessageAnalytics>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private contacts: Map<string, Contact>;
  private sessions: Map<string, WhatsappSession>;
  private campaigns: Map<string, Campaign>;
  private autoReplyRules: Map<string, AutoReplyRule>;
  private messageQueue: Map<string, MessageQueue>;
  private messageAnalytics: Map<string, MessageAnalytics>;

  constructor() {
    this.users = new Map();
    this.contacts = new Map();
    this.sessions = new Map();
    this.campaigns = new Map();
    this.autoReplyRules = new Map();
    this.messageQueue = new Map();
    this.messageAnalytics = new Map();
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Contacts
  async getContacts(): Promise<Contact[]> {
    return Array.from(this.contacts.values());
  }

  async getContact(id: string): Promise<Contact | undefined> {
    return this.contacts.get(id);
  }

  async createContact(insertContact: InsertContact): Promise<Contact> {
    const id = randomUUID();
    const contact: Contact = { 
      ...insertContact, 
      id, 
      createdAt: new Date(),
      groups: insertContact.groups || null,
      metadata: insertContact.metadata || null,
      email: insertContact.email || null
    };
    this.contacts.set(id, contact);
    return contact;
  }

  async updateContact(id: string, contactUpdate: Partial<Contact>): Promise<Contact | undefined> {
    const contact = this.contacts.get(id);
    if (!contact) return undefined;
    
    const updated = { ...contact, ...contactUpdate };
    this.contacts.set(id, updated);
    return updated;
  }

  async deleteContact(id: string): Promise<boolean> {
    return this.contacts.delete(id);
  }

  async getContactsByGroups(groups: string[]): Promise<Contact[]> {
    return Array.from(this.contacts.values()).filter(contact =>
      contact.groups?.some(group => groups.includes(group))
    );
  }

  // WhatsApp Sessions
  async getSessions(): Promise<WhatsappSession[]> {
    return Array.from(this.sessions.values());
  }

  async getSession(id: string): Promise<WhatsappSession | undefined> {
    return this.sessions.get(id);
  }

  async getSessionBySessionId(sessionId: string): Promise<WhatsappSession | undefined> {
    return Array.from(this.sessions.values()).find(session => session.sessionId === sessionId);
  }

  async createSession(insertSession: InsertWhatsappSession): Promise<WhatsappSession> {
    const id = randomUUID();
    const session: WhatsappSession = { 
      ...insertSession, 
      id, 
      createdAt: new Date(),
      lastSeen: null,
      status: insertSession.status || 'pending',
      phone: insertSession.phone || null,
      qrCode: insertSession.qrCode || null
    };
    this.sessions.set(id, session);
    return session;
  }

  async updateSession(id: string, sessionUpdate: Partial<WhatsappSession>): Promise<WhatsappSession | undefined> {
    const session = this.sessions.get(id);
    if (!session) return undefined;
    
    const updated = { ...session, ...sessionUpdate };
    this.sessions.set(id, updated);
    return updated;
  }

  async deleteSession(id: string): Promise<boolean> {
    return this.sessions.delete(id);
  }

  // Campaigns
  async getCampaigns(): Promise<Campaign[]> {
    return Array.from(this.campaigns.values());
  }

  async getCampaign(id: string): Promise<Campaign | undefined> {
    return this.campaigns.get(id);
  }

  async createCampaign(insertCampaign: InsertCampaign): Promise<Campaign> {
    const id = randomUUID();
    const campaign: Campaign = { 
      ...insertCampaign, 
      id,
      createdAt: new Date(),
      totalRecipients: 0,
      messagesSent: 0,
      messagesDelivered: 0,
      messagesResponded: 0,
      contactGroups: insertCampaign.contactGroups || null,
      status: insertCampaign.status || 'draft',
      sessionId: insertCampaign.sessionId || null,
      mediaUrl: insertCampaign.mediaUrl || null,
      mediaType: insertCampaign.mediaType || null,
      scheduledAt: insertCampaign.scheduledAt || null,
      rateLimit: insertCampaign.rateLimit ?? 30
    };
    this.campaigns.set(id, campaign);
    return campaign;
  }

  async updateCampaign(id: string, campaignUpdate: Partial<Campaign>): Promise<Campaign | undefined> {
    const campaign = this.campaigns.get(id);
    if (!campaign) return undefined;
    
    const updated = { ...campaign, ...campaignUpdate };
    this.campaigns.set(id, updated);
    return updated;
  }

  async deleteCampaign(id: string): Promise<boolean> {
    return this.campaigns.delete(id);
  }

  // Auto Reply Rules
  async getAutoReplyRules(sessionId?: string): Promise<AutoReplyRule[]> {
    const rules = Array.from(this.autoReplyRules.values());
    return sessionId ? rules.filter(rule => rule.sessionId === sessionId) : rules;
  }

  async getAutoReplyRule(id: string): Promise<AutoReplyRule | undefined> {
    return this.autoReplyRules.get(id);
  }

  async createAutoReplyRule(insertRule: InsertAutoReplyRule): Promise<AutoReplyRule> {
    const id = randomUUID();
    const rule: AutoReplyRule = { 
      ...insertRule, 
      id,
      createdAt: new Date(),
      keywords: insertRule.keywords || null,
      sessionId: insertRule.sessionId || null,
      delay: insertRule.delay || null,
      isActive: insertRule.isActive ?? null,
      businessHoursOnly: insertRule.businessHoursOnly ?? null,
      businessHoursStart: insertRule.businessHoursStart || null,
      businessHoursEnd: insertRule.businessHoursEnd || null,
      triggerType: insertRule.triggerType || 'contains'
    };
    this.autoReplyRules.set(id, rule);
    return rule;
  }

  async updateAutoReplyRule(id: string, ruleUpdate: Partial<AutoReplyRule>): Promise<AutoReplyRule | undefined> {
    const rule = this.autoReplyRules.get(id);
    if (!rule) return undefined;
    
    const updated = { ...rule, ...ruleUpdate };
    this.autoReplyRules.set(id, updated);
    return updated;
  }

  async deleteAutoReplyRule(id: string): Promise<boolean> {
    return this.autoReplyRules.delete(id);
  }

  // Message Queue
  async getMessageQueue(sessionId?: string): Promise<MessageQueue[]> {
    const messages = Array.from(this.messageQueue.values());
    return sessionId ? messages.filter(msg => msg.sessionId === sessionId) : messages;
  }

  async getQueuedMessage(id: string): Promise<MessageQueue | undefined> {
    return this.messageQueue.get(id);
  }

  async createQueuedMessage(insertMessage: InsertMessageQueue): Promise<MessageQueue> {
    const id = randomUUID();
    const message: MessageQueue = { 
      ...insertMessage, 
      id,
      createdAt: new Date(),
      sentAt: null,
      deliveredAt: null,
      status: insertMessage.status || 'pending',
      sessionId: insertMessage.sessionId || null,
      mediaUrl: insertMessage.mediaUrl || null,
      mediaType: insertMessage.mediaType || null,
      scheduledAt: insertMessage.scheduledAt || null,
      contactId: insertMessage.contactId || null,
      campaignId: insertMessage.campaignId || null,
      errorMessage: insertMessage.errorMessage || null
    };
    this.messageQueue.set(id, message);
    return message;
  }

  async updateQueuedMessage(id: string, messageUpdate: Partial<MessageQueue>): Promise<MessageQueue | undefined> {
    const message = this.messageQueue.get(id);
    if (!message) return undefined;
    
    const updated = { ...message, ...messageUpdate };
    this.messageQueue.set(id, updated);
    return updated;
  }

  async getPendingMessages(sessionId: string): Promise<MessageQueue[]> {
    return Array.from(this.messageQueue.values()).filter(msg => 
      msg.sessionId === sessionId && msg.status === 'pending'
    );
  }

  // Analytics
  async getMessageAnalytics(sessionId?: string, startDate?: Date, endDate?: Date): Promise<MessageAnalytics[]> {
    let analytics = Array.from(this.messageAnalytics.values());
    
    if (sessionId) {
      analytics = analytics.filter(a => a.sessionId === sessionId);
    }
    
    if (startDate) {
      analytics = analytics.filter(a => a.timestamp && a.timestamp >= startDate);
    }
    
    if (endDate) {
      analytics = analytics.filter(a => a.timestamp && a.timestamp <= endDate);
    }
    
    return analytics;
  }

  async createMessageAnalytic(analytic: Omit<MessageAnalytics, 'id'>): Promise<MessageAnalytics> {
    const id = randomUUID();
    const messageAnalytic: MessageAnalytics = { ...analytic, id };
    this.messageAnalytics.set(id, messageAnalytic);
    return messageAnalytic;
  }
}

export const storage = new MemStorage();
