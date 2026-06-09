# Edge Signals

A data-driven stock screener and watchlist web app. It ranks a curated 40-stock universe by a transparent composite score blending **Value**, **Growth/Momentum**, and **Analyst** signals, lets you build a personal watchlist, and fires threshold alerts (in-app + email) via a scheduled refresh task.

> **Not investment advice.** Edge Signals is an educational tool. Scores are mechanical rankings derived from market data, not recommendations. Past performance and analyst targets do not guarantee returns.

---

## What it does

- **Dashboard** — universe KPIs, top picks, day gainers/losers, watchlist preview, weekly sparklines.
- **Screener** — sortable/filterable table of all 40 stocks with every score dimension (Value, Momentum, Analyst, Upside, Composite). Search by symbol/name, filter by sector.
- **Stock detail** — slide-over with 6-month price trend, score breakdown, 52-week range, fundamentals, and the Wall Street analyst view. One-click add to watchlist.
- **Watchlist** — track stocks with live scores and ratings; persisted server-side.
- **Alerts** — create rules (e.g. "NVDA price rises above $250", "AAPL composite score falls below 60"). Evaluated by the scheduled refresh task; notifies in-app + email when triggered.

## How scoring works

Each stock gets a 0–100 score in three dimensions, combined into a Composite:

| Dimension | Weight | Inputs |
|-----------|--------|--------|
| **Value** | 0.75 × P/E score + 0.25 × dividend score | Low positive P/E favored; negative earnings penalized |
| **Momentum** | 0.6 × position in 52-wk range + 0.25 × day change + 0.15 × volume vs avg | Growth/trend signal |
| **Analyst** | 0.5 × target upside % + 0.3 × consensus rating + 0.2 × bullish % | Wall Street consensus |
| **Composite** | **0.35 × Value + 0.35 × Momentum + 0.30 × Analyst** | Final ranking |

Scoring logic lives in `pipeline/build_snapshot.py`. The output is `server/data/snapshot.json` — the single source of truth the app reads at runtime.

---

## Architecture

```
Market data (finance tools)
        │  (offline / scheduled refresh)
        ▼
  build_snapshot.py  ──►  snapshot.json   ◄── app backend reads this file
                                              │
                          Express API ────────┤  GET /api/snapshot
                          SQLite (Drizzle) ───┤  watchlist + alerts CRUD
                                              ▼
                          React + Vite + Tailwind + shadcn/ui frontend
```

**Key design decision:** the deployed app does **not** call live market-data APIs at request time. Data is precomputed into `snapshot.json` by an offline pipeline (run manually or on a schedule). This keeps the app fast, deterministic, and decoupled from data-provider rate limits. The scheduled refresh task regenerates `snapshot.json` and evaluates alerts.

### Stack

- **Frontend:** React 18, Vite, Tailwind CSS v3, shadcn/ui, wouter (hash routing), TanStack Query, Recharts.
- **Backend:** Express 5, Drizzle ORM, better-sqlite3 (synchronous driver).
- **Data pipeline:** Python (pandas) → `snapshot.json`.
- **Persistence:** SQLite (`data.db`, gitignored — created on first run).

---

## Quick start

```bash
npm install
npm run dev          # dev server (Express + Vite on one port)
```

Production build & run:

```bash
npm run build        # bundles client → dist/public, server → dist/index.cjs, copies snapshot.json
NODE_ENV=production PORT=5000 node dist/index.cjs
```

Open http://localhost:5000.

## Refreshing market data

The committed `snapshot.json` is a point-in-time snapshot. To regenerate it with fresh data, re-run the pipeline (see `pipeline/README.md`). In the hosted setup this is automated by a scheduled task that re-fetches quotes/ratios/analyst data, re-runs scoring, rewrites `snapshot.json`, and fires any triggered alerts.

---

## Project layout

```
client/src/
  pages/        Dashboard, Screener, Watchlist, Alerts, not-found
  components/   Layout, StockSheet, ScoreBar, MiniSpark, ui/ (shadcn)
  lib/          stocks.ts (types + formatters), queryClient, utils
server/
  index.ts      Express bootstrap (do not edit lightly)
  routes.ts     API routes: /api/snapshot, /api/watchlist, /api/alerts
  storage.ts    Drizzle DatabaseStorage + table migrations
  data/         snapshot.json (runtime data source)
shared/
  schema.ts     Drizzle tables + Zod insert schemas (watchlist, alerts)
pipeline/       Python data pipeline that produces snapshot.json
script/build.ts Build script (esbuild server + vite client + copy data)
```

See **HANDOFF.md** for the full developer/AI-agent handoff and **SECURITY.md** for the security posture.

## License

MIT
