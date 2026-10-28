"""
Downloads historical mandi prices from AGMARKNET (data.gov.in "Variety-wise Daily Market
Prices" resource) and stores them as daily per-state summaries — the training data for the
demand model (app/ml/train_demand_model.py) and the recent history it predicts from.

Each crop follows a fixed panel of up to 12 mandis that report regularly (at most 3 per
state), chosen from the most recent days' reports. One request per mandi returns its last
1000 reports (2-3 years), so a full download takes minutes rather than hours of day-by-day
national queries. Keeping the panel fixed means history and later top-ups measure the same
mandis, so "how many of them reported this week" stays comparable over time.

Usage (from the backend folder, AGMARKNET_API_KEY set in .env):
    python -m app.ml.agmarknet_history                  # pick panels + download history, every crop
    python -m app.ml.agmarknet_history --crop onion
    python -m app.ml.agmarknet_history --top-up 21      # add the last 21 days for the panel mandis

Writes data/agmarknet/<crop>.csv with one row per (date, state) plus an "ALL INDIA" row per
date: number of panel mandis that reported, and the median modal/min/max price in
Rs/quintal. panels.json holds each crop's mandis; fetched.json the days already topped up.
"""
from __future__ import annotations

import argparse
import json
import os
import threading
import time
from collections import Counter, defaultdict
from concurrent.futures import ThreadPoolExecutor
from datetime import date, datetime, timedelta
from statistics import median

import httpx
import pandas as pd

from app.core.config import settings
from app.ml.demand_features import ALL_INDIA, COMMODITY_NAMES, HISTORY_DIR, history_path

HISTORY_URL = "https://api.data.gov.in/resource/35985678-0d79-46b4-9ed6-6f13308a1d24"
PAGE = 1000
WORKERS = 3          # data.gov.in stalls under heavier bursts
PANEL_SIZE = 12
PER_STATE = 3
HISTORY_DAYS = 730   # older reports are dropped
FETCHED_PATH = HISTORY_DIR / "fetched.json"
DISTRICTS_PATH = HISTORY_DIR / "district_states.json"
PANELS_PATH = HISTORY_DIR / "panels.json"
COLUMNS = ["date", "state", "n_markets", "modal_price", "min_price", "max_price"]
REFRESH_DAYS = 21            # the backend's automatic top-up looks this far back
REFRESH_EVERY_S = 6 * 3600


def _write_atomic(path, text: str) -> None:
    """The running backend reads these files, so never let it see a half-written one."""
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(text, encoding="utf-8")
    os.replace(tmp, path)


def _read_json(path, default):
    try:
        return json.loads(path.read_text()) if path.exists() else default
    except (OSError, ValueError):
        return default


_local = threading.local()


def _client() -> httpx.Client:
    # One connection per worker thread: data.gov.in stalls when threads share a pool.
    if getattr(_local, "client", None) is None:
        _local.client = httpx.Client(timeout=httpx.Timeout(60, connect=15), headers={"User-Agent": "KisanSetu/1.0"})
    return _local.client


def _get(params: dict) -> dict:
    for attempt in range(4):
        try:
            response = _client().get(HISTORY_URL, params={"api-key": settings.AGMARKNET_API_KEY, "format": "json", **params})
            response.raise_for_status()
            return response.json()
        except Exception:
            if attempt == 3:
                raise
            time.sleep(2 ** attempt)
    return {}


def fetch_day(commodity: str, day: date) -> list[dict]:
    """Every mandi record for one commodity on one day (all pages)."""
    records, offset = [], 0
    while True:
        payload = _get({
            "limit": PAGE,
            "offset": offset,
            "filters[Commodity]": commodity,
            "filters[Arrival_Date]": day.strftime("%d/%m/%Y"),
        })
        page = payload.get("records", [])
        records.extend(page)
        offset += len(page)
        if not page or offset >= int(payload.get("total") or 0):
            return records


def fetch_market(commodity: str, state: str, market: str) -> list[dict]:
    """A mandi's latest PAGE reports for a commodity, newest first."""
    return _get({
        "limit": PAGE,
        "filters[Commodity]": commodity,
        "filters[State]": state,
        "filters[Market]": market,
        "sort[Arrival_Date]": "desc",
    }).get("records", [])


