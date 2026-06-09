export interface Stock {
  symbol: string;
  name: string;
  sector: string;
  price: number | null;
  marketCap: number | null;
  pe: number | null;
  eps: number | null;
  changePct: number;
  yearLow: number | null;
  yearHigh: number | null;
  posInRange: number;
  dividendYield: number;
  volume: number;
  avgVolume: number;
  consensusRating: string | null;
  totalRatings: number | null;
  bullishPct: number | null;
  avgTarget: number | null;
  highTarget: number | null;
  lowTarget: number | null;
  upsidePct: number;
  valueScore: number;
  momentumScore: number;
  analystScore: number;
  compositeScore: number;
  rank: number;
  sparkline?: number[];
}

export interface Snapshot {
  generatedAt: string | null;
  marketStatus: string;
  asOf: string;
  universeSize: number;
  methodology: Record<string, string>;
  stocks: Stock[];
}

export interface WatchlistItem {
  id: number;
  symbol: string;
  note: string | null;
  addedAt: number;
  data: Stock | null;
}

export interface Alert {
  id: number;
  symbol: string;
  metric: "price" | "compositeScore" | "upsidePct" | "changePct";
  direction: "above" | "below";
  threshold: number;
  active: number;
  lastTriggeredAt: number | null;
  createdAt: number;
}

export function fmtPrice(v: number | null | undefined): string {
  if (v == null) return "—";
  return "$" + v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function fmtMarketCap(v: number | null | undefined): string {
  if (v == null) return "—";
  if (v >= 1e12) return "$" + (v / 1e12).toFixed(2) + "T";
  if (v >= 1e9) return "$" + (v / 1e9).toFixed(1) + "B";
  if (v >= 1e6) return "$" + (v / 1e6).toFixed(0) + "M";
  return "$" + v.toFixed(0);
}

export function fmtPct(v: number | null | undefined, withSign = false): string {
  if (v == null) return "—";
  const sign = withSign && v > 0 ? "+" : "";
  return sign + v.toFixed(2) + "%";
}

export function fmtNum(v: number | null | undefined): string {
  if (v == null) return "—";
  if (v >= 1e9) return (v / 1e9).toFixed(1) + "B";
  if (v >= 1e6) return (v / 1e6).toFixed(1) + "M";
  if (v >= 1e3) return (v / 1e3).toFixed(0) + "K";
  return v.toFixed(0);
}

export function ratingLabel(r: string | null | undefined): string {
  if (!r) return "—";
  return r.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

export function ratingTone(r: string | null | undefined): "buy" | "hold" | "sell" | "neutral" {
  if (!r) return "neutral";
  if (r.includes("strong_buy") || r === "buy" || r === "outperform" || r === "overweight") return "buy";
  if (r.includes("sell") || r === "underperform") return "sell";
  return "hold";
}

export function scoreTone(score: number): string {
  if (score >= 70) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 55) return "text-amber-600 dark:text-amber-400";
  return "text-muted-foreground";
}

export function changeTone(v: number): string {
  if (v > 0) return "text-emerald-600 dark:text-emerald-400";
  if (v < 0) return "text-rose-600 dark:text-rose-400";
  return "text-muted-foreground";
}

export function fmtMarketStatus(s: string | null | undefined): string {
  if (!s) return "";
  const map: Record<string, string> = {
    open: "Open",
    closed: "Closed",
    pre_market: "Pre-market",
    after_hours: "After-hours",
  };
  return map[s] ?? s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export const METRIC_LABELS: Record<string, string> = {
  price: "Price",
  compositeScore: "Composite Score",
  upsidePct: "Analyst Upside %",
  changePct: "Day Change %",
};
