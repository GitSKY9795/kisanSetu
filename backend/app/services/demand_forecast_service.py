"""
Demand Forecasting Module for KisanSetu.

Predicts market demand (HIGH / MEDIUM / LOW) for the next 14 days with the XGBoost model
trained on real AGMARKNET mandi prices (app/ml/train_demand_model.py), from the latest
downloaded history (data/agmarknet/, kept current by app/ml/agmarknet_history.py). Uses
the farmer's state when its mandis report regularly enough, otherwise the all-India series.

Falls back to fixed per-crop profiles when the model or a crop's history is missing, so the
Sell-Decision engine always gets a demand score. `engine` in the result says which was used.
"""
from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

import pandas as pd

from app.ml.demand_features import (
    ALL_INDIA, FEATURES, HISTORY_DIR, crop_key, history_path, load_history, series_features,
)

MODEL_DIR = Path(__file__).resolve().parent.parent / "ml" / "models"
MODEL_PATH = MODEL_DIR / "demand_model.json"
META_PATH = MODEL_DIR / "demand_model_meta.json"
STALE_DAYS = 10  # a state series older than this (vs the newest data) is not used

TREND = {"HIGH": "UPWARD", "MEDIUM": "STABLE", "LOW": "DOWNWARD"}

# Used only when the trained model or a crop's history is unavailable
CROP_DEMAND_PROFILES = {
    "wheat": {"base_level": "HIGH", "volume_index": 1.35, "trend_direction": "UPWARD"},
    "onion": {"base_level": "MEDIUM", "volume_index": 1.05, "trend_direction": "STABLE"},
    "potato": {"base_level": "HIGH", "volume_index": 1.20, "trend_direction": "UPWARD"},
    "cotton": {"base_level": "MEDIUM", "volume_index": 0.95, "trend_direction": "STABLE"},
    "rice": {"base_level": "HIGH", "volume_index": 1.40, "trend_direction": "UPWARD"},
}


def _mtime(path: Path) -> float:
    return path.stat().st_mtime if path.exists() else 0.0


@lru_cache(maxsize=2)
def _load_model(mtime: float):
    if not mtime or not META_PATH.exists():
        return None, None
    try:
        import xgboost as xgb

        model = xgb.XGBClassifier()
        model.load_model(str(MODEL_PATH))
        return model, json.loads(META_PATH.read_text())
    except Exception:
        return None, None


@lru_cache(maxsize=2)
def _district_states(mtime: float) -> dict[str, str]:
    path = HISTORY_DIR / "district_states.json"
    try:
        return json.loads(path.read_text()) if mtime else {}
    except (OSError, ValueError):
        return {}


def _state_for(place: str, known_states: set[str]) -> str | None:
    """The farmer's district (or a state name) -> the state as AGMARKNET spells it."""
    key = (place or "").strip().lower()
    if not key:
        return None
    for state in known_states:
        if state.lower() == key:
            return state
    return _district_states(_mtime(HISTORY_DIR / "district_states.json")).get(key)


@lru_cache(maxsize=64)
def _latest_row(crop: str, region: str, mtime: float) -> pd.Series | None:
    """Newest complete feature row for a crop in a region; cached until the history changes."""
    history = load_history(crop)
    features = series_features(history, crop, region) if history is not None else None
    if features is None:
        return None
    valid = features.dropna(subset=FEATURES)
    if valid.empty or (history["date"].max() - valid.index[-1]).days > STALE_DAYS:
        return None
    row = valid.iloc[-1].copy()
    row["as_of"] = valid.index[-1]
    return row


def _profile_forecast(crop_name: str, district: str) -> dict:
    profile = CROP_DEMAND_PROFILES.get(
        crop_name.lower().strip(), {"base_level": "MEDIUM", "volume_index": 1.0, "trend_direction": "STABLE"}
    )
    buyer_interest_score = round(min(profile["volume_index"] * 75, 95.0), 1)
    return {
        "crop_name": crop_name,
        "district": district,
        "demand_level": profile["base_level"],
        "volume_index": profile["volume_index"],
        "trend_direction": profile["trend_direction"],
        "buyer_interest_score": buyer_interest_score,
        # Normalised 0-1 score consumed by the Sell-Decision engine / ML feature vector.
        "demand_score": round(min(buyer_interest_score / 100.0, 1.0), 3),
        "engine": "Fixed crop profile (no trained demand model for this crop yet)",
        "summary": f"Market demand for {crop_name} in {district} is currently {profile['base_level']} with an {profile['trend_direction']} trend.",
    }


def get_demand_forecast(crop_name: str, district: str = "Default") -> dict:
    crop = crop_key(crop_name)
    model, meta = _load_model(_mtime(MODEL_PATH))
    history = load_history(crop) if crop else None
    if model is None or history is None:
        return _profile_forecast(crop_name, district)

    stamp = _mtime(history_path(crop))
    state = _state_for(district, set(history["state"].unique()) - {ALL_INDIA})
    row, region = None, ALL_INDIA
    if state:
        row, region = _latest_row(crop, state, stamp), state
    if row is None:
        row, region = _latest_row(crop, ALL_INDIA, stamp), ALL_INDIA
    if row is None:
        return _profile_forecast(crop_name, district)

    proba = model.predict_proba(pd.DataFrame([row[FEATURES].astype(float)]))[0]
    labels = meta["labels"]
    level = labels[int(proba.argmax())]
    p = dict(zip(labels, (float(v) for v in proba)))
    demand_score = round(p["HIGH"] + 0.5 * p["MEDIUM"], 3)
    arrivals = round(float(row["arrivals_ratio"]), 2)
    change_14d = round(float(row["ret_14d"]) * 100, 1)
    where = "across India" if region == ALL_INDIA else f"in {region}"
    supply = ("more mandis than usual are" if arrivals > 1.1 else "fewer mandis than usual are"
              if arrivals < 0.9 else "the usual number of mandis is")
    horizon = meta.get("horizon_days", 14)

    return {
        "crop_name": crop_name,
        "district": district,
        "demand_level": level,
        # Mandi arrivals this week vs the usual level (1.0 = normal)
        "volume_index": arrivals,
        "trend_direction": TREND[level],
        "buyer_interest_score": round(demand_score * 100, 1),
        # Normalised 0-1 score consumed by the Sell-Decision engine / ML feature vector.
        "demand_score": demand_score,
        "probabilities": {k: round(v, 3) for k, v in p.items()},
        "region": region,
        "as_of": row["as_of"].date().isoformat(),
        "horizon_days": horizon,
        "price_change_14d_pct": change_14d,
        "mandis_reporting_today": int(row["n_markets"]),
        "model_test_accuracy": meta.get("test_metrics", {}).get("model", {}).get("accuracy"),
        "engine": "XGBoost on AGMARKNET mandi prices",
        "summary": (
            f"Demand for {crop_name} {where} looks {level} for the next {horizon} days "
            f"({p[level] * 100:.0f}% likely). Prices moved {change_14d:+.1f}% in the last 14 days and "
            f"{supply} reporting arrivals (data up to {row['as_of']:%d %b %Y})."
        ),
    }
