"""
Sell-Decision Engine — SELL NOW / WAIT / STORE / AGGREGATE

Design:
  1. Tries to use the trained XGBoost model (app/ml/models/decision_model.json).
  2. If model is not yet trained, falls back to the rule-based engine — so the
     API always returns a valid response even during early development.
  3. Generates per-prediction SHAP explanation so farmers understand WHY the
     recommendation was made, not just what it is.
  4. Returns a standardised dict consumed by routes_decision.py and the agent.
"""
from __future__ import annotations

import json
from pathlib import Path

MODEL_DIR = Path(__file__).resolve().parent.parent / "ml" / "models"
MODEL_PATH = MODEL_DIR / "decision_model.json"
LABELS_PATH = MODEL_DIR / "decision_model_labels.json"
SHAP_PATH = MODEL_DIR / "decision_model_shap_summary.json"

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


# ─────────────────────────── helpers ────────────────────────────────────────

def _load_xgb_model():
    """Load XGBoost model. Returns (None, None) if not yet trained."""
    if not MODEL_PATH.exists() or not LABELS_PATH.exists():
        return None, None
    try:
        import xgboost as xgb

        model = xgb.XGBClassifier()
        model.load_model(str(MODEL_PATH))
        with open(LABELS_PATH) as f:
            labels = json.load(f)
        return model, labels
    except Exception:
        return None, None


def _engineer_features(raw: dict) -> dict:
    """Add derived features — must match train_decision_model.py exactly."""
    current = raw.get("current_price", 0)
    predicted = raw.get("predicted_price_7d", current)
    storage = raw.get("storage_capacity_kg", 0)
    quantity = raw.get("quantity_kg", 0)

    raw["price_change_pct"] = (predicted - current) / max(current, 0.01)
    raw["has_storage"] = int(storage >= quantity)
    raw["expected_gain_per_kg"] = round(predicted - current, 2)
    return raw


def _get_shap_explanation(model, features_dict: dict, labels: list[str]) -> dict[str, float]:
    """Returns per-feature SHAP contribution for the predicted class.

    Normalises across shap/xgboost API versions: multiclass SHAP values come back
    either as a list of one (n_samples, n_features) array per class, or as a single
    (n_samples, n_features, n_classes) ndarray, depending on installed versions.
    """
    try:
        import numpy as np
        import shap
        import pandas as pd

        all_features = FEATURE_COLUMNS + ["price_change_pct", "has_storage", "expected_gain_per_kg"]
        available = [c for c in all_features if c in features_dict]
        X = pd.DataFrame([{c: features_dict.get(c, 0.0) for c in available}])

        explainer = shap.TreeExplainer(model)
        shap_values = explainer.shap_values(X)

        if isinstance(shap_values, list):
            sv_arr = np.stack(shap_values, axis=-1)  # -> (1, features, classes)
        else:
            sv_arr = np.asarray(shap_values)

        if sv_arr.ndim == 3:
            pred_class_idx = int(model.predict(X)[0])
            sv = sv_arr[0, :, pred_class_idx]
        else:
            sv = sv_arr[0]

        return {feat: round(float(val), 4) for feat, val in zip(available, sv)}
    except Exception:
        return {}


def _human_readable_shap(shap_per_feat: dict[str, float]) -> list[str]:
    """Convert SHAP values into plain-English sentences farmers can understand."""
    messages = {
        "price_change_pct": {
            True: "Expected price rise is the key reason to hold your produce.",
            False: "Expected price drop is pushing toward selling now.",
        },
        "has_storage": {
            True: "Available storage is enabling the hold/aggregate option.",
            False: "Lack of storage is limiting your options.",
        },
        "rain_probability_pct": {
            True: "High chance of rain is a risk to stored produce.",
            False: "",
        },
        "demand_score": {
            True: "Good buyer demand in your area supports selling now.",
            False: "Low buyer demand in your area suggests waiting.",
        },
        "days_since_harvest": {
            True: "Crop has been harvested recently — holding is feasible.",
            False: "Crop has been harvested a while ago — selling sooner is safer.",
        },
    }
    explanations = []
    sorted_feats = sorted(shap_per_feat.items(), key=lambda x: abs(x[1]), reverse=True)
    for feat, val in sorted_feats[:4]:
        if feat in messages:
            positive = val > 0
            msg = messages[feat].get(positive, "")
            if msg:
                explanations.append(msg)
    return explanations if explanations else ["Based on current market conditions and farm data."]


# ─────────────────────────── rule-based fallback ─────────────────────────────

