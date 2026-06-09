# Data Pipeline

This directory contains the offline pipeline that produces `../server/data/snapshot.json` — the single runtime data source the app reads.

## Why it's offline

The deployed app does not call live market-data APIs at request time. All rankings are precomputed here and shipped as a JSON file. This keeps the app fast, deterministic, and decoupled from data-provider rate limits. See the root `HANDOFF.md` (§2) for the rationale.

## Run it

```bash
cd pipeline
python build_snapshot.py
```

This reads the inputs in `sample_data/`, scores all 40 stocks, attaches sparklines, ranks by composite score, and writes `../server/data/snapshot.json`. It prints the top 10 for a sanity check.

No third-party Python packages are required (standard library only).

## Inputs (`sample_data/`)

| File | Contents |
|------|----------|
| `quotes_batch1.csv`, `quotes_batch2.csv` | Per-symbol quote fields: price, P/E, EPS, day change %, 52-wk low/high, dividend yield, market cap, volume, avg volume, market status, timestamp |
| `analyst.json` | Per-symbol analyst consensus: avg/high/low price target, consensus rating, total ratings, bullish % |
| `sparklines.json` | `{ symbol: [weekly closes...] }` — optional; powers the trend charts. Omit and charts simply render empty |

## Refreshing with current data

1. Pull fresh quotes, company ratios, analyst research, and ~6-month weekly price history for the universe from your market-data source.
2. Write them into `sample_data/` in the same shapes as the existing files (CSV headers and JSON keys must match what `build_snapshot.py` reads).
3. Re-run `python build_snapshot.py`.
4. Rebuild/redeploy the app (the build copies `server/data` into `dist/data`).

In the hosted setup, a scheduled task automates steps 1–3 and then evaluates alert rules against the fresh snapshot.

## Scoring

Each stock gets three 0–100 sub-scores combined into a Composite:

- **Value** = 0.75 × P/E score + 0.25 × dividend score
- **Momentum** = 0.6 × position-in-52wk-range + 0.25 × day change + 0.15 × volume vs avg
- **Analyst** = 0.5 × target upside % + 0.3 × consensus rating + 0.2 × bullish %
- **Composite** = 0.35 × Value + 0.35 × Momentum + 0.30 × Analyst

The exact constants live at the top of `score_stock()` in `build_snapshot.py`. Tune there.

## Editing the universe

Edit the `SECTORS` dict in `build_snapshot.py` (it doubles as the universe list and the symbol→sector map), then supply matching rows in the input files and re-run.
