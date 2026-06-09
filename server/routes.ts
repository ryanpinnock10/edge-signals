import type { Express } from "express";
import { createServer } from 'node:http';
import type { Server } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { storage } from "./storage";
import { insertWatchlistSchema, insertAlertSchema } from "@shared/schema";

// __dirname is provided as a CJS global in the esbuild bundle (dist/), and via
// tsx in dev. Fall back to cwd-based paths so the snapshot resolves either way.
const baseDir = typeof __dirname !== "undefined" ? __dirname : process.cwd();

function loadSnapshot(): any {
  // Look in a few candidate locations (dev vs built)
  const candidates = [
    join(baseDir, "data", "snapshot.json"),
    join(process.cwd(), "dist", "data", "snapshot.json"),
    join(process.cwd(), "server", "data", "snapshot.json"),
    join(process.cwd(), "data", "snapshot.json"),
  ];
  for (const p of candidates) {
    if (existsSync(p)) {
      return JSON.parse(readFileSync(p, "utf-8"));
    }
  }
  return { generatedAt: null, stocks: [], universeSize: 0, error: "snapshot not found" };
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Market snapshot (screener data)
  app.get("/api/snapshot", async (_req, res) => {
    res.json(loadSnapshot());
  });

  // Watchlist
  app.get("/api/watchlist", async (_req, res) => {
    const items = await storage.getWatchlist();
    const snap = loadSnapshot();
    const bySymbol = new Map<string, any>(snap.stocks.map((s: any) => [s.symbol, s]));
    // join watchlist items with current snapshot data
    const enriched = items.map((it) => ({ ...it, data: bySymbol.get(it.symbol) || null }));
    res.json(enriched);
  });

  app.post("/api/watchlist", async (req, res) => {
    const parsed = insertWatchlistSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    const item = await storage.addToWatchlist({
      ...parsed.data,
      symbol: parsed.data.symbol.toUpperCase(),
    });
    res.json(item);
  });

  app.delete("/api/watchlist/:symbol", async (req, res) => {
    const result = await storage.removeFromWatchlist(req.params.symbol.toUpperCase());
    res.json(result);
  });

  // Alerts
  app.get("/api/alerts", async (_req, res) => {
    res.json(await storage.getAlerts());
  });

  app.post("/api/alerts", async (req, res) => {
    const parsed = insertAlertSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    const alert = await storage.createAlert({
      ...parsed.data,
      symbol: parsed.data.symbol.toUpperCase(),
    });
    res.json(alert);
  });

  app.delete("/api/alerts/:id", async (req, res) => {
    const result = await storage.deleteAlert(Number(req.params.id));
    res.json(result);
  });

  app.patch("/api/alerts/:id", async (req, res) => {
    const active = Boolean(req.body?.active);
    const alert = await storage.setAlertActive(Number(req.params.id), active);
    res.json(alert);
  });

  return httpServer;
}
