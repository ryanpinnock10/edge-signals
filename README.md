# Edge Signals

A data-driven stock **screener + watchlist** web app. It ranks a curated 40-stock universe by a transparent composite score blending **Value**, **Growth/Momentum**, and **Analyst** signals, lets you build a personal watchlist, and fires threshold alerts (in-app + email) via an automated weekday refresh.

> **Not investment advice.** Edge Signals is an educational tool. Scores are mechanical rankings derived from market data, not recommendations. Past performance and analyst targets do not guarantee returns.

---

## Status

- **Built, tested, and shipped.** Frontend QA'd on desktop + mobile (Playwright); production build verified.
- **Live preview** deployed from `dist/public`.
- **Automated refresh** runs every US trading weekday after market close (~5:30pm ET): re-pulls quotes + analyst data, rebuilds rankings, evaluates alerts, and notifies on triggers.

## What it does

- **Dashboard** — universe KPIs, top picks, day gainers/losers, watchlist preview, weekly sparklines, and a header showing market status + data freshness (`asOf`).
- **Screener** — sortable/filterable table of all 40 stocks with every score dimension (Value, Momentum, Analyst, Upside, Composite). Search by symbol/name, filter by sector.
- **Stock detail** — slide-over with 6-month price trend, score breakdown, 52-week range, fundamentals, and the Wall Street analyst view. One-click add to watchlist.
- **Watchlist** — track stocks with live scores and ratings; persisted server-side.
- **Alerts** — create rules on `price`, `compositeScore`, `upsidePct`, or `changePct` (e.g. "NVDA price rises above $250", "AAPL composite score falls below 60"). Evaluated by the scheduled refresh; notifies in-app + email when triggered, with built-in de-duplication so the same condition doesn't re-fire within ~20 hours.

## How scoring works

Each stock gets a 0–100 score in three dimensions, combined into a Composite:

| Dimension | Weight | Inputs |
|-----------|--------|--------|
| **Value** | 0.75 × P/E score + 0.25 × dividend score | Low positive P/E favored; negative earnings penalized |
| **Momentum** | 0.6 × position in 52-wk range + 0.25 × day change + 0.15 × volume vs avg | Growth/trend signal |
| **Analyst** | 0.5 × target upside % + 0.3 × consensus rating + 0.2 × bullish % | Wall Street consensus |
| **Composite** | **0.35 × Value + 0.35 × Momentum + 0.30 × Analyst** | Final ranking |

Scoring logic lives in `pipeline/build_snapshot.py`. The output is `server/data/snapshot.json` — the single source of truth the app reads at runtime.

**Sample top picks** (snapshot of 2026-06-08): UNH 75.2 · QCOM 74.4 · KO 73.6 · JPM 72.3 · GOOGL 71.3. Rankings change every refresh.

---

## Architecture

```
Market data (finance tools)
        │  (offline / scheduled refresh)
        ▼
  build_snapshot.py  ──►  snapshot.json   ◄── app backend reads this file
        │                                       │
        │                     Express API ──────┤  GET /api/snapshot
        │                     SQLite (Drizzle) ─┤  watchlist + alerts CRUD
        │                                       ▼
        │                     React + Vite + Tailwind + shadcn/ui frontend
        ▼
  evaluate_alerts.py ──► reads snapshot.json + data.db → triggered alerts → notify
```

**Key design decision:** the deployed app does **not** call live market-data APIs at request time. Data is precomputed into `snapshot.json` by an offline pipeline (run manually or on a schedule). This keeps the app fast, deterministic, and decoupled from data-provider rate limits. The scheduled refresh task regenerates `snapshot.json` and evaluates alerts out-of-band.

### Stack

- **Frontend:** React 18, Vite, Tailwind CSS v3, shadcn/ui, wouter (hash routing), TanStack Query, Recharts. Dark mode by default.
- **Backend:** Express 5, Drizzle ORM, better-sqlite3 (synchronous driver).
- **Data pipeline:** Python, **standard library only** (no third-party packages) → `snapshot.json`.
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

The committed `snapshot.json` is a point-in-time snapshot. To regenerate it manually:

```bash
cd pipeline
python3 build_snapshot.py     # reads sample_data/, writes ../server/data/snapshot.json
```

To check alerts against the latest snapshot (reads `data.db`):

```bash
cd pipeline
python3 evaluate_alerts.py    # prints {asOf, triggered:[...], count}
```

See `pipeline/README.md` for input file formats and how to plug in fresh data. In the hosted setup, a scheduled weekday task automates the fetch → rebuild → evaluate → notify loop.

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
pipeline/
  build_snapshot.py   scoring pipeline → snapshot.json
  evaluate_alerts.py  alert evaluator (snapshot + data.db → triggers)
  sample_data/        quotes_batch{1,2}.csv, analyst.json, sparklines.json
  README.md           pipeline docs
script/build.ts        Build script (esbuild server + vite client + copy data)
```

See **HANDOFF.md** for the full developer/AI-agent handoff, **AGENTS.md** for agent conventions, and **SECURITY.md** / **SECURITY-AUDIT.md** for the security posture.

## License

MIT
