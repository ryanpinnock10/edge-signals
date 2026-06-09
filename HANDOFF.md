# Edge Signals — Engineering Handoff

This document is written so any developer — or an AI coding agent (Claude, Cursor, Codex) — can pick up this repo cold and be productive in minutes. It captures the mental model, the non-obvious decisions, the gotchas, and the "where do I change X" map.

---

## 1. Mental model in 60 seconds

Edge Signals is a **read-mostly app over a precomputed snapshot**.

- A **Python pipeline** (`pipeline/`) pulls market data, scores every stock, and writes one file: `server/data/snapshot.json`.
- The **Express backend** serves that file verbatim at `GET /api/snapshot` and owns two pieces of mutable state in SQLite: the **watchlist** and the **alerts**.
- The **React frontend** reads the snapshot once, joins it with the user's watchlist/alerts, and renders four pages.
- A **scheduled task** (run outside the app) periodically re-runs the pipeline and evaluates alert rules, sending notifications.

If you internalize "the app never calls a live market API at request time," most of the architecture follows.

---

## 2. Why the snapshot pattern (the most important decision)

The hosted/deployed runtime cannot call the market-data tools that produced the rankings. So instead of fetching live data per request, we **precompute** everything into `snapshot.json` and ship it with the build.

Benefits: deterministic UI, no per-request latency, no rate-limit coupling, trivially cacheable, and the exact dataset is reproducible and reviewable in git history (well — the file is committed; `data.db` is not).

Consequence: **data freshness == last pipeline run.** The `asOf` field in the snapshot is surfaced in the UI header so users always know the data vintage.

---

## 3. Data model (`shared/schema.ts`)

Two tables, both SQLite via Drizzle:

- **`watchlist`** — `id`, `symbol` (unique), `note`, `addedAt`.
- **`alerts`** — `id`, `symbol`, `metric` (`price | compositeScore | upsidePct | changePct`), `direction` (`above | below`), `threshold`, `active`, `lastTriggeredAt`, `createdAt`.

Insert schemas (`insertWatchlistSchema`, `insertAlertSchema`) are derived with `drizzle-zod` and used to validate request bodies. The metric/direction enums are the contract between the alert UI, the API, and the scheduled evaluator — change them in one place.

> **Driver note:** better-sqlite3 is **synchronous**. Always terminate queries with `.get()` (single row), `.all()` (list), or `.run()` (write). Do **not** `await` them and do **not** destructure the builder.

---

## 4. Backend (`server/`)

- `routes.ts` — all API routes. Thin; delegates to `storage.ts`.
  - `GET /api/snapshot` — loads `snapshot.json`. `loadSnapshot()` checks several paths (`dist/data`, `server/data`, cwd) so it works in dev and in the bundled build.
  - `GET/POST/DELETE /api/watchlist[/:symbol]` — watchlist CRUD. Responses are **enriched**: each item carries a `data` field with the full snapshot row for that symbol, so the frontend doesn't re-join.
  - `GET/POST /api/alerts`, `DELETE/PATCH /api/alerts/:id` — alert CRUD + toggle.
  - Symbols are uppercased on the way in.
- `storage.ts` — `DatabaseStorage` implements `IStorage`. **Runs `CREATE TABLE IF NOT EXISTS` migrations on startup** — there is no separate migration step for the two app tables. The DB file is `data.db` in the project root (gitignored).
- `index.ts` / `vite.ts` / `static.ts` — template bootstrap. Leave alone unless you know why.

### Gotcha: `__dirname` in the CJS bundle

The build emits CommonJS (`dist/index.cjs`). `import.meta.url` is empty there, so path resolution uses the CJS `__dirname` global with a cwd fallback (`baseDir` in `routes.ts`). If you add code that resolves files relative to the module, reuse `baseDir` — don't reach for `import.meta.url`.

---

## 5. Frontend (`client/src/`)

