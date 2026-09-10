"""
Offline training script — Prophet price forecasting model per crop.

Run AFTER generate_sample_data.py:
    cd backend
    python -m app.ml.train_price_model              # trains all crops
    python -m app.ml.train_price_model --crop onion # trains one crop
    python -m app.ml.train_price_model --csv path/to/real.csv --crop onion

Expected CSV columns:
    arrival_date  (YYYY-MM-DD)
    modal_price   (float, Rs/kg)

Output: backend/app/ml/models/prophet_<crop>.json
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import pandas as pd
from prophet import Prophet
from prophet.diagnostics import cross_validation, performance_metrics
from prophet.serialize import model_to_json

MODEL_DIR = Path(__file__).resolve().parent / "models"
DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"
MODEL_DIR.mkdir(exist_ok=True)

ALL_CROPS = ["wheat", "onion", "potato", "tomato", "cotton", "soybean"]


def _load_and_clean(csv_path: str | Path) -> pd.DataFrame:
    """Load CSV, rename columns to Prophet format (ds, y), drop bad rows."""
    df = pd.read_csv(csv_path)

    rename_map = {}
    if "arrival_date" in df.columns:
        rename_map["arrival_date"] = "ds"
    if "modal_price" in df.columns:
        rename_map["modal_price"] = "y"
    df = df.rename(columns=rename_map)

    if "ds" not in df.columns or "y" not in df.columns:
        raise ValueError(f"CSV must have 'arrival_date' and 'modal_price' columns. Found: {list(df.columns)}")

    df["ds"] = pd.to_datetime(df["ds"], errors="coerce")
    df["y"] = pd.to_numeric(df["y"], errors="coerce")
    df = df.dropna(subset=["ds", "y"]).sort_values("ds").reset_index(drop=True)

    median_price = df["y"].median()
    df = df[(df["y"] > median_price * 0.2) & (df["y"] < median_price * 5.0)]

    print(f"   Loaded {len(df)} clean rows | Price range: ₹{df['y'].min():.1f} – ₹{df['y'].max():.1f}")
    return df[["ds", "y"]]


def _build_model(seasonality_mode: str = "multiplicative") -> Prophet:
    """
    Build a Prophet model tuned for Indian mandi price patterns.
    - multiplicative seasonality works better when price swings are proportional
    - changepoint_prior_scale=0.15 allows the model to pick up sudden market events
    - weekly_seasonality captures mandi holiday patterns (mandi closed Sundays in some states)
    """
    return Prophet(
        yearly_seasonality=True,
        weekly_seasonality=True,
        daily_seasonality=False,
        seasonality_mode=seasonality_mode,
        changepoint_prior_scale=0.15,
        seasonality_prior_scale=10.0,
        interval_width=0.80,
    )


def train(crop: str, csv_path: str | Path, validate: bool = True) -> None:
    print(f"\n🌾 Training Prophet model for: {crop.upper()}")
    df = _load_and_clean(csv_path)

    model = _build_model()
    model.fit(df)

    if validate and len(df) >= 180:
        print("   Running cross-validation (takes ~30 seconds)...")
        try:
            cv_df = cross_validation(
                model,
                initial="120 days",
                period="30 days",
                horizon="7 days",
            )
            metrics = performance_metrics(cv_df)
            mape = metrics["mape"].mean() * 100
            rmse = metrics["rmse"].mean()
            print(f"   Validation → MAPE: {mape:.1f}%  |  RMSE: ₹{rmse:.2f}/kg")
            if mape > 30:
                print(f"   ⚠️  High MAPE ({mape:.1f}%). Consider more data or tuning changepoint_prior_scale.")
        except Exception as e:
            print(f"   ⚠️  Cross-validation skipped: {e}")

    out_path = MODEL_DIR / f"prophet_{crop.lower()}.json"
    with open(out_path, "w") as f:
        json.dump(model_to_json(model), f)
    print(f"   ✅ Saved → {out_path}")


def train_all() -> None:
    """Train all crops using the generated sample CSVs."""
    for crop in ALL_CROPS:
        csv_path = DATA_DIR / f"{crop}_prices.csv"
        if csv_path.exists():
            train(crop, csv_path, validate=True)
        else:
            print(f"⚠️  Skipping {crop} — no data file at {csv_path}")
            print(f"   Run: python -m app.ml.generate_sample_data first.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train Prophet price model for one or all crops.")
    parser.add_argument("--crop", default=None, help="Crop name (e.g. onion). Omit to train all crops.")
    parser.add_argument("--csv", default=None, help="Path to historical price CSV. Auto-detected if omitted.")
    parser.add_argument("--no-validate", action="store_true", help="Skip cross-validation (faster).")
    args = parser.parse_args()

    if args.crop:
        csv = args.csv or str(DATA_DIR / f"{args.crop.lower()}_prices.csv")
        train(args.crop, csv, validate=not args.no_validate)
    else:
        train_all()
