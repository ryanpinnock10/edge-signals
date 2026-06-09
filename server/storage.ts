import { watchlist, alerts } from '@shared/schema';
import type { WatchlistItem, InsertWatchlistItem, Alert, InsertAlert } from '@shared/schema';
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq } from "drizzle-orm";

const sqlite = new Database("data.db");
sqlite.pragma("journal_mode = WAL");

// Ensure tables exist (lightweight migration on startup).
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS watchlist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol TEXT NOT NULL UNIQUE,
    note TEXT,
    added_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol TEXT NOT NULL,
    metric TEXT NOT NULL,
    direction TEXT NOT NULL,
    threshold REAL NOT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    last_triggered_at INTEGER,
    created_at INTEGER NOT NULL
  );
`);

export const db = drizzle(sqlite);

export interface IStorage {
  getWatchlist(): Promise<WatchlistItem[]>;
  addToWatchlist(item: InsertWatchlistItem): Promise<WatchlistItem>;
  removeFromWatchlist(symbol: string): Promise<{ changes: number }>;

  getAlerts(): Promise<Alert[]>;
  createAlert(alert: InsertAlert): Promise<Alert>;
  deleteAlert(id: number): Promise<{ changes: number }>;
  setAlertActive(id: number, active: boolean): Promise<Alert | undefined>;
}

export class DatabaseStorage implements IStorage {
  async getWatchlist(): Promise<WatchlistItem[]> {
    return db.select().from(watchlist).all();
  }

  async addToWatchlist(item: InsertWatchlistItem): Promise<WatchlistItem> {
    const existing = db.select().from(watchlist).where(eq(watchlist.symbol, item.symbol)).get();
    if (existing) return existing;
    return db.insert(watchlist).values({ ...item, addedAt: Date.now() }).returning().get();
  }

  async removeFromWatchlist(symbol: string): Promise<{ changes: number }> {
    return db.delete(watchlist).where(eq(watchlist.symbol, symbol)).run();
  }

  async getAlerts(): Promise<Alert[]> {
    return db.select().from(alerts).all();
  }

  async createAlert(alert: InsertAlert): Promise<Alert> {
    return db.insert(alerts).values({ ...alert, active: 1, createdAt: Date.now() }).returning().get();
  }

  async deleteAlert(id: number): Promise<{ changes: number }> {
    return db.delete(alerts).where(eq(alerts.id, id)).run();
  }

  async setAlertActive(id: number, active: boolean): Promise<Alert | undefined> {
    return db.update(alerts).set({ active: active ? 1 : 0 }).where(eq(alerts.id, id)).returning().get();
  }
}

export const storage = new DatabaseStorage();