- `lib/stocks.ts` — the shared vocabulary: `Stock`, `Snapshot`, `WatchlistItem`, `Alert` interfaces, all the formatters (`fmtPrice`, `fmtMarketCap`, `fmtPct`, `ratingLabel`, `scoreTone`, …), and `METRIC_LABELS`. Start here when you need to understand the data shape.
- `components/Layout.tsx` — `ThemeProvider`/`useTheme` (dark by default; **no localStorage** — the sandboxed iframe blocks it, so theme is session state only), sidebar nav, mobile menu, the "Edge Signals" inline SVG logo, `PageHeader`.
- `components/StockSheet.tsx` — the detail slide-over (Recharts line chart, score breakdown, 52-wk range, analyst targets, add/remove watchlist mutations).
- `components/ScoreBar.tsx`, `MiniSpark.tsx` — score bars and table/card sparklines.
- `pages/` — `Dashboard`, `Screener`, `Watchlist`, `Alerts`.
- `App.tsx` — routes wrapped in `ThemeProvider` + `Layout` + **`<Router hook={useHashLocation}>`** (hash routing is mandatory — the app is served inside an iframe where path routing breaks).

### Frontend rules that bite if ignored

- Hash routing only. Use `<Link href="/screener">`; never anchor `#section` links.
- All HTTP via `apiRequest` from `lib/queryClient` (it handles the deploy-time port rewrite). Never raw `fetch()` in queries/mutations.
- No `localStorage`/`sessionStorage`/cookies anywhere — they crash the iframe.
- Invalidate the relevant `queryKey` after every mutation.

---

## 6. Data pipeline (`pipeline/`)

Produces `server/data/snapshot.json`. Steps: pull quotes + company ratios + analyst research + price history for the 40-symbol universe → compute Value/Momentum/Analyst/Composite scores → attach a 27-point weekly sparkline per ticker → write JSON with an `asOf` timestamp. See `pipeline/README.md` for the run procedure and the scoring formula.

The universe (40 large-cap US names) and the scoring weights are the two knobs you'll most likely tune.

---

## 7. Build & run

```bash
npm install
npm run dev      # dev: tsx server/index.ts + Vite, one port
npm run build    # esbuild server → dist/index.cjs, vite → dist/public, copies server/data → dist/data
npm run check    # tsc typecheck
```

Production: `NODE_ENV=production PORT=5000 node dist/index.cjs`.

### Sandbox gotchas (when testing in an agent environment)

- Background `&` processes can die; use a managed server runner or `timeout N bash -c '... & sleep 4; curl ...'`.
- Delete `data.db data.db-wal data.db-shm` before a clean rebuild test to avoid stale-schema surprises.

---

## 8. Scheduled refresh + alerts

The hosted setup runs a recurring task that:

1. Re-fetches market data for the universe.
2. Re-runs scoring and rewrites `snapshot.json`.
3. Reads active alert rules, evaluates each against the fresh data, and updates `lastTriggeredAt`.
4. Sends an in-app + email notification for any alert that crossed its threshold (plain-text values — the notification surface does not render claim links).

If you change the alert `metric` enum, update the evaluator's metric→value mapping to match.

---

## 9. "Where do I change X?"

| I want to… | Edit |
|------------|------|
| Add/remove stocks in the universe | `pipeline/build_snapshot.py` (universe list), then re-run pipeline |
| Change scoring weights | `pipeline/build_snapshot.py` |
| Add a new alert metric | `shared/schema.ts` (enum) → `pages/Alerts.tsx` (UI) → scheduled evaluator |
| Change an API route | `server/routes.ts` (+ `server/storage.ts` for new queries) |
| Restyle / re-theme | `client/src/index.css` (HSL tokens) + `tailwind.config.ts` |
| Add a page | `client/src/pages/` + register in `App.tsx` |
| Fix data freshness display | `asOf` field in snapshot → `PageHeader`/Dashboard |

---

## 10. Known limitations / next steps

- Single shared watchlist/alerts (no auth/multi-user). Clerk + Supabase are the natural next step if multi-user is needed.
- 40-stock fixed universe; no dynamic ticker add.
- Snapshot freshness depends on the scheduled task running.
- No historical score tracking (only current snapshot). A time-series table would enable score-trend charts.
