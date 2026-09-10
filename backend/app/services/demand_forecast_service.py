"""
Demand Forecasting Module for KisanSetu.
Estimates market demand trends (HIGH, MEDIUM, LOW), market arrivals, and volume direction.
"""
from __future__ import annotations

import random

# Reference base demand profiles per crop
CROP_DEMAND_PROFILES = {
    "wheat": {"base_level": "HIGH", "volume_index": 1.35, "trend_direction": "UPWARD"},
    "onion": {"base_level": "MEDIUM", "volume_index": 1.05, "trend_direction": "STABLE"},
    "potato": {"base_level": "HIGH", "volume_index": 1.20, "trend_direction": "UPWARD"},
    "cotton": {"base_level": "MEDIUM", "volume_index": 0.95, "trend_direction": "STABLE"},
    "rice": {"base_level": "HIGH", "volume_index": 1.40, "trend_direction": "UPWARD"},
}


def get_demand_forecast(crop_name: str, district: str = "Default") -> dict:
    crop_key = crop_name.lower().strip()
    profile = CROP_DEMAND_PROFILES.get(
        crop_key, {"base_level": "MEDIUM", "volume_index": 1.0, "trend_direction": "STABLE"}
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
        "summary": f"Market demand for {crop_name} in {district} is currently {profile['base_level']} with an {profile['trend_direction']} trend.",
    }