def _parse_date(value: str) -> date | None:
    try:
        return datetime.strptime(value, "%d/%m/%Y").date()
    except (TypeError, ValueError):
        return None


def summarise_day(records: list[dict], day: date, districts: dict[str, str]) -> list[dict]:
    """Per-state and all-India summary rows for one day's records. Obvious data-entry errors
    (modal price under 1/5 or over 5x the day's median) are dropped first."""
    rows = []
    for r in records:
        try:
            modal = float(r.get("Modal_Price") or 0)
            low = float(r.get("Min_Price") or modal)
            high = float(r.get("Max_Price") or modal)
        except (TypeError, ValueError):
            continue
        if modal > 0 and r.get("State"):
            rows.append((r["State"].strip(), (r.get("Market") or "").strip(), modal, low, high))
            if r.get("District"):
                districts[r["District"].strip().lower()] = r["State"].strip()
    if not rows:
        return []
    middle = median(m for _, _, m, _, _ in rows)
    rows = [row for row in rows if middle / 5 <= row[2] <= middle * 5]

    groups: dict[str, list[tuple]] = {ALL_INDIA: rows}
    for row in rows:
        groups.setdefault(row[0], []).append(row)
    return [
        {
            "date": day.isoformat(),
            "state": state,
            "n_markets": len({market for _, market, _, _, _ in group}),
            "modal_price": round(median(m for _, _, m, _, _ in group), 1),
            "min_price": round(median(lo for _, _, _, lo, _ in group), 1),
            "max_price": round(median(hi for _, _, _, _, hi in group), 1),
        }
        for state, group in groups.items()
    ]


def _in_panel(records: list[dict], panel: list[list[str]]) -> list[dict]:
    wanted = {(s, m) for s, m in panel}
    return [r for r in records if (r.get("State"), r.get("Market")) in wanted]


def _save_rows(crop: str, new_rows: list[dict], replace: bool = False) -> int:
    path = history_path(crop)
    frames = [] if replace or not path.exists() else [pd.read_csv(path)]
    if new_rows:
        frames.append(pd.DataFrame(new_rows, columns=COLUMNS))
    merged = pd.concat(frames, ignore_index=True) if frames else pd.DataFrame(columns=COLUMNS)
    merged = merged.drop_duplicates(["date", "state"], keep="last").sort_values(["date", "state"])
    _write_atomic(path, merged.to_csv(index=False))
    return len(merged)


def choose_panel(commodity: str) -> list[list[str]]:
    """Up to PANEL_SIZE mandis that reported on the most recent days, the most regular
    first, at most PER_STATE per state so one big state doesn't dominate."""
    seen: Counter = Counter()  # (state, market) -> on how many of the looked-at days it reported
    day, looked = date.today() - timedelta(days=1), 0
    while looked < 3 or (looked < 7 and len(seen) < PANEL_SIZE * 3):
        reported = {(r["State"], r["Market"]) for r in fetch_day(commodity, day)
                    if r.get("State") and r.get("Market") and float(r.get("Modal_Price") or 0) > 0}
        seen.update(reported)
        day -= timedelta(days=1)
        looked += 1
    panel, per_state = [], Counter()
    for (state, market), _ in seen.most_common():
        if per_state[state] < PER_STATE:
            panel.append([state, market])
            per_state[state] += 1
        if len(panel) == PANEL_SIZE:
            break
    return panel


