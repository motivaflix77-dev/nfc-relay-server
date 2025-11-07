import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, relaySessions, InsertRelaySession, RelaySession, communicationLogs, InsertCommunicationLog } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Relay session management functions

export async function createRelaySession(sessionId: string): Promise<RelaySession | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot create relay session: database not available");
    return null;
  }

  try {
    const values: InsertRelaySession = {
      sessionId,
      readerConnected: false,
      emulatorConnected: false,
      relayActive: false,
    };

    await db.insert(relaySessions).values(values);
    return await getRelaySession(sessionId);
  } catch (error) {
    console.error("[Database] Failed to create relay session:", error);
    return null;
  }
}

export async function getRelaySession(sessionId: string): Promise<RelaySession | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get relay session: database not available");
    return null;
  }

  const result = await db.select().from(relaySessions).where(eq(relaySessions.sessionId, sessionId)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function updateRelaySession(
  sessionId: string,
  updates: Partial<Omit<RelaySession, 'id' | 'sessionId' | 'createdAt' | 'lastActivity'>>
): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update relay session: database not available");
    return;
  }

  try {
    await db.update(relaySessions)
      .set(updates)
      .where(eq(relaySessions.sessionId, sessionId));
  } catch (error) {
    console.error("[Database] Failed to update relay session:", error);
  }
}

export async function logCommunication(log: InsertCommunicationLog): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot log communication: database not available");
    return;
  }

  try {
    await db.insert(communicationLogs).values(log);
  } catch (error) {
    console.error("[Database] Failed to log communication:", error);
  }
}

export async function getSessionLogs(sessionId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get session logs: database not available");
    return [];
  }

  return await db.select().from(communicationLogs).where(eq(communicationLogs.sessionId, sessionId));
}
