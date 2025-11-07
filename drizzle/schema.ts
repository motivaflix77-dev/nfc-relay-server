import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Relay sessions table - tracks active NFC relay sessions
 */
export const relaySessions = mysqlTable("relay_sessions", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: varchar("sessionId", { length: 128 }).notNull().unique(),
  readerConnected: boolean("readerConnected").default(false).notNull(),
  emulatorConnected: boolean("emulatorConnected").default(false).notNull(),
  relayActive: boolean("relayActive").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  lastActivity: timestamp("lastActivity").defaultNow().onUpdateNow().notNull(),
});

export type RelaySession = typeof relaySessions.$inferSelect;
export type InsertRelaySession = typeof relaySessions.$inferInsert;

/**
 * Communication logs table - stores APDU exchanges for debugging
 */
export const communicationLogs = mysqlTable("communication_logs", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: varchar("sessionId", { length: 128 }).notNull(),
  direction: mysqlEnum("direction", ["request", "response"]).notNull(),
  apduData: text("apduData").notNull(),
  clientType: mysqlEnum("clientType", ["reader", "emulator"]).notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export type CommunicationLog = typeof communicationLogs.$inferSelect;
export type InsertCommunicationLog = typeof communicationLogs.$inferInsert;
