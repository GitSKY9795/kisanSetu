"""
Client for AGMARKNET / data.gov.in mandi price & arrivals data.

If AGMARKNET_API_KEY is set, we call the real data.gov.in resource. data.gov.in's daily
feed is sparse — it typically carries only a few hundred rows covering a handful of
commodities each day, so a specific crop can genuinely have zero live rows on a given
day even with a working key (confirmed live: a "Wheat" query returned 0 of the day's
~250 records). When that happens we fall back to this project's bundled historical
mandi data (`data/<crop>_prices.csv`) rather than surfacing "unavailable" for a crop
that simply has no *today* arrivals — every returned record is tagged `is_live` so
callers and the UI can be honest about which case they're showing. Only a crop with
neither a live row nor bundled history returns no records at all.
"""
from __future__ import annotations

import asyncio
import csv
import re
import time
from datetime import datetime, timezone
from pathlib import Path

import httpx

from app.core.config import settings

_DATA_DIR = Path(__file__).resolve().parents[3] / "data"

AGMARKNET_RESOURCE_URL = "https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070"

# Realistic Indian mandi wholesale price bands (Rs/quintal), reflecting typical
# 2025-26 modal price ranges. amplitude/cycle drive believable seasonal swings;
# volatility drives day-to-day mandi noise (onion/tomato are notoriously volatile,
# wheat/rice are comparatively stable MSP-anchored crops).
CROP_PRICE_PROFILES = {
    "wheat":    {"base": 2380, "amplitude": 180,  "cycle_days": 90,  "volatility": 0.02},
    "rice":     {"base": 2150, "amplitude": 120,  "cycle_days": 90,  "volatility": 0.02},
    "paddy":    {"base": 2100, "amplitude": 110,  "cycle_days": 90,  "volatility": 0.02},
    "onion":    {"base": 1800, "amplitude": 900,  "cycle_days": 45,  "volatility": 0.09},
    "potato":   {"base": 1250, "amplitude": 450,  "cycle_days": 60,  "volatility": 0.06},
    "tomato":   {"base": 1600, "amplitude": 1200, "cycle_days": 30,  "volatility": 0.14},
    "cotton":   {"base": 6800, "amplitude": 500,  "cycle_days": 120, "volatility": 0.025},
    "soybean":  {"base": 4550, "amplitude": 350,  "cycle_days": 90,  "volatility": 0.03},
    "maize":    {"base": 2050, "amplitude": 200,  "cycle_days": 75,  "volatility": 0.03},
    "groundnut":{"base": 6100, "amplitude": 400,  "cycle_days": 90,  "volatility": 0.03},
    "mustard":  {"base": 5450, "amplitude": 300,  "cycle_days": 90,  "volatility": 0.025},
    "gram":     {"base": 5350, "amplitude": 350,  "cycle_days": 90,  "volatility": 0.03},
    "chana":    {"base": 5350, "amplitude": 350,  "cycle_days": 90,  "volatility": 0.03},
    "sugarcane":{"base": 340,  "amplitude": 20,   "cycle_days": 180, "volatility": 0.01},
}
DEFAULT_PROFILE = {"base": 2000, "amplitude": 250, "cycle_days": 60, "volatility": 0.04}

DEFAULT_MARKETS = {
    "wheat": ("Madhya Pradesh", "Ujjain"),
    "onion": ("Maharashtra", "Nashik"),
    "potato": ("Uttar Pradesh", "Agra"),
    "tomato": ("Karnataka", "Kolar"),
    "cotton": ("Gujarat", "Rajkot"),
    "soybean": ("Madhya Pradesh", "Indore"),
    "maize": ("Bihar", "Gaya"),
}


def _normalise_record(record: dict) -> dict:
    """Map data.gov.in's title-cased fields to the API's stable contract."""
    def value(*names):
        for name in names:
            if record.get(name) not in (None, ""):
                return record[name]
        return None

    return {
        "state": value("state", "State"),
        "district": value("district", "District"),
        "market": value("market", "Market"),
        "commodity": value("commodity", "Commodity"),
        "variety": value("variety", "Variety"),
        "arrival_date": value("arrival_date", "Arrival_Date"),
        "min_price": value("min_price", "Min_Price"),
        "max_price": value("max_price", "Max_Price"),
        "modal_price": value("modal_price", "Modal_Price"),
    }


def _snapshot_params(offset: int) -> dict:
    return {
        "api-key": settings.AGMARKNET_API_KEY,
        "format": "json",
        "limit": _SNAPSHOT_PAGE,
        "offset": offset,
    }


