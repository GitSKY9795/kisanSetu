"""
Price forecasting service.

Loads a per-crop Prophet model trained offline (see app/ml/train_price_model.py)
and produces a short-horizon price forecast. Falls back to a naive
"today's price repeated" forecast if no trained model exists yet, so the rest
of the stack (decision engine, API, frontend) can be built and demoed before
the ML model is fully trained.
"""
from __future__ import annotations

import json
from pathlib import Path

import pandas as pd

MODEL_DIR = Path(__file__).resolve().parent.parent / "ml" / "models"


def _model_path(crop_name: str) -> Path:
    return MODEL_DIR / f"prophet_{crop_name.lower()}.json"


def load_model(crop_name: str):
    """Loads a saved Prophet model (JSON, via prophet.serialize) if present."""
    path = _model_path(crop_name)
    if not path.exists():
        return None
    try:
        from prophet.serialize import model_from_json
    except ImportError:
        return None  # prophet not installed — caller falls back to the naive forecast

    with open(path) as f:
        return model_from_json(json.load(f))


DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"


def _trend_ratio(crop_name: str, horizon_days: int) -> float | None:
    """Expected price change (as a ratio) over `horizon_days`, learned from the crop's bundled
    daily history. Scale-free, so it applies equally to the live per-quintal price. Uses the
    last 60 days: a log-linear trend, damped for longer horizons, capped at +/-20 %.
    Returns None when the crop has no history."""
    path = DATA_DIR / f"{crop_name.lower()}_prices.csv"
    if not path.exists():
        return None
    try:
        df = pd.read_csv(path).dropna().tail(60)
        if len(df) < 20 or (df["modal_price"] <= 0).any():
            return None
        import numpy as np

        y = np.log(df["modal_price"].to_numpy(dtype=float))
        x = np.arange(len(y), dtype=float)
        slope = float(np.polyfit(x, y, 1)[0])  # log-price change per day
        damped_days = horizon_days ** 0.85  # trends fade the further out we look
        return float(np.clip(np.exp(slope * damped_days), 0.80, 1.20))
    except Exception:
        return None


def forecast_price(crop_name: str, current_price: float, horizon_days: int = 7) -> float:
    """Returns a predicted price `horizon_days` ahead.

    Order of preference: a trained Prophet model (only if prophet is installed and the
    model's price scale matches), else the crop's recent trend from its bundled history,
    else a flat forecast for crops we have no history for.
    """
    model = load_model(crop_name)
    if model is not None:
        future = model.make_future_dataframe(periods=horizon_days)
        predicted = float(model.predict(future).iloc[-1]["yhat"])
        # Models were trained on per-kg history; live prices are per quintal. Only trust the
        # model when its output is on the same scale as the price we were given.
        if 0.5 <= predicted / current_price <= 2.0:
            return round(predicted, 2)

    ratio = _trend_ratio(crop_name, horizon_days)
    return round(current_price * ratio, 2) if ratio is not None else round(current_price, 2)


def price_history_dataframe(records: list[dict]) -> pd.DataFrame:
    """Converts raw Agmarknet records into the (ds, y) format Prophet expects."""
    df = pd.DataFrame(records)
    df = df.rename(columns={"arrival_date": "ds", "modal_price": "y"})
    df["ds"] = pd.to_datetime(df["ds"], errors="coerce")
    df["y"] = pd.to_numeric(df["y"], errors="coerce")
    return df.dropna(subset=["ds", "y"])[["ds", "y"]]
