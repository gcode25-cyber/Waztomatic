import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const contacts = pgTable("contacts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  groups: text("groups").array().default([]),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const whatsappSessions = pgTable("whatsapp_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: text("session_id").notNull().unique(),
  phone: text("phone"),
  status: text("status").notNull().default("disconnected"), // connected, disconnected, connecting, qr_pending
  qrCode: text("qr_code"),
  lastSeen: timestamp("last_seen"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const campaigns = pgTable("campaigns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  message: text("message").notNull(),
  contactGroups: text("contact_groups").array().default([]),
  mediaUrl: text("media_url"),
  mediaType: text("media_type"), // image, video, document, audio
  status: text("status").notNull().default("draft"), // draft, scheduled, sending, completed, paused
  scheduledAt: timestamp("scheduled_at"),
  rateLimit: integer("rate_limit").default(30), // messages per minute
  totalRecipients: integer("total_recipients").default(0),
  messagesSent: integer("messages_sent").default(0),
  messagesDelivered: integer("messages_delivered").default(0),
  messagesResponded: integer("messages_responded").default(0),
  sessionId: varchar("session_id").references(() => whatsappSessions.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const autoReplyRules = pgTable("auto_reply_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  keywords: text("keywords").array().default([]),
  triggerType: text("trigger_type").notNull().default("contains"), // contains, exact, starts_with, ends_with, any, first_message
  response: text("response").notNull(),
  delay: integer("delay").default(0), // delay in seconds
  isActive: boolean("is_active").default(true),
  businessHoursOnly: boolean("business_hours_only").default(false),
  businessHoursStart: text("business_hours_start").default("09:00"),
  businessHoursEnd: text("business_hours_end").default("18:00"),
  sessionId: varchar("session_id").references(() => whatsappSessions.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const messageQueue = pgTable("message_queue", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  campaignId: varchar("campaign_id").references(() => campaigns.id),
  contactId: varchar("contact_id").references(() => contacts.id),
  message: text("message").notNull(),
  mediaUrl: text("media_url"),
  mediaType: text("media_type"),
  status: text("status").notNull().default("pending"), // pending, sent, delivered, failed
  scheduledAt: timestamp("scheduled_at"),
  sentAt: timestamp("sent_at"),
  deliveredAt: timestamp("delivered_at"),
  errorMessage: text("error_message"),
  sessionId: varchar("session_id").references(() => whatsappSessions.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const messageAnalytics = pgTable("message_analytics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  messageId: varchar("message_id").references(() => messageQueue.id),
  contactPhone: text("contact_phone").notNull(),
  messageType: text("message_type").notNull(), // sent, received, delivered, read
  timestamp: timestamp("timestamp").defaultNow(),
  sessionId: varchar("session_id").references(() => whatsappSessions.id),
});

// Insert schemas
export const insertContactSchema = createInsertSchema(contacts).omit({
  id: true,
  createdAt: true,
});

export const insertSessionSchema = createInsertSchema(whatsappSessions).omit({
  id: true,
  createdAt: true,
  lastSeen: true,
});

export const insertCampaignSchema = createInsertSchema(campaigns).omit({
  id: true,
  createdAt: true,
  totalRecipients: true,
  messagesSent: true,
  messagesDelivered: true,
  messagesResponded: true,
});

export const insertAutoReplyRuleSchema = createInsertSchema(autoReplyRules).omit({
  id: true,
  createdAt: true,
});

export const insertMessageQueueSchema = createInsertSchema(messageQueue).omit({
  id: true,
  createdAt: true,
  sentAt: true,
  deliveredAt: true,
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

// Types
export type Contact = typeof contacts.$inferSelect;
export type InsertContact = z.infer<typeof insertContactSchema>;

export type WhatsappSession = typeof whatsappSessions.$inferSelect;
export type InsertWhatsappSession = z.infer<typeof insertSessionSchema>;

export type Campaign = typeof campaigns.$inferSelect;
export type InsertCampaign = z.infer<typeof insertCampaignSchema>;

export type AutoReplyRule = typeof autoReplyRules.$inferSelect;
export type InsertAutoReplyRule = z.infer<typeof insertAutoReplyRuleSchema>;

export type MessageQueue = typeof messageQueue.$inferSelect;
export type InsertMessageQueue = z.infer<typeof insertMessageQueueSchema>;

export type MessageAnalytics = typeof messageAnalytics.$inferSelect;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
