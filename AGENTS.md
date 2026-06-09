# AGENTS.md

Guidance for AI coding agents (Claude Code, Cursor, Codex, etc.) working in this repo. Read this first, then `HANDOFF.md` for the deep dive.

## The one thing to remember

This app reads a **precomputed `snapshot.json`** — it never calls a live market API at request time. The Python pipeline in `pipeline/` produces that file. Don't add live data-fetching to the request path.

## Project shape

- `client/src/` — React + Vite + Tailwind + shadcn/ui frontend (4 pages: Dashboard, Screener, Watchlist, Alerts).
- `server/` — Express API + Drizzle/SQLite. `routes.ts` (API), `storage.ts` (DB + migrations), `data/snapshot.json` (runtime data).
- `shared/schema.ts` — Drizzle tables + Zod schemas. The data contract; change types here first.
- `pipeline/` — Python scoring pipeline → `server/data/snapshot.json`.

## Commands

```bash
npm install
npm run dev      # dev server (Express + Vite, one port)
npm run build    # production bundle → dist/
npm run check    # tsc typecheck — run before declaring done
python pipeline/build_snapshot.py   # regenerate snapshot.json
```

## Hard rules (these break the app if violated)

1. **Hash routing only.** Routes are wrapped in `<Router hook={useHashLocation}>`. Use `<Link href="/x">`. Never use `<a href="#section">` for in-page scroll.
2. **No `localStorage` / `sessionStorage` / cookies / `indexedDB`.** The app runs in a sandboxed iframe that blocks them. Use React state or the backend.
3. **All HTTP via `apiRequest`** from `client/src/lib/queryClient.ts` — never raw `fetch()` in queries/mutations (it handles the deploy-time port rewrite).
4. **better-sqlite3 is synchronous.** Terminate Drizzle queries with `.get()` / `.all()` / `.run()`. Don't `await` or destructure them.
5. **CJS bundle has no `import.meta.url`.** Resolve file paths via the `baseDir` helper in `routes.ts`, not `import.meta.url`.
6. **Invalidate the matching `queryKey`** after every mutation.
7. **Max heading size `text-xl`** (this is a dashboard app, not a marketing site).

## Conventions

- Add `data-testid` to interactive and meaningful display elements.
- Validate every mutating request body with the Zod insert schema from `shared/schema.ts`.
- Keep routes thin; put logic in `storage.ts`.
- Colors are HSL tokens in `client/src/index.css` (`:root` + `.dark`). Don't hardcode hex.

## Before you finish

- Run `npm run check` (typecheck) and `npm run build` (must succeed).
- If you touched data shapes, regenerate `snapshot.json` and verify the UI still renders.
- Don't commit `data.db*` or `.env` (already gitignored). Don't commit secrets — see `SECURITY.md`.