def _normalise_records(records: list[dict], location_match: bool = True) -> list[dict]:
    result = []
    for record in records:
        normalized = _normalise_record(record)
        if normalized.get("modal_price"):
            normalized["location_match"] = location_match
            normalized["is_live"] = True
            result.append(normalized)
    return result


def _local_price_fallback(commodity: str, limit: int = 1) -> list[dict]:
    """Bundled historical prices for a crop, used only when today's live feed has no
    rows for it at all. Returns up to `limit` of the most recent dated rows (the
    bundled files hold ~2 years of daily history) so a history/trend chart gets a real
    multi-point series rather than a single flat dot when a caller asks for more than
    the latest price. Shaped like a normalised live record (minus location_match,
    since bundled history isn't tied to any district) so every caller can treat it
    identically, but flagged `is_live: False` so nothing displays it as current."""
    csv_path = _DATA_DIR / f"{commodity.strip().lower()}_prices.csv"
    if not csv_path.exists():
        return []
    try:
        with csv_path.open(newline="", encoding="utf-8") as csv_file:
            rows = [row for row in csv.DictReader(csv_file) if row.get("modal_price")]
        if not rows:
            return []
        selected = rows[-max(limit, 1):]
        return [
            {
                "state": None,
                "district": None,
                "market": "Local historical reference",
                "commodity": commodity,
                "variety": None,
                "arrival_date": row.get("arrival_date", "recent history"),
                "min_price": None,
                "max_price": None,
                # Bundled files store rupees per kg; the live feed's modal_price is
                # rupees per quintal — convert so every caller can treat it uniformly.
                "modal_price": float(row["modal_price"]) * 100,
                "location_match": False,
                "is_live": False,
            }
            for row in selected
        ]
    except (OSError, ValueError, TypeError):
        return []


def _request_timeout() -> httpx.Timeout:
    return httpx.Timeout(timeout=25.0, connect=5.0)


# --- Whole-day snapshot -------------------------------------------------------------
#
# data.gov.in's "current daily price" feed holds only the day's reports (a few hundred
# rows across the whole country), yet the app asks about many crops at once - the
# dashboard alone looks up a handful on every load. Querying the provider once per crop
# (plus retries and a nationwide fallback query) trips its burst protection: connections
# are first dropped, then actively refused, and every price screen stalls for tens of
# seconds. So the day's rows are fetched in ONE request, held in memory, and each crop /
# district question is answered by filtering that snapshot locally.

_SNAPSHOT_PAGE = 1000
_SNAPSHOT_MAX_PAGES = 5
_TTL_LIVE_S = 300.0       # how long a good snapshot is reused
_TTL_ERROR_S = 45.0       # how soon a failed fetch is retried (don't hammer a provider that is refusing us)
_MAX_STALE_S = 3 * 3600   # if refreshing fails, the last good rows are served for at most this long

_snapshot_rows: list[dict] = []
_snapshot_expires = 0.0
_snapshot_fetched = 0.0
_async_lock: asyncio.Lock | None = None


def _snapshot_fresh() -> list[dict] | None:
    return _snapshot_rows if time.monotonic() < _snapshot_expires else None


def _store_snapshot(rows: list[dict], ttl: float, *, fetched: bool) -> None:
    global _snapshot_rows, _snapshot_expires, _snapshot_fetched
    _snapshot_rows = rows
    _snapshot_expires = time.monotonic() + ttl
    if fetched:
        _snapshot_fetched = time.monotonic()


def _after_failed_fetch() -> list[dict]:
    """Keep serving the last good rows briefly rather than dropping every crop to
    "unavailable" the moment one refresh fails; give up on them after _MAX_STALE_S."""
    if _snapshot_rows and time.monotonic() - _snapshot_fetched < _MAX_STALE_S:
        _store_snapshot(_snapshot_rows, _TTL_ERROR_S, fetched=False)
    else:
        _store_snapshot([], _TTL_ERROR_S, fetched=False)
    return _snapshot_rows


def _fetch_page_sync(client: httpx.Client, offset: int) -> dict:
    last_error: Exception | None = None
    for attempt in range(2):
        try:
            response = client.get(AGMARKNET_RESOURCE_URL, params=_snapshot_params(offset), headers={"User-Agent": "KisanSetu/1.0"})
            response.raise_for_status()
            return response.json()
        except Exception as exc:
            last_error = exc
            if attempt < 1:
                time.sleep(1.0)
    raise last_error


