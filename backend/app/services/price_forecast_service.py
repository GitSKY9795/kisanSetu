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
    from prophet.serialize import model_from_json

    with open(path) as f:
        return model_from_json(json.load(f))


def forecast_price(crop_name: str, current_price: float, horizon_days: int = 7) -> float:
    """Returns a predicted price `horizon_days` ahead.

    If a trained Prophet model exists for this crop, use it. Otherwise fall back
    to a naive flat forecast so downstream code keeps working during early dev.
    """
    model = load_model(crop_name)
    if model is None:
        return round(current_price, 2)  # naive fallback

    future = model.make_future_dataframe(periods=horizon_days)
    forecast = model.predict(future)
    predicted = forecast.iloc[-1]["yhat"]
    return round(float(predicted), 2)


def price_history_dataframe(records: list[dict]) -> pd.DataFrame:
    """Converts raw Agmarknet records into the (ds, y) format Prophet expects."""
    df = pd.DataFrame(records)
    df = df.rename(columns={"arrival_date": "ds", "modal_price": "y"})
    df["ds"] = pd.to_datetime(df["ds"], errors="coerce")
    df["y"] = pd.to_numeric(df["y"], errors="coerce")
    return df.dropna(subset=["ds", "y"])[["ds", "y"]]