def _rule_based_decision(
    current_price: float,
    predicted_price_7d: float,
    storage_capacity_kg: float,
    quantity_kg: float,
    rain_probability_pct: float = 15.0,
    demand_score: float = 0.5,
    days_since_harvest: int = 0,
) -> tuple[str, float, list[str]]:
    """Pure rule-based engine. No ML dependency — always works."""
    price_delta_pct = (predicted_price_7d - current_price) / max(current_price, 0.01)
    can_store = storage_capacity_kg >= quantity_kg

    if rain_probability_pct > 60 and not can_store:
        return (
            "SELL_NOW", 0.85,
            [
                f"Rain probability is high ({rain_probability_pct:.0f}%) and you have no storage.",
                "Selling now protects you from crop spoilage risk.",
            ],
        )

    if demand_score > 0.75 and price_delta_pct >= 0.0:
        return (
            "SELL_NOW", 0.80,
            [
                "Buyer demand in your area is strong right now.",
                "Current price is fair — take advantage of the demand.",
            ],
        )

    if price_delta_pct >= 0.10 and can_store:
        return (
            "STORE", 0.78,
            [
                f"Price is expected to rise by {price_delta_pct*100:.1f}% in 7 days.",
                f"You have enough storage ({storage_capacity_kg:.0f} kg available).",
                "Holding now will earn more per kg after accounting for storage cost.",
            ],
        )

    if price_delta_pct >= 0.08 and not can_store:
        return (
            "AGGREGATE", 0.74,
            [
                f"Price is expected to rise {price_delta_pct*100:.1f}% but your storage is insufficient.",
                "Pooling with your local FPO unlocks shared storage and bulk buyer access.",
                "FPO aggregation also gives you stronger negotiating power.",
            ],
        )

    if price_delta_pct <= -0.05:
        return (
            "SELL_NOW", 0.82,
            [
                f"Price is forecast to fall {abs(price_delta_pct)*100:.1f}% this week.",
                "Selling now secures today's better margin.",
            ],
        )

    if days_since_harvest > 14 and not can_store:
        return (
            "SELL_NOW", 0.70,
            [
                f"Crop harvested {days_since_harvest} days ago — perishability risk is increasing.",
                "Selling now prevents quality deterioration and price penalty.",
            ],
        )

    return (
        "WAIT", 0.62,
        [
            "Market prices are stable with minor expected fluctuation.",
            "Short wait recommended to observe buyer demand trends before committing.",
        ],
    )


# ─────────────────────────── main public API ─────────────────────────────────

def recommend_action(
    crop_name: str,
    current_price_per_kg: float,
    quantity_kg: float,
    storage_capacity_kg: float = 0.0,
    transport_cost_per_kg: float = 0.0,
    storage_cost_per_kg: float = 0.0,
    district: str = "Central",
    days_since_harvest: int = 0,
    demand_score: float = 0.5,
    price_volatility_30d: float = 0.08,
    distance_to_nearest_buyer_km: float = 20.0,
) -> dict:
    """
    Main entry point — called by routes_decision.py and the agent.

    Returns a dict with:
      action, confidence, reasons, shap_feature_contributions,
      net_realization_per_kg, logistics, demand_level,
      weather_condition, and full input echo for traceability.
    """
    from app.services.price_forecast_service import forecast_price
    from app.services.demand_forecast_service import get_demand_forecast
    from app.services.weather_service import get_weather_forecast
    from app.services.net_realization import calculate_net_realization
    from app.services.logistics_service import calculate_logistics

    predicted_price = forecast_price(crop_name, current_price_per_kg, horizon_days=7)
    demand = get_demand_forecast(crop_name, district)
    weather = get_weather_forecast(district=district)
    rain_prob = weather.get("rain_probability_pct", 15.0)
    actual_demand_score = demand.get("demand_score", demand_score)

    features = {
        "current_price": current_price_per_kg,
        "predicted_price_7d": predicted_price,
        "price_volatility_30d": price_volatility_30d,
        "storage_capacity_kg": storage_capacity_kg,
        "quantity_kg": quantity_kg,
        "days_since_harvest": days_since_harvest,
        "distance_to_nearest_buyer_km": distance_to_nearest_buyer_km,
        "rain_probability_pct": rain_prob,
        "demand_score": actual_demand_score,
    }
    features = _engineer_features(features)

    model, labels = _load_xgb_model()
    shap_per_feat = {}

    if model is not None:
        try:
            import pandas as pd
            all_features = FEATURE_COLUMNS + ["price_change_pct", "has_storage", "expected_gain_per_kg"]
            available = [c for c in all_features if c in features]
            X = pd.DataFrame([{c: features.get(c, 0.0) for c in available}])

            proba = model.predict_proba(X)[0]
            pred_idx = proba.argmax()
            action = labels[pred_idx]
            confidence = round(float(proba[pred_idx]), 3)

            shap_per_feat = _get_shap_explanation(model, features, labels)
            reasons = _human_readable_shap(shap_per_feat)
            engine_used = "XGBoost"
        except Exception as e:
            action, confidence, reasons = _rule_based_decision(
                current_price_per_kg, predicted_price, storage_capacity_kg,
                quantity_kg, rain_prob, actual_demand_score, days_since_harvest
            )
            engine_used = f"Rule-based (ML error: {e})"
    else:
        action, confidence, reasons = _rule_based_decision(
            current_price_per_kg, predicted_price, storage_capacity_kg,
            quantity_kg, rain_prob, actual_demand_score, days_since_harvest
        )
        engine_used = "Rule-based (model not yet trained — run train_decision_model.py)"

    sell_price = current_price_per_kg if action == "SELL_NOW" else predicted_price
    storage_cost = storage_cost_per_kg if action in ("STORE", "WAIT") else 0.0
    net_realization = calculate_net_realization(
        selling_price_per_kg=sell_price,
        transport_cost_per_kg=transport_cost_per_kg,
        storage_cost_per_kg=storage_cost,
    )

    logistics = calculate_logistics(
        origin=district,
        destination=f"{district} Central Mandi",
        quantity_kg=quantity_kg,
        is_fpo_pooled=(action == "AGGREGATE"),
    )

    return {
        "action": action,
        "confidence": confidence,
        "engine": engine_used,
        "reasons": reasons,
        "explanation": " ".join(reasons),
        "crop_name": crop_name,
        "quantity_kg": quantity_kg,
        "district": district,
        "current_price_per_kg": current_price_per_kg,
        "predicted_price_per_kg_7d": predicted_price,
        "demand_level": demand.get("demand_level", "Moderate"),
        "weather_condition": weather.get("weather_condition", "Clear"),
        "rain_probability_pct": rain_prob,
        "net_realization_per_kg": net_realization,
        "total_net_realization": round(net_realization * quantity_kg, 2),
        "shap_feature_contributions": shap_per_feat,
        "logistics": logistics,
    }
