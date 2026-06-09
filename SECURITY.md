# Security

This document describes the security posture of Edge Signals and the hygiene practices the repo follows. Edge Signals is a low-sensitivity educational app (no PII, no auth, no payments today), but it's built to the same standards as production projects so it can graduate cleanly.

---

## Data sensitivity

- **No personal data.** The app stores only a shared watchlist of ticker symbols and alert rules. No user accounts, names, emails (other than the operator's notification address configured out-of-band), or financial-account data.
- **No payments / no auth** in the current scope. There are no credentials to leak in the request path.
- **Market data is public.** `snapshot.json` contains public market figures only.

## Secrets management

- **No secrets are committed.** There are no API keys, tokens, or passwords in the source tree. The data pipeline runs offline with provider credentials supplied by the environment — never written to disk in the repo.
- `.env` and `.env.*` are gitignored (with `.env.example` allowed for documentation).
- The notification email address and any pipeline provider credentials are injected at runtime by the host/scheduler, not stored in the repo.
- If you add a secret, put it in the environment and reference it via `process.env`. Never inline it. Add a placeholder to `.env.example`.

## Database

- SQLite (`data.db`) is **gitignored** (`data.db`, `data.db-shm`, `data.db-wal`, `data.db-journal`) so the database — including any locally entered watchlist/alert data — is never committed.
- Tables are created via `CREATE TABLE IF NOT EXISTS` on startup; no destructive migrations run automatically.
- All writes go through the Drizzle query builder (parameterized) — no string-concatenated SQL, so the app is not exposed to SQL injection through the API.

## Input validation

- Every mutating API route validates its request body with a Zod schema (`insertWatchlistSchema`, `insertAlertSchema`) derived from the shared Drizzle schema before it touches storage.
- Alert `metric` and `direction` are constrained to enums; thresholds are numeric.
- Symbols are normalized (uppercased) on input.

## Client-side

- No `localStorage`, `sessionStorage`, cookies, or `indexedDB` — partly an iframe constraint, but it also means no client-side data-at-rest to leak.
- All API calls go through a single typed client (`apiRequest`); no ad-hoc fetch with hand-built URLs.

## Dependency & code hygiene

Before each commit/release, run the standard scans:

```bash
npm audit --omit=dev            # dependency vulnerabilities
# Secret scanning (if installed):
gitleaks detect --no-banner     # committed-secret detection
# Static analysis (if installed):
semgrep --config auto .         # common insecure patterns
```

Treat high/critical `npm audit` findings as release blockers. Re-run after dependency bumps.

## Reporting

This is a personal/educational project. If you find a security issue, open a private issue or contact the repository owner directly rather than filing it publicly.

---

## Checklist before going multi-user / production

- [ ] Add authentication (Clerk) and scope watchlist/alerts per user.
- [ ] Move persistence to Supabase (Postgres) with row-level security.
- [ ] Add rate limiting on the API.
- [ ] Add CORS allow-list and security headers (helmet).
- [ ] Add audit logging for alert delivery.
- [ ] Wire `gitleaks` + `semgrep` + `npm audit` into CI as required checks.
