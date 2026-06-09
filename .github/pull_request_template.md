# Summary

<!-- What does this change and why? -->

## Checklist

- [ ] `npm run check` passes (typecheck)
- [ ] `npm run build` succeeds and `dist/data/snapshot.json` is present
- [ ] If the data contract changed, I updated `shared/schema.ts` first
- [ ] If scoring/pipeline changed, I re-ran `python3 pipeline/build_snapshot.py` and reviewed the new rankings
- [ ] No live market-data calls were added to the request path (app reads `snapshot.json` only — see AGENTS.md)
- [ ] No secrets, `.env` files, or `data.db` committed (see SECURITY.md)

## Notes

<!-- Anything reviewers should know: trade-offs, follow-ups, screenshots. -->
