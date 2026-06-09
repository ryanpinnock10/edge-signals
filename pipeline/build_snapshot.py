#!/usr/bin/env python3
"""Build server/data/snapshot.json from market data inputs.

This is the single offline pipeline that produces the app's runtime data source.
It reads quote + analyst inputs, computes the Value / Momentum / Analyst /
Composite scores for every stock in the universe, optionally attaches weekly
price sparklines, and writes snapshot.json.

Scoring pillars (each 0-100):
  - Value:    rewards low (positive) P/E and dividend yield. Negative/no P/E => penalized.
  - Momentum: rewards position in 52-week range, recent day change, and volume.
  - Analyst:  rewards target upside %, consensus rating, and bullish %.

  Composite = 0.35*Value + 0.35*Momentum + 0.30*Analyst   (Growth/Momentum + Value balance)

Inputs (see DATA_DIR):
  - quotes_batch*.csv : per-symbol quote fields (price, pe, eps, 52wk range, volume, etc.)
  - analyst.json      : per-symbol analyst consensus (targets, rating, bullish %)
  - sparklines.json   : OPTIONAL {symbol: [weekly closes...]} to render trend charts

Output:
  - ../server/data/snapshot.json

Refreshing data: replace the files in sample_data/ (or point DATA_DIR at fresh
exports) with current market data, then re-run this script. In the hosted setup
a scheduled task fetches fresh data, regenerates this file, and evaluates alerts.

Usage:
  python build_snapshot.py
"""
import csv
import json
import os
import datetime

HERE = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(HERE, "sample_data")
OUT_PATH = os.path.normpath(os.path.join(HERE, "..", "server", "data", "snapshot.json"))

# 40-stock large-cap US universe, mapped to a display sector.
SECTORS = {
    "AAPL": "Technology", "MSFT": "Technology", "GOOGL": "Technology", "AMZN": "Consumer Disc.",
    "META": "Technology", "NVDA": "Semiconductors", "TSLA": "Consumer Disc.", "AVGO": "Semiconductors",
    "AMD": "Semiconductors", "NFLX": "Communication", "CRM": "Technology", "ORCL": "Technology",
    "ADBE": "Technology", "UBER": "Technology", "SHOP": "Technology", "PLTR": "Technology",
    "COST": "Consumer Staples", "JPM": "Financials", "V": "Financials", "MA": "Financials",
    "LLY": "Healthcare", "UNH": "Healthcare", "JNJ": "Healthcare", "WMT": "Consumer Staples",
    "HD": "Consumer Disc.", "PG": "Consumer Staples", "XOM": "Energy", "CVX": "Energy",
    "KO": "Consumer Staples", "PEP": "Consumer Staples", "DIS": "Communication", "BA": "Industrials",
    "CAT": "Industrials", "GE": "Industrials", "MRVL": "Semiconductors", "SMCI": "Technology",
    "MU": "Semiconductors", "INTC": "Semiconductors", "QCOM": "Semiconductors", "TXN": "Semiconductors",
}

RATING_SCORE = {"strong_buy": 100, "buy": 75, "outperform": 75, "overweight": 75, "hold": 50,
                "neutral": 50, "market_perform": 50, "underperform": 25, "sell": 0, "strong_sell": 0}


def fnum(x):
    try:
        return float(x)
    except (TypeError, ValueError):
        return None


def clamp(v, lo=0, hi=100):
    return max(lo, min(hi, v))


def load_quotes():
    rows = []
    for fn in sorted(os.listdir(DATA_DIR)):
        if fn.startswith("quotes_batch") and fn.endswith(".csv"):
            with open(os.path.join(DATA_DIR, fn)) as f:
                rows.extend(list(csv.DictReader(f)))
    return rows


def load_analyst():
    with open(os.path.join(DATA_DIR, "analyst.json")) as f:
        return json.load(f)


def load_sparklines():
    path = os.path.join(DATA_DIR, "sparklines.json")
    if os.path.exists(path):
        with open(path) as f:
            return json.load(f)
    return {}


