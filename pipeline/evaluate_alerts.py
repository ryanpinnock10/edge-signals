#!/usr/bin/env python3
"""Evaluate active Edge Signals alert rules against the latest snapshot.

Reads:
  - ../server/data/snapshot.json   (freshly rebuilt rankings)
  - ../data.db                     (SQLite: alerts table)

For each ACTIVE alert whose condition is met, prints a JSON line and updates
its last_triggered_at. To avoid duplicate notifications, an alert is only
reported as "newly triggered" if it has not fired in the last 20 hours.

Output: a single JSON object to stdout:
  {"asOf": "...", "triggered": [ {alert+current value}, ... ], "count": N}

Standard library only.
"""
import json
import os
import sqlite3
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SNAPSHOT = os.path.join(ROOT, "server", "data", "snapshot.json")
DB = os.path.join(ROOT, "data.db")

# Re-suppress window: don't re-fire an alert within this many ms of its last fire.
RESUPPRESS_MS = 20 * 60 * 60 * 1000  # 20 hours

METRIC_FIELDS = {
    "price": "price",
    "compositeScore": "compositeScore",
    "upsidePct": "upsidePct",
    "changePct": "changePct",
}

METRIC_LABELS = {
    "price": "Price",
    "compositeScore": "Composite Score",
    "upsidePct": "Analyst Upside %",
    "changePct": "Day Change %",
}


def load_snapshot():
    with open(SNAPSHOT) as f:
        snap = json.load(f)
    by_sym = {s["symbol"]: s for s in snap.get("stocks", [])}
    return snap, by_sym


def main():
    snap, by_sym = load_snapshot()
    as_of = snap.get("asOf", "")

    if not os.path.exists(DB):
        print(json.dumps({"asOf": as_of, "triggered": [], "count": 0,
                          "note": "no data.db yet"}))
        return

    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    try:
        rows = conn.execute(
            "SELECT id, symbol, metric, direction, threshold, active, "
            "last_triggered_at FROM alerts WHERE active = 1"
        ).fetchall()
    except sqlite3.OperationalError:
        # alerts table may not exist if the app never created it
        print(json.dumps({"asOf": as_of, "triggered": [], "count": 0,
                          "note": "no alerts table"}))
        conn.close()
        return

    now_ms = int(time.time() * 1000)
    triggered = []

    for r in rows:
        stock = by_sym.get(r["symbol"])
        if not stock:
            continue
        field = METRIC_FIELDS.get(r["metric"])
        if not field:
            continue
        current = stock.get(field)
        if current is None:
            continue
        thr = r["threshold"]
        hit = (current > thr) if r["direction"] == "above" else (current < thr)
        if not hit:
            continue
        last = r["last_triggered_at"] or 0
        newly = (now_ms - last) >= RESUPPRESS_MS
        # Always update last_triggered_at when condition holds.
        conn.execute(
            "UPDATE alerts SET last_triggered_at = ? WHERE id = ?",
            (now_ms, r["id"]),
        )
        if newly:
            triggered.append({
                "id": r["id"],
                "symbol": r["symbol"],
                "name": stock.get("name", r["symbol"]),
                "metric": r["metric"],
                "metricLabel": METRIC_LABELS.get(r["metric"], r["metric"]),
                "direction": r["direction"],
                "threshold": thr,
                "current": current,
            })

    conn.commit()
    conn.close()

    print(json.dumps({"asOf": as_of, "triggered": triggered,
                      "count": len(triggered)}))


if __name__ == "__main__":
    main()
