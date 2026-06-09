# Security Audit Log

A running log of security hygiene checks performed on this repo. See `SECURITY.md` for the overall posture.

---

## 2026-06-09 — Pre-initial-commit audit

**Scope:** full source tree (excluding `node_modules/`, `dist/`, `data.db*`).

| Check | Result |
|-------|--------|
| Secret scan (api keys, tokens, passwords, private keys, `sk_live`/`sk_test`, PEM blocks) | ✅ Pass — no secrets found. Only match was the string `"jsonwebtoken"` in `script/build.ts` (an esbuild externals package name, not a secret). |
| `npm audit --omit=dev` | ✅ **0 vulnerabilities** |
| `.gitignore` coverage | ✅ `data.db`, `data.db-shm`, `data.db-wal`, `data.db-journal`, `.env`, `.env.*`, `node_modules/`, `dist/`, `*.log` all excluded |
| Secrets in `.env.example` | ✅ Placeholders only, no real values |
| SQL injection surface | ✅ All DB access via parameterized Drizzle query builder |
| Request-body validation | ✅ Zod schemas on all mutating routes |
| Client-side data-at-rest | ✅ No `localStorage`/`sessionStorage`/cookies |

**Notes:** `gitleaks` and `semgrep` were not installed in the audit environment; an equivalent manual regex secret scan was performed instead. When CI is set up, wire `gitleaks detect` + `semgrep --config auto` + `npm audit` as required checks (see `SECURITY.md` checklist).

**Verdict:** Safe to commit and push.
