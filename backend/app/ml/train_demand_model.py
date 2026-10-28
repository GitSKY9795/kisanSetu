"""
Offline training script — XGBoost demand model on real AGMARKNET mandi prices.

Run AFTER downloading history with app/ml/agmarknet_history.py:
    cd backend
    python -m app.ml.train_demand_model

Learns, from every crop x state daily series (plus all-India), whether the smoothed mandi
price over the next 14 days rises (HIGH demand), holds (MEDIUM) or falls (LOW). "Holds"
is a per-crop band: a +-3 % move is noise for tomato but real for wheat.

Evaluated on the most recent 20 % of dates, with nothing the model saw in training
overlapping them, and compared with two simple baselines — always predicting the most common
class, and assuming the last 14 days' trend continues.

Output files (backend/app/ml/models/):
    demand_model.json       — trained XGBoost model (refit on all data after evaluation)
    demand_model_meta.json  — labels, features, per-crop thresholds, test metrics, data range
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix, f1_score
from sklearn.utils.class_weight import compute_sample_weight

from app.ml.demand_features import (
    ALL_INDIA, COMMODITY_NAMES, FEATURES, HORIZON_DAYS, forward_change, load_history, series_features,
)

MODEL_DIR = Path(__file__).resolve().parent / "models"
MODEL_PATH = MODEL_DIR / "demand_model.json"
META_PATH = MODEL_DIR / "demand_model_meta.json"
LABELS = ["LOW", "MEDIUM", "HIGH"]
MIN_ROWS_PER_SERIES = 120  # states that report too rarely give no usable trend


def _threshold(changes: pd.Series) -> float:
    """Half a standard deviation of the crop's 14-day moves, kept between 2 % and 10 %."""
    return float(np.clip(0.5 * changes.std(), 0.02, 0.10))


def _label(change: pd.Series, threshold: float) -> pd.Series:
    return pd.Series(np.where(change > threshold, 2, np.where(change < -threshold, 0, 1)), index=change.index)


def build_dataset() -> tuple[pd.DataFrame, dict[str, float]]:
    frames, thresholds = [], {}
    for crop in COMMODITY_NAMES:
        history = load_history(crop)
        if history is None:
            print(f"   {crop:<8} no history — skipped")
            continue
        series = []
        for state in history["state"].unique():
            f = series_features(history, crop, state)
            if f is None:
                continue
            f["target_change"] = forward_change(f)
            f = f.dropna(subset=FEATURES + ["target_change"])
            if len(f) >= MIN_ROWS_PER_SERIES:
                f["crop"], f["state"] = crop, state
                series.append(f)
        if not series:
            print(f"   {crop:<8} not enough continuous data — skipped")
            continue
        crop_rows = pd.concat(series)
        thresholds[crop] = _threshold(crop_rows["target_change"])
        crop_rows["label"] = _label(crop_rows["target_change"], thresholds[crop])
        frames.append(crop_rows)
        print(f"   {crop:<8} {len(series):>2} series  {len(crop_rows):>6} rows  "
              f"band +-{thresholds[crop] * 100:.1f} %")
    if not frames:
        raise SystemExit("No usable history. Run `python -m app.ml.agmarknet_history` first.")
    data = pd.concat(frames)
    data.index.name = "date"
    return data.reset_index(), thresholds


def _model():
    import xgboost as xgb

    return xgb.XGBClassifier(
        n_estimators=150,       # kept small: ~16k rows from about a year of data
        max_depth=3,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        min_child_weight=20,
        objective="multi:softprob",
        num_class=len(LABELS),
        eval_metric="mlogloss",
        random_state=42,
    )