def download_crop(crop: str, panels: dict, districts: dict) -> None:
    """Chooses the crop's panel and replaces its history with the panel mandis' reports."""
    commodity = COMMODITY_NAMES[crop]
    started = time.time()
    panel = choose_panel(commodity)
    if not panel:
        print(f"  {crop:<8} no recent reports — skipped", flush=True)
        return
    with ThreadPoolExecutor(max_workers=WORKERS) as pool:
        results = list(pool.map(lambda sm: _safe_market(commodity, *sm), panel))

    cutoff = date.today() - timedelta(days=HISTORY_DAYS)
    by_day: dict[date, list[dict]] = defaultdict(list)
    for records in results:
        for r in records:
            d = _parse_date(r.get("Arrival_Date"))
            if d and d >= cutoff:
                by_day[d].append(r)
    rows = [row for d in sorted(by_day) for row in summarise_day(by_day[d], d, districts)]
    total = _save_rows(crop, rows, replace=True)
    panels[crop] = panel
    first = min(by_day) if by_day else None
    print(f"  {crop:<8} {len(panel)} mandis, {sum(map(len, results))} reports, {len(by_day)} days "
          f"from {first} -> {total} rows  ({time.time() - started:.0f}s)", flush=True)


def _safe_market(commodity: str, state: str, market: str) -> list[dict]:
    try:
        return fetch_market(commodity, state, market)
    except Exception:
        return []


def top_up_crop(crop: str, days: int, panels: dict, fetched: dict, districts: dict) -> int:
    """Adds the last `days` days not fetched yet, keeping only the panel mandis."""
    panel = panels.get(crop)
    if not panel:
        return 0
    commodity = COMMODITY_NAMES[crop]
    done = set(fetched.get(crop, []))
    end = date.today() - timedelta(days=1)
    todo = [d for d in (end - timedelta(days=i) for i in range(days)) if d.isoformat() not in done]
    rows = []
    for day in todo:
        try:
            rows.extend(summarise_day(_in_panel(fetch_day(commodity, day), panel), day, districts))
            done.add(day.isoformat())
        except Exception:
            pass  # not marked as fetched, so the next run retries it
    if todo:
        _save_rows(crop, rows)
        fetched[crop] = sorted(d for d in done if d >= (end - timedelta(days=HISTORY_DAYS)).isoformat())
    return len(todo)


def download_all(crops: list[str] | None = None) -> None:
    HISTORY_DIR.mkdir(parents=True, exist_ok=True)
    panels, districts = _read_json(PANELS_PATH, {}), _read_json(DISTRICTS_PATH, {})
    fetched = _read_json(FETCHED_PATH, {})
    for crop in crops or list(COMMODITY_NAMES):
        download_crop(crop, panels, districts)
        fetched[crop] = []  # fresh history: the next top-up re-checks recent days
        _write_atomic(PANELS_PATH, json.dumps(panels, indent=1))
        _write_atomic(DISTRICTS_PATH, json.dumps(dict(sorted(districts.items())), indent=0))
        _write_atomic(FETCHED_PATH, json.dumps(fetched))


def top_up_all(days: int, crops: list[str] | None = None) -> None:
    panels, districts = _read_json(PANELS_PATH, {}), _read_json(DISTRICTS_PATH, {})
    fetched = _read_json(FETCHED_PATH, {})
    for crop in crops or list(panels):
        n = top_up_crop(crop, days, panels, fetched, districts)
        _write_atomic(FETCHED_PATH, json.dumps(fetched))
        _write_atomic(DISTRICTS_PATH, json.dumps(dict(sorted(districts.items())), indent=0))
        print(f"  {crop:<8} topped up {n} days", flush=True)


def start_background_refresh() -> None:
    """Called at backend startup: every few hours, add the recent days not fetched yet, so
    demand predictions use the latest mandi prices without re-running this script."""
    def loop():
        time.sleep(30)  # let the server finish starting first
        while True:
            try:
                top_up_all(REFRESH_DAYS)
            except Exception as exc:
                print(f"AGMARKNET history refresh failed: {exc}")
            time.sleep(REFRESH_EVERY_S)

    threading.Thread(target=loop, name="agmarknet-history-refresh", daemon=True).start()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--crop", choices=sorted(COMMODITY_NAMES), help="only this crop")
    parser.add_argument("--top-up", type=int, metavar="DAYS", help="only add the last DAYS days for existing panels")
    args = parser.parse_args()
    if not settings.AGMARKNET_API_KEY:
        print("AGMARKNET_API_KEY is not set in backend/.env")
        return 1
    crops = [args.crop] if args.crop else None
    if args.top_up:
        top_up_all(args.top_up, crops)
    else:
        download_all(crops)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
