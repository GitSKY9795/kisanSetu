"""
Sample Data Generator — synthetic historical mandi prices and decision dataset.
Run this first before training any model.

Usage:
    cd backend
    python -m app.ml.generate_sample_data
"""
from __future__ import annotations

import math
import numpy as np
import pandas as pd
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"
DATA_DIR.mkdir(exist_ok=True)

# Realistic base prices per crop (Rs/kg approx mandi wholesale)
CROP_CONFIG = {
    "wheat":   {"base": 22.0,  "amplitude": 3.0,  "cycle": 90},
    "onion":   {"base": 18.0,  "amplitude": 12.0, "cycle": 45},
    "potato":  {"base": 14.0,  "amplitude": 6.0,  "cycle": 60},
    "tomato":  {"base": 20.0,  "amplitude": 15.0, "cycle": 30},
    "cotton":  {"base": 65.0,  "amplitude": 8.0,  "cycle": 120},
    "soybean": {"base": 45.0,  "amplitude": 5.0,  "cycle": 90},
}


def generate_price_data(crop: str = "wheat", days: int = 730) -> Path:
    """Generates realistic price data with trend, seasonality, and noise."""
    cfg = CROP_CONFIG.get(crop, {"base": 20.0, "amplitude": 4.0, "cycle": 60})
    dates = pd.date_range(end=pd.Timestamp.now(), periods=days, freq="D")

    np.random.seed(abs(hash(crop)) % (2**31))
    prices = []
    for i, date in enumerate(dates):
        seasonality = cfg["amplitude"] * math.sin(2 * math.pi * i / cfg["cycle"])
        trend = i * (cfg["base"] * 0.0003)
        noise = np.random.normal(0, cfg["base"] * 0.05)
        spike = cfg["base"] * 0.25 * np.random.choice([0, 0, 0, 0, 0, 1], p=[0.9, 0.02, 0.02, 0.02, 0.02, 0.02])
        price = round(max(cfg["base"] + seasonality + trend + noise + spike, 3.0), 2)
        prices.append(price)

    df = pd.DataFrame({"arrival_date": dates.strftime("%Y-%m-%d"), "modal_price": prices})
    out_path = DATA_DIR / f"{crop}_prices.csv"
    df.to_csv(out_path, index=False)
    print(f"✅ Generated {crop} price data ({days} days) → {out_path}")
    return out_path


def generate_decision_dataset(rows: int = 2000) -> Path:
    """Generates labeled training data for the Sell-Decision classifier."""
    np.random.seed(42)

    current_prices = np.random.uniform(10.0, 80.0, rows)
    price_deltas = np.random.uniform(-0.20, 0.30, rows)
    predicted_prices = current_prices * (1.0 + price_deltas)
    volatility = np.random.uniform(0.01, 0.25, rows)
    storage_capacity = np.random.choice([0.0, 200.0, 500.0, 1000.0, 5000.0], rows)
    quantity = np.random.uniform(100.0, 3000.0, rows)
    days_harvest = np.random.randint(0, 21, rows)
    dist_buyer = np.random.uniform(2.0, 120.0, rows)
    rain_prob = np.random.uniform(0.0, 100.0, rows)
    demand_score = np.random.uniform(0.1, 1.0, rows)

    labels = []
    for i in range(rows):
        delta = price_deltas[i]
        can_store = storage_capacity[i] >= quantity[i]
        if rain_prob[i] > 60 and not can_store:
            labels.append("SELL_NOW")
        elif delta >= 0.10 and can_store and demand_score[i] < 0.5:
            labels.append("STORE")
        elif delta >= 0.08 and not can_store:
            labels.append("AGGREGATE")
        elif delta <= -0.05 or (days_harvest[i] > 14 and not can_store):
            labels.append("SELL_NOW")
        elif demand_score[i] > 0.75 and delta >= 0.0:
            labels.append("SELL_NOW")
        else:
            labels.append("WAIT")

    df = pd.DataFrame({
        "current_price": np.round(current_prices, 2),
        "predicted_price_7d": np.round(predicted_prices, 2),
        "price_volatility_30d": np.round(volatility, 4),
        "storage_capacity_kg": storage_capacity,
        "quantity_kg": np.round(quantity, 1),
        "days_since_harvest": days_harvest,
        "distance_to_nearest_buyer_km": np.round(dist_buyer, 1),
        "rain_probability_pct": np.round(rain_prob, 1),
        "demand_score": np.round(demand_score, 3),
        "label": labels,
    })

    out_path = DATA_DIR / "decision_training_set.csv"
    df.to_csv(out_path, index=False)
    print(f"✅ Generated decision dataset ({rows} rows) → {out_path}")
    print(f"   Label distribution:\n{df['label'].value_counts()}")
    return out_path


if __name__ == "__main__":
    print("📊 Generating sample datasets for KisanSetu ML training...\n")
    for crop in CROP_CONFIG:
        generate_price_data(crop, days=730)
    generate_decision_dataset(rows=2000)
    print("\nAll done. Run train_price_model.py and train_decision_model.py next.")