def train() -> None:
    print("Building dataset from data/agmarknet/ ...")
    data, thresholds = build_dataset()
    print(f"   {len(data)} rows, {data['date'].min().date()} to {data['date'].max().date()}")
    print("   Distribution:", {LABELS[k]: int(v) for k, v in data["label"].value_counts().sort_index().items()})

    # Time-based split: test on the latest 20 % of dates. Training labels look 14 days
    # ahead, so the 14 days before the cutoff are left out to stop them peeking into the test period.
    dates = np.sort(data["date"].unique())
    cutoff = pd.Timestamp(dates[int(len(dates) * 0.8)])
    train_end = cutoff - pd.DateOffset(days=HORIZON_DAYS)
    train_rows = data[data["date"] < train_end]
    test_rows = data[data["date"] >= cutoff]
    print(f"   Train: {len(train_rows)} rows before {train_end.date()}  |  "
          f"Test: {len(test_rows)} rows from {cutoff.date()}")

    model = _model()
    model.fit(train_rows[FEATURES], train_rows["label"],
              sample_weight=compute_sample_weight("balanced", train_rows["label"]), verbose=False)
    preds = model.predict(test_rows[FEATURES])
    y_test = test_rows["label"].to_numpy()

    majority = int(train_rows["label"].mode()[0])
    momentum = np.array([
        2 if r > thresholds[c] else 0 if r < -thresholds[c] else 1
        for r, c in zip(test_rows["ret_14d"], test_rows["crop"])
    ])
    scores = {
        "model": (accuracy_score(y_test, preds), f1_score(y_test, preds, average="macro")),
        "baseline_majority": (accuracy_score(y_test, np.full_like(y_test, majority)),
                              f1_score(y_test, np.full_like(y_test, majority), average="macro")),
        "baseline_trend_continues": (accuracy_score(y_test, momentum), f1_score(y_test, momentum, average="macro")),
    }

    print("\nTest set (latest 20 % of dates):")
    print(classification_report(y_test, preds, labels=[0, 1, 2], target_names=LABELS, zero_division=0))
    print(pd.DataFrame(confusion_matrix(y_test, preds, labels=[0, 1, 2]), index=LABELS, columns=LABELS))
    print()
    for name, (acc, f1) in scores.items():
        print(f"   {name:<26} accuracy {acc * 100:5.1f} %   macro-F1 {f1:.3f}")
    per_crop = {
        crop: round(float(accuracy_score(group["label"], preds[test_rows["crop"].to_numpy() == crop])), 3)
        for crop, group in test_rows.groupby("crop")
    }
    print("   Per-crop accuracy:", {k: f"{v * 100:.0f} %" for k, v in per_crop.items()})

    # Refit on everything (the most recent months matter most for live use) and save.
    final = _model()
    final.fit(data[FEATURES], data["label"],
              sample_weight=compute_sample_weight("balanced", data["label"]), verbose=False)
    MODEL_DIR.mkdir(exist_ok=True)
    final.save_model(str(MODEL_PATH))
    importance = dict(sorted(zip(FEATURES, (round(float(v), 4) for v in final.feature_importances_)),
                             key=lambda kv: -kv[1]))
    print("\nFeature importance:", importance)

    meta = {
        "engine": "XGBoost",
        "source": "AGMARKNET (data.gov.in) daily mandi prices",
        "labels": LABELS,
        "features": FEATURES,
        "horizon_days": HORIZON_DAYS,
        "thresholds": {k: round(v, 4) for k, v in thresholds.items()},
        "trained_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "data_from": str(data["date"].min().date()),
        "data_to": str(data["date"].max().date()),
        "n_rows": int(len(data)),
        "test_from": str(cutoff.date()),
        "test_metrics": {k: {"accuracy": round(a, 3), "macro_f1": round(f, 3)} for k, (a, f) in scores.items()},
        "test_accuracy_per_crop": per_crop,
        "feature_importance": importance,
    }
    META_PATH.write_text(json.dumps(meta, indent=2))
    print(f"\nSaved {MODEL_PATH.name} and {META_PATH.name} to {MODEL_DIR}/")


if __name__ == "__main__":
    train()
