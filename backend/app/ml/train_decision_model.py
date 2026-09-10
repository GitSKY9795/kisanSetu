"""
Offline training script — XGBoost Sell-Decision classifier.

Run AFTER generate_sample_data.py:
    cd backend
    python -m app.ml.train_decision_model

Output files (all in backend/app/ml/models/):
    decision_model.json              — trained XGBoost model
    decision_model_labels.json       — class names for decoding predictions
    decision_model_shap_summary.json — mean |SHAP| values per feature (for API explainability)
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.model_selection import StratifiedKFold, cross_val_score, train_test_split
from sklearn.preprocessing import LabelEncoder

MODEL_DIR = Path(__file__).resolve().parent / "models"
DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"
MODEL_DIR.mkdir(exist_ok=True)

# These must exactly match generate_sample_data.py and the decision_engine feature vector
FEATURE_COLUMNS = [
    "current_price",
    "predicted_price_7d",
    "price_volatility_30d",
    "storage_capacity_kg",
    "quantity_kg",
    "days_since_harvest",
    "distance_to_nearest_buyer_km",
    "rain_probability_pct",
    "demand_score",
]
LABEL_COLUMN = "label"


def _engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """Add derived features that help the model reason better."""
    df = df.copy()
    df["price_change_pct"] = (df["predicted_price_7d"] - df["current_price"]) / df["current_price"].clip(lower=0.01)
    df["has_storage"] = (df["storage_capacity_kg"] >= df["quantity_kg"]).astype(int)
    df["expected_gain_per_kg"] = df["predicted_price_7d"] - df["current_price"]
    return df


def train(csv_path: str | None = None) -> None:
    path = csv_path or str(DATA_DIR / "decision_training_set.csv")
    print(f"📂 Loading decision training data from: {path}")

    df = pd.read_csv(path)
    df = _engineer_features(df)

    all_features = FEATURE_COLUMNS + ["price_change_pct", "has_storage", "expected_gain_per_kg"]
    available = [c for c in all_features if c in df.columns]

    X = df[available]
    y_raw = df[LABEL_COLUMN]

    encoder = LabelEncoder()
    y = encoder.fit_transform(y_raw)
    class_names = list(encoder.classes_)
    print(f"   Classes: {class_names}")
    print(f"   Distribution:\n{y_raw.value_counts().to_string()}")

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )

    # --- Train XGBoost ---
    try:
        import xgboost as xgb

        model = xgb.XGBClassifier(
            n_estimators=300,
            max_depth=5,
            learning_rate=0.04,
            subsample=0.85,
            colsample_bytree=0.85,
            objective="multi:softprob",
            num_class=len(class_names),
            eval_metric="mlogloss",
            random_state=42,
        )
        model.fit(
            X_train, y_train,
            eval_set=[(X_test, y_test)],
            verbose=False,
        )
        model.save_model(str(MODEL_DIR / "decision_model.json"))
        engine = "XGBoost"
        feature_importances = model.feature_importances_

    except ImportError:
        from sklearn.ensemble import GradientBoostingClassifier
        model = GradientBoostingClassifier(n_estimators=200, max_depth=5, random_state=42)
        model.fit(X_train, y_train)
        feature_importances = model.feature_importances_
        engine = "GradientBoosting (XGBoost not installed)"
        import joblib
        joblib.dump(model, str(MODEL_DIR / "decision_model_sklearn.pkl"))

    print(f"\n✅ Trained with {engine}")

    # --- Test set evaluation ---
    preds = model.predict(X_test)
    print("\n📊 Classification Report (Test Set):")
    print(classification_report(y_test, preds, target_names=class_names))

    print("📊 Confusion Matrix:")
    cm = confusion_matrix(y_test, preds)
    print(pd.DataFrame(cm, index=class_names, columns=class_names))

    # --- 5-Fold Cross-Validation ---
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    cv_scores = cross_val_score(model, X, y, cv=cv, scoring="accuracy")
    print(f"\n🔁 5-Fold CV Accuracy: {cv_scores.mean()*100:.1f}% ± {cv_scores.std()*100:.1f}%")

    # --- SHAP explainability ---
    # NOTE: different shap/xgboost version combos return multiclass SHAP values in
    # different shapes — either a list of one (n_samples, n_features) array per class
    # (older API) or a single (n_samples, n_features, n_classes) ndarray (newer API).
    # We normalise to the 3D shape before reducing, so this works either way.
    shap_data = {"engine": engine, "feature_names": available, "mean_abs_shap": []}
    try:
        import shap
        print("\n🔍 Computing SHAP values (this takes ~20s)...")
        explainer = shap.TreeExplainer(model)
        shap_values = explainer.shap_values(X_test)

        if isinstance(shap_values, list):
            sv_arr = np.stack(shap_values, axis=-1)  # -> (samples, features, classes)
        else:
            sv_arr = np.asarray(shap_values)

        if sv_arr.ndim == 3:
            mean_abs = np.abs(sv_arr).mean(axis=0).mean(axis=-1)  # avg over samples, then classes
        else:
            mean_abs = np.abs(sv_arr).mean(axis=0)  # binary case: (samples, features)

        shap_data["mean_abs_shap"] = [round(float(v), 6) for v in mean_abs]

        print("📌 Feature importance (SHAP):")
        for feat, val in sorted(zip(available, mean_abs), key=lambda x: -x[1]):
            print(f"   {feat:<40} {val:.4f}")

    except Exception as e:
        print(f"⚠️  SHAP skipped: {e} — using feature_importances_ as proxy")
        shap_data["mean_abs_shap"] = [round(float(v), 6) for v in feature_importances]

    with open(MODEL_DIR / "decision_model_shap_summary.json", "w") as f:
        json.dump(shap_data, f, indent=2)

    with open(MODEL_DIR / "decision_model_labels.json", "w") as f:
        json.dump(class_names, f)

    print(f"\n✅ Saved all artifacts to {MODEL_DIR}/")


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--csv", default=None)
    args = parser.parse_args()
    train(args.csv)
