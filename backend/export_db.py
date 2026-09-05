"""Export the live SQLite database into a compact static JSON snapshot.

The snapshot is written to frontend/public/data/meenatracker.json so the
dashboard can run fully static (GitHub Pages) with zero backend. Price
history is deduplicated (consecutive same-price points collapsed) and
capped to the most recent `MAX_POINTS` per product to keep the file lean.
"""
import json
import os
import sqlite3
from collections import defaultdict
from datetime import datetime, timezone

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "meenatracker.db")
OUT_PATH = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "..", "frontend", "public", "data", "meenatracker.json",
)

MAX_POINTS = 365
HISTORY_CAP_DAYS = 400


def epoch_ms(iso: str) -> int:
    try:
        dt = datetime.fromisoformat(iso)
    except ValueError:
        dt = datetime.strptime(iso, "%Y-%m-%d %H:%M:%S.%f")
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return int(dt.timestamp() * 1000)


def daily_aggregate_and_cap(points, max_points=MAX_POINTS):
    """points: list of (ts_ms, unit_price, actual_price, day_str).

    Preserves DAILY price history so no in-between dates are discarded.
    For days with multiple scrapes, keeps the latest scrape of that day.
    Consecutive days with identical prices are FULLY PRESERVED so the
    user sees an unbroken, continuous daily price history.
    """
    if not points:
        return []
    by_day = {}
    for ts, unit, actual, day in points:
        by_day[day] = [ts, round(unit, 2), round(actual, 2)]

    out = [by_day[d] for d in sorted(by_day.keys())]
    if len(out) > max_points:
        out = out[-max_points:]
    return out


def main():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    categories = [
        {
            "id": r[0],
            "name": r[1],
            "url": r[2],
            "is_custom": bool(r[3]),
        }
        for r in cur.execute(
            "SELECT id, name, url, is_custom FROM categories ORDER BY id"
        ).fetchall()
    ]

    cat_counts = dict(
        cur.execute(
            "SELECT category_id, COUNT(*) FROM products GROUP BY category_id"
        ).fetchall()
    )

    products = []
    for r in cur.execute(
        "SELECT id, external_id, name, unit, unit_type, image_url, category_id, "
        "is_favorite FROM products ORDER BY id"
    ).fetchall():
        pid, external_id, name, unit, unit_type, image_url, category_id, is_fav = r
        products.append(
            {
                "id": pid,
                "category_id": category_id,
                "name": name,
                "unit": unit,
                "unit_type": unit_type,
                "image_url": image_url,
                "is_favorite": bool(is_fav),
            }
        )

    # history grouped per product, ordered by time
    history = defaultdict(list)
    for pid, ts, unit, actual in cur.execute(
        "SELECT product_id, scraped_at, unit_price, actual_price "
        "FROM price_history ORDER BY scraped_at"
    ).fetchall():
        history[pid].append((epoch_ms(ts), unit, actual, ts[:10]))

    cur.close()
    conn.close()

    now = datetime.now(timezone.utc)
    cutoff = int(now.timestamp() * 1000) - HISTORY_CAP_DAYS * 86400000

    out_products = []
    for p in products:
        pts = [pt for pt in history.get(p["id"], []) if pt[0] >= cutoff]
        if not pts:
            continue
        daily_pts = daily_aggregate_and_cap(pts, max_points=MAX_POINTS)
        stats = compute_stats(daily_pts)
        p["actual_price"] = stats["actual"]
        p["unit_price"] = stats["unit"]
        p["min_price"] = stats["min"]
        p["max_price"] = stats["max"]
        p["avg_price"] = stats["avg"]
        p["change"] = stats["change"]
        p["history"] = daily_pts
        out_products.append(p)

    snapshot = {
        "generated_at": now.isoformat(),
        "mode": "static",
        "categories": categories,
        "category_counts": {str(k): v for k, v in cat_counts.items()},
        "products": out_products,
    }

    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(snapshot, f, separators=(",", ":"))

    size = os.path.getsize(OUT_PATH) / 1024 / 1024
    print(f"Exported {len(out_products)} products -> {OUT_PATH}")
    print(f"Size: {size:.2f} MB")


def compute_stats(pts):
    unit_prices = [pt[1] for pt in pts]
    actual_prices = [pt[2] for pt in pts]
    latest_unit = unit_prices[-1]
    latest_actual = actual_prices[-1]
    prev_unit = unit_prices[-2] if len(unit_prices) > 1 else latest_unit
    change = ((latest_unit - prev_unit) / prev_unit * 100) if prev_unit else 0
    return {
        "unit": round(latest_unit, 2),
        "actual": round(latest_actual, 2),
        "min": round(min(unit_prices), 2),
        "max": round(max(unit_prices), 2),
        "avg": round(sum(unit_prices) / len(unit_prices), 2),
        "change": round(change, 2),
    }


if __name__ == "__main__":
    main()