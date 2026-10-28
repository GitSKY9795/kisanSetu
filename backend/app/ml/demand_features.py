"""
Features for the demand model, shared by training (train_demand_model.py) and live
prediction (services/demand_forecast_service.py) so both always compute them the same way.

AGMARKNET has no direct "buyer demand" figure, so demand is read from what the mandis
report: where prices are heading relative to their recent level, how jumpy they are, how
many mandis are seeing arrivals compared with normal (supply), and whether the state is pricier than the rest of India. The model
predicts the next 14 days: prices rising (HIGH demand — buyers absorbing supply), holding
(MEDIUM) or falling (LOW).
"""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path

import numpy as np
import pandas as pd

HISTORY_DIR = Path(__file__).resolve().parent.parent.parent / "data" / "agmarknet"
ALL_INDIA = "ALL INDIA"
HORIZON_DAYS = 14

# app crop key -> AGMARKNET commodity name (data.gov.in filters need the exact spelling)
COMMODITY_NAMES = {
    "wheat": "Wheat",
    "onion": "Onion",
    "potato": "Potato",
    "tomato": "Tomato",
    "cotton": "Cotton",
    "soybean": "Soyabean",
    "maize": "Maize",
    "paddy": "Paddy(Common)",
    "rice": "Rice",
    "mustard": "Mustard",
}
CROP_ALIASES = {"soyabean": "soybean", "dhan": "paddy", "sarson": "mustard"}

# Month and crop identity were tried and dropped: with ~1 year of history the model
# memorised the period instead of learning (test macro-F1 0.375 with them, 0.422 without).
FEATURES = [
    "ret_7d",            # smoothed price change over the last 7 / 14 / 30 days (log)
    "ret_14d",
    "ret_30d",
    "dev_90d",           # today's price vs its 90-day average (log)
    "volatility_14d",    # std of daily price changes
    "spread",            # (max - min) / modal across mandis — how much buyers disagree
    "arrivals_ratio",    # mandis reporting arrivals this week vs the usual 8-week level
    "local_vs_national", # state price vs all-India price (log); 0 for the all-India series
]


def crop_key(crop_name: str) -> str | None:
    key = (crop_name or "").strip().lower()
    key = CROP_ALIASES.get(key, key)
    return key if key in COMMODITY_NAMES else None


def history_path(crop: str) -> Path:
    return HISTORY_DIR / f"{crop}.csv"


@lru_cache(maxsize=32)
def _load(crop: str, mtime: float) -> pd.DataFrame | None:
    path = history_path(crop)
    if not path.exists():
        return None
    df = pd.read_csv(path, parse_dates=["date"])
    return df if not df.empty else None


def load_history(crop: str) -> pd.DataFrame | None:
    path = history_path(crop)
    return _load(crop, path.stat().st_mtime) if path.exists() else None


def _daily(df: pd.DataFrame, state: str) -> pd.DataFrame | None:
    """One state's rows on a continuous daily calendar. Prices carry over a week of
    non-reporting days (Sundays, mandi holidays); longer gaps stay empty."""
    part = df[df["state"] == state].set_index("date").sort_index()
    if part.empty:
        return None
    part = part[~part.index.duplicated(keep="last")]
    full = part.reindex(pd.date_range(part.index.min(), part.index.max(), freq="D"))
    out = pd.DataFrame(index=full.index)
    out["modal"] = full["modal_price"].ffill(limit=7)
    out["spread_raw"] = ((full["max_price"] - full["min_price"]) / full["modal_price"]).clip(0, 2)
    out["n_markets"] = full["n_markets"].fillna(0)
    return out


def _smooth(modal: pd.Series) -> pd.Series:
    return modal.rolling(7, min_periods=3).median()


def series_features(df: pd.DataFrame, crop: str, state: str) -> pd.DataFrame | None:
    """Feature rows (one per day) for a crop in one state, plus `smooth_price` and
    `n_markets` for reporting and labelling. Uses only data up to each day."""
    s = _daily(df, state)
    if s is None or len(s) < 30:
        return None
    price = _smooth(s["modal"])
    if state == ALL_INDIA:
        national = price
    else:
        nat = _daily(df, ALL_INDIA)
        national = _smooth(nat["modal"]).reindex(s.index) if nat is not None else price

    week = s["n_markets"].rolling(7, min_periods=7).sum()
    f = pd.DataFrame(index=s.index)
    f["ret_7d"] = np.log(price / price.shift(7))
    f["ret_14d"] = np.log(price / price.shift(14))
    f["ret_30d"] = np.log(price / price.shift(30))
    f["dev_90d"] = np.log(price / price.rolling(90, min_periods=45).mean())
    f["volatility_14d"] = np.log(s["modal"]).diff().rolling(14, min_periods=7).std()
    f["spread"] = s["spread_raw"].rolling(7, min_periods=3).median()
    f["arrivals_ratio"] = (week / week.rolling(56, min_periods=28).mean()).clip(0, 5)
    f["local_vs_national"] = np.log(price / national)
    f["smooth_price"] = price
    f["n_markets"] = s["n_markets"]
    return f.replace([np.inf, -np.inf], np.nan)


def forward_change(features: pd.DataFrame) -> pd.Series:
    """Training target: log change of the smoothed price over the next HORIZON_DAYS."""
    price = features["smooth_price"]
    return np.log(price.shift(-HORIZON_DAYS) / price)