async def _fetch_page(client: httpx.AsyncClient, offset: int) -> dict:
    last_error: Exception | None = None
    for attempt in range(2):
        try:
            response = await client.get(AGMARKNET_RESOURCE_URL, params=_snapshot_params(offset), headers={"User-Agent": "KisanSetu/1.0"})
            response.raise_for_status()
            return response.json()
        except Exception as exc:
            last_error = exc
            if attempt < 1:
                await asyncio.sleep(1.0)
    raise last_error


def _load_snapshot_sync() -> list[dict]:
    fresh = _snapshot_fresh()
    if fresh is not None:
        return fresh
    try:
        rows: list[dict] = []
        offset = 0
        with httpx.Client(timeout=_request_timeout()) as client:
            for _ in range(_SNAPSHOT_MAX_PAGES):
                payload = _fetch_page_sync(client, offset)
                page = payload.get("records", [])
                rows.extend(_normalise_records(page))
                offset += len(page)
                if not page or offset >= int(payload.get("total") or 0):
                    break
        _store_snapshot(rows, _TTL_LIVE_S if rows else _TTL_ERROR_S, fetched=True)
        return rows
    except Exception:
        return _after_failed_fetch()


async def _load_snapshot() -> list[dict]:
    global _async_lock
    fresh = _snapshot_fresh()
    if fresh is not None:
        return fresh
    if _async_lock is None:
        _async_lock = asyncio.Lock()
    # Concurrent callers (the dashboard fans out one lookup per crop) wait here for the
    # single in-flight fetch instead of each issuing their own.
    async with _async_lock:
        fresh = _snapshot_fresh()
        if fresh is not None:
            return fresh
        try:
            rows: list[dict] = []
            offset = 0
            async with httpx.AsyncClient(timeout=_request_timeout()) as client:
                for _ in range(_SNAPSHOT_MAX_PAGES):
                    payload = await _fetch_page(client, offset)
                    page = payload.get("records", [])
                    rows.extend(_normalise_records(page))
                    offset += len(page)
                    if not page or offset >= int(payload.get("total") or 0):
                        break
            _store_snapshot(rows, _TTL_LIVE_S if rows else _TTL_ERROR_S, fetched=True)
            return rows
        except Exception:
            return _after_failed_fetch()


# --- Answering a crop/location question from the snapshot -----------------------------

def _norm_commodity(name: str | None) -> str:
    """Letters only, lower-cased, with the provider's own spelling ("Soyabean") folded
    onto the common one, so "Paddy" finds "Paddy(Common)" and "Soybean" finds "Soyabean"."""
    return re.sub(r"[^a-z]", "", (name or "").lower()).replace("soyabean", "soybean")


def _same(value: str | None, wanted: str | None) -> bool:
    return not wanted or (value or "").strip().lower() == wanted.strip().lower()


def _select(rows: list[dict], commodity: str, state: str | None, district: str | None, limit: int) -> list[dict]:
    wanted = _norm_commodity(commodity)
    if not wanted:
        return []
    matching = [row for row in rows if _norm_commodity(row.get("commodity")).startswith(wanted)]
    if not matching:
        return []
    if not (state or district):
        return [dict(row, location_match=True) for row in matching[:limit]]
    local = [row for row in matching if _same(row.get("state"), state) and _same(row.get("district"), district)]
    if local:
        return [dict(row, location_match=True) for row in local[:limit]]
    # Nothing reported in the farmer's own district today: fall back to the crop's rows
    # elsewhere (same state first) and say so via location_match=False.
    nearby_first = sorted(matching, key=lambda row: 0 if _same(row.get("state"), state) else 1)
    return [dict(row, location_match=False) for row in nearby_first[:limit]]


def fetch_mandi_prices_sync(
    commodity: str, state: str | None = None, district: str | None = None, limit: int = 1
) -> list[dict]:
    """Synchronous variant for LangChain tools, which are regular functions."""
    if not settings.AGMARKNET_API_KEY:
        return _local_price_fallback(commodity, limit)
    return _select(_load_snapshot_sync(), commodity, state, district, limit) or _local_price_fallback(commodity, limit)


async def fetch_mandi_prices(
    commodity: str, state: str | None = None, district: str | None = None, limit: int = 50
) -> list[dict]:
    if not settings.AGMARKNET_API_KEY:
        return _local_price_fallback(commodity, limit)
    return _select(await _load_snapshot(), commodity, state, district, limit) or _local_price_fallback(commodity, limit)


def fetched_at_utc() -> str:
    return datetime.now(timezone.utc).isoformat()
