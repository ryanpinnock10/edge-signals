import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Watchlist: stocks the user is tracking
export const watchlist = sqliteTable("watchlist", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  symbol: text("symbol").notNull().unique(),
  note: text("note"),
  addedAt: integer("added_at").notNull(),
});

export const insertWatchlistSchema = createInsertSchema(watchlist)
  .omit({ id: true, addedAt: true });

export type InsertWatchlistItem = z.infer<typeof insertWatchlistSchema>;
export type WatchlistItem = typeof watchlist.$inferSelect;

// Alert rules: fire when a metric crosses a threshold
// metric: "price" | "compositeScore" | "upsidePct" | "changePct"
// direction: "above" | "below"
export const alerts = sqliteTable("alerts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  symbol: text("symbol").notNull(),
  metric: text("metric").notNull(),
  direction: text("direction").notNull(),
  threshold: real("threshold").notNull(),
  active: integer("active").notNull().default(1),
  lastTriggeredAt: integer("last_triggered_at"),
  createdAt: integer("created_at").notNull(),
});

export const insertAlertSchema = createInsertSchema(alerts)
  .omit({ id: true, active: true, lastTriggeredAt: true, createdAt: true })
  .extend({
    metric: z.enum(["price", "compositeScore", "upsidePct", "changePct"]),
    direction: z.enum(["above", "below"]),
    threshold: z.number(),
  });

export type InsertAlert = z.infer<typeof insertAlertSchema>;
export type Alert = typeof alerts.$inferSelect;