def score_stock(r, analyst):
    sym = r["symbol"]
    price = fnum(r["price"])
    pe = fnum(r["pe"])
    eps = fnum(r["eps"])
    chg = fnum(r["changesPercentage"]) or 0.0
    ylow = fnum(r["yearLow"])
    yhigh = fnum(r["yearHigh"])
    divy = fnum(r["dividendYieldTTM"]) or 0.0
    mktcap = fnum(r["marketCap"])
    vol = fnum(r["volume"]) or 0.0
    avgvol = fnum(r["avgVolume"]) or 0.0
    a = analyst.get(sym, {})
    avg_tgt = fnum(a.get("avg_price_target"))

    # ---- Value score ----
    if pe is not None and pe > 0:
        pe_score = clamp(100 - (pe - 10) * 1.8)   # 10 P/E -> ~90, 40 P/E -> ~40
    else:
        pe_score = 15                             # negative earnings penalized
    div_score = clamp(divy * 100 * 18)            # 3% yield -> ~54
    value_score = clamp(0.75 * pe_score + 0.25 * div_score)

    # ---- Momentum score ----
    if ylow is not None and yhigh is not None and yhigh > ylow:
        pos_in_range = (price - ylow) / (yhigh - ylow) * 100
    else:
        pos_in_range = 50
    day_score = clamp(50 + chg * 8)               # +3% day -> 74
    vol_ratio = (vol / avgvol) if avgvol else 1.0
    vol_score = clamp(50 + (vol_ratio - 1) * 40)
    momentum_score = clamp(0.6 * pos_in_range + 0.25 * day_score + 0.15 * vol_score)

    # ---- Analyst score ----
    upside_pct = (avg_tgt - price) / price * 100 if (avg_tgt is not None and price) else 0.0
    upside_score = clamp(50 + upside_pct * 2.2)   # +20% upside -> 94
    rating_score = RATING_SCORE.get(a.get("consensus_rating", ""), 50)
    bullish = fnum(a.get("bullish_pct")) or 50
    analyst_score = clamp(0.5 * upside_score + 0.3 * rating_score + 0.2 * bullish)

    composite = round(0.35 * value_score + 0.35 * momentum_score + 0.30 * analyst_score, 1)

    return {
        "symbol": sym,
        "name": r["name"],
        "sector": SECTORS.get(sym, "Other"),
        "price": round(price, 2) if price else None,
        "marketCap": mktcap,
        "pe": round(pe, 2) if pe is not None else None,
        "eps": eps,
        "changePct": round(chg, 2),
        "yearLow": ylow,
        "yearHigh": yhigh,
        "posInRange": round(pos_in_range, 1),
        "dividendYield": round(divy * 100, 2),
        "volume": vol,
        "avgVolume": avgvol,
        "consensusRating": a.get("consensus_rating"),
        "totalRatings": a.get("total_ratings"),
        "bullishPct": a.get("bullish_pct"),
        "avgTarget": avg_tgt,
        "highTarget": a.get("high_price_target"),
        "lowTarget": a.get("low_price_target"),
        "upsidePct": round(upside_pct, 1),
        "valueScore": round(value_score, 1),
        "momentumScore": round(momentum_score, 1),
        "analystScore": round(analyst_score, 1),
        "compositeScore": composite,
    }


def main():
    rows = load_quotes()
    analyst = load_analyst()
    sparklines = load_sparklines()

    stocks = [score_stock(r, analyst) for r in rows]

    # Attach sparklines (weekly closes) when available.
    for s in stocks:
        s["sparkline"] = [round(c, 2) for c in sparklines.get(s["symbol"], [])]

    # Rank by composite.
    stocks.sort(key=lambda s: s["compositeScore"], reverse=True)
    for i, s in enumerate(stocks, 1):
        s["rank"] = i

    snapshot = {
        "generatedAt": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "marketStatus": rows[0].get("market_status"),
        "asOf": rows[0].get("timestamp"),
        "universeSize": len(stocks),
        "methodology": {
            "value": "0.75*P/E score + 0.25*dividend score. Low positive P/E and dividend yield favored; negative earnings penalized.",
            "momentum": "0.6*position in 52-week range + 0.25*day change + 0.15*volume vs avg.",
            "analyst": "0.5*target upside + 0.3*consensus rating + 0.2*bullish %.",
            "composite": "0.35*Value + 0.35*Momentum + 0.30*Analyst.",
        },
        "stocks": stocks,
    }

    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    with open(OUT_PATH, "w") as f:
        json.dump(snapshot, f, indent=2)

    print(f"Wrote {OUT_PATH} with {len(stocks)} stocks")
    n_spark = sum(1 for s in stocks if s["sparkline"])
    print(f"Sparklines attached: {n_spark}/{len(stocks)}")
    print("\nTop 10 by composite:")
    for s in stocks[:10]:
        print(f"  {s['rank']:2d}. {s['symbol']:5s} {s['compositeScore']:5.1f}  "
              f"V{s['valueScore']:4.0f} M{s['momentumScore']:4.0f} A{s['analystScore']:4.0f}  "
              f"upside {s['upsidePct']:+.0f}%  {s['sector']}")


if __name__ == "__main__":
    main()
