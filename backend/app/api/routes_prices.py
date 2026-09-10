from fastapi import APIRouter, HTTPException, Query
from app.services.data_ingestion.agmarknet_client import fetch_mandi_prices
from app.services.price_forecast_service import forecast_price

router = APIRouter(prefix="/prices", tags=["prices"])

# Reference mandi network for spatial price discovery & arbitrage
MANDI_NETWORK = {
    "wheat": [
        {"market": "Ujjain APMC", "district": "Ujjain", "state": "Madhya Pradesh", "distance_km": 12.0, "modal_price_offset": 0, "cess_pct": 1.5},
        {"market": "Indore Mandi (Choithram)", "district": "Indore", "state": "Madhya Pradesh", "distance_km": 54.0, "modal_price_offset": 90, "cess_pct": 1.5},
        {"market": "Dewas Krishi Upaj Mandi", "district": "Dewas", "state": "Madhya Pradesh", "distance_km": 38.0, "modal_price_offset": 35, "cess_pct": 1.5},
        {"market": "Shajapur Mandi", "district": "Shajapur", "state": "Madhya Pradesh", "distance_km": 68.0, "modal_price_offset": -25, "cess_pct": 1.5},
        {"market": "Ratlam Anaj Mandi", "district": "Ratlam", "state": "Madhya Pradesh", "distance_km": 88.0, "modal_price_offset": 120, "cess_pct": 1.5},
    ],
    "onion": [
        {"market": "Lasalgaon APMC", "district": "Nashik", "state": "Maharashtra", "distance_km": 18.0, "modal_price_offset": 0, "cess_pct": 1.0},
        {"market": "Pimpalgaon Mandi", "district": "Nashik", "state": "Maharashtra", "distance_km": 32.0, "modal_price_offset": 45, "cess_pct": 1.0},
        {"market": "Vashi APMC (Navi Mumbai)", "district": "Thane", "state": "Maharashtra", "distance_km": 185.0, "modal_price_offset": 280, "cess_pct": 1.2},
        {"market": "Pune Gultekdi Market", "district": "Pune", "state": "Maharashtra", "distance_km": 140.0, "modal_price_offset": 190, "cess_pct": 1.0},
        {"market": "Ahmednagar Mandi", "district": "Ahmednagar", "state": "Maharashtra", "distance_km": 75.0, "modal_price_offset": 60, "cess_pct": 1.0},
    ],
    "potato": [
        {"market": "Agra APMC", "district": "Agra", "state": "Uttar Pradesh", "distance_km": 15.0, "modal_price_offset": 0, "cess_pct": 2.0},
        {"market": "Hathras Mandi", "district": "Hathras", "state": "Uttar Pradesh", "distance_km": 35.0, "modal_price_offset": 30, "cess_pct": 2.0},
        {"market": "Aligarh Market Yard", "district": "Aligarh", "state": "Uttar Pradesh", "distance_km": 72.0, "modal_price_offset": 65, "cess_pct": 2.0},
        {"market": "Farrukhabad Mandi", "district": "Farrukhabad", "state": "Uttar Pradesh", "distance_km": 130.0, "modal_price_offset": 110, "cess_pct": 2.0},
        {"market": "Kanpur Mandi", "district": "Kanpur", "state": "Uttar Pradesh", "distance_km": 160.0, "modal_price_offset": 150, "cess_pct": 2.0},
    ],
    "cotton": [
        {"market": "Rajkot APMC", "district": "Rajkot", "state": "Gujarat", "distance_km": 20.0, "modal_price_offset": 0, "cess_pct": 1.0},
        {"market": "Gondal Marketing Yard", "district": "Rajkot", "state": "Gujarat", "distance_km": 42.0, "modal_price_offset": 80, "cess_pct": 1.0},
        {"market": "Amreli APMC", "district": "Amreli", "state": "Gujarat", "distance_km": 95.0, "modal_price_offset": 140, "cess_pct": 1.0},
        {"market": "Kadi Cotton Yard", "district": "Mehsana", "state": "Gujarat", "distance_km": 180.0, "modal_price_offset": 210, "cess_pct": 1.0},
        {"market": "Surendranagar Mandi", "district": "Surendranagar", "state": "Gujarat", "distance_km": 85.0, "modal_price_offset": 50, "cess_pct": 1.0},
    ],
    "soybean": [
        {"market": "Indore Main Mandi", "district": "Indore", "state": "Madhya Pradesh", "distance_km": 15.0, "modal_price_offset": 0, "cess_pct": 1.5},
        {"market": "Ujjain Mandi", "district": "Ujjain", "state": "Madhya Pradesh", "distance_km": 55.0, "modal_price_offset": 40, "cess_pct": 1.5},
        {"market": "Neemuch Mandi", "district": "Neemuch", "state": "Madhya Pradesh", "distance_km": 160.0, "modal_price_offset": 130, "cess_pct": 1.5},
        {"market": "Dewas Mandi", "district": "Dewas", "state": "Madhya Pradesh", "distance_km": 35.0, "modal_price_offset": 20, "cess_pct": 1.5},
        {"market": "Latur APMC", "district": "Latur", "state": "Maharashtra", "distance_km": 280.0, "modal_price_offset": 220, "cess_pct": 1.2},
    ],
    "tomato": [
        {"market": "Kolar APMC", "district": "Kolar", "state": "Karnataka", "distance_km": 14.0, "modal_price_offset": 0, "cess_pct": 1.0},
        {"market": "Chintamani Mandi", "district": "Chikkaballapur", "state": "Karnataka", "distance_km": 40.0, "modal_price_offset": 30, "cess_pct": 1.0},
        {"market": "Bangalore Yeshwanthpur", "district": "Bangalore", "state": "Karnataka", "distance_km": 72.0, "modal_price_offset": 120, "cess_pct": 1.0},
        {"market": "Madanapalle APMC", "district": "Annamayya", "state": "Andhra Pradesh", "distance_km": 65.0, "modal_price_offset": 85, "cess_pct": 1.0},
        {"market": "Hosur Mandi", "district": "Krishnagiri", "state": "Tamil Nadu", "distance_km": 90.0, "modal_price_offset": 140, "cess_pct": 1.0},
    ],
    "maize": [
        {"market": "Davangere APMC", "district": "Davangere", "state": "Karnataka", "distance_km": 16.0, "modal_price_offset": 0, "cess_pct": 1.0},
        {"market": "Ranebennur Mandi", "district": "Haveri", "state": "Karnataka", "distance_km": 38.0, "modal_price_offset": 35, "cess_pct": 1.0},
        {"market": "Shimoga Market", "district": "Shimoga", "state": "Karnataka", "distance_km": 70.0, "modal_price_offset": 50, "cess_pct": 1.0},
        {"market": "Bellary APMC", "district": "Bellary", "state": "Karnataka", "distance_km": 120.0, "modal_price_offset": 90, "cess_pct": 1.0},
        {"market": "Hubli APMC", "district": "Dharwad", "state": "Karnataka", "distance_km": 145.0, "modal_price_offset": 110, "cess_pct": 1.0},
    ],
}


@router.get("/{crop}")
async def get_current_and_forecast_price(
    crop: str, state: str | None = None, district: str | None = None
):
    records = await fetch_mandi_prices(crop, state=state, district=district, limit=1)
    if not records:
        raise HTTPException(status_code=404, detail=f"No price data found for {crop}")

    latest = records[0]
    current_price = float(latest.get("modal_price", 0))
    predicted_7d = forecast_price(crop, current_price, horizon_days=7)
    predicted_15d = forecast_price(crop, current_price, horizon_days=15)
    predicted_30d = forecast_price(crop, current_price, horizon_days=30)

    return {
        "crop": crop,
        "market": latest.get("market"),
        "current_price_per_quintal": current_price,
        "predicted_price_per_quintal_7d": predicted_7d,
        "predicted_price_per_quintal_15d": predicted_15d,
        "predicted_price_per_quintal_30d": predicted_30d,
        "arrival_date": latest.get("arrival_date"),
        "min_price": latest.get("min_price", current_price * 0.92),
        "max_price": latest.get("max_price", current_price * 1.08),
    }


@router.get("/{crop}/nearby-mandis")
async def get_nearby_mandi_arbitrage(
    crop: str,
    quantity_quintals: float = Query(5.0, description="Quantity in quintals (1 quintal = 100 kg)"),
    transport_rate_per_km_quintal: float = Query(0.85, description="Freight cost INR per km per quintal")
):
    """
    Calculates spatial price discovery and net realization arbitrage across nearby APMC Mandis.
    Solves farmer information asymmetry on transport cost vs gross price trade-off.
    """
    clean_crop = crop.strip().lower()
    records = await fetch_mandi_prices(clean_crop, limit=1)
    base_price = float(records[0].get("modal_price", 2400)) if records else 2400.0

    network = MANDI_NETWORK.get(clean_crop, MANDI_NETWORK["wheat"])
    mandis_ranked = []

    for item in network:
        gross_price_quintal = round(base_price + item["modal_price_offset"], 2)
        transport_cost_quintal = round(item["distance_km"] * transport_rate_per_km_quintal, 2)
        mandi_cess_quintal = round(gross_price_quintal * (item["cess_pct"] / 100), 2)
        loading_unloading_quintal = 25.0  # Fixed standard mandi handling charge
        
        total_cost_quintal = round(transport_cost_quintal + mandi_cess_quintal + loading_unloading_quintal, 2)
        net_realization_quintal = round(gross_price_quintal - total_cost_quintal, 2)
        net_realization_per_kg = round(net_realization_quintal / 100, 2)
        total_payout = round(net_realization_quintal * quantity_quintals, 2)

        mandis_ranked.append({
            "market_name": item["market"],
            "district": item["district"],
            "state": item["state"],
            "distance_km": item["distance_km"],
            "gross_price_per_quintal": gross_price_quintal,
            "transport_cost_per_quintal": transport_cost_quintal,
            "mandi_cess_per_quintal": mandi_cess_quintal,
            "handling_charge_per_quintal": loading_unloading_quintal,
            "total_deductions_per_quintal": total_cost_quintal,
            "net_realization_per_quintal": net_realization_quintal,
            "net_realization_per_kg": net_realization_per_kg,
            "total_net_payout_inr": total_payout,
            "is_best_payout": False,
        })

    # Sort descending by net realization
    mandis_ranked.sort(key=lambda x: x["net_realization_per_quintal"], reverse=True)
    if mandis_ranked:
        mandis_ranked[0]["is_best_payout"] = True

    best_mandi = mandis_ranked[0]
    worst_mandi = mandis_ranked[-1]
    arbitrage_gain_per_quintal = round(best_mandi["net_realization_per_quintal"] - worst_mandi["net_realization_per_quintal"], 2)

    return {
        "crop": crop,
        "quantity_quintals": quantity_quintals,
        "best_mandi": best_mandi["market_name"],
        "arbitrage_gain_per_quintal": arbitrage_gain_per_quintal,
        "total_arbitrage_gain_inr": round(arbitrage_gain_per_quintal * quantity_quintals, 2),
        "mandis": mandis_ranked,
    }


@router.get("/{crop}/forecast-multi-horizon")
async def get_multi_horizon_forecast(crop: str):
    """
    Returns multi-horizon price predictions (3d, 7d, 15d, 30d) with confidence intervals
    and arrival volume pressure indicators.
    """
    clean_crop = crop.strip().lower()
    records = await fetch_mandi_prices(clean_crop, limit=1)
    current_price = float(records[0].get("modal_price", 2400)) if records else 2400.0

    p_3d = forecast_price(clean_crop, current_price, horizon_days=3)
    p_7d = forecast_price(clean_crop, current_price, horizon_days=7)
    p_15d = forecast_price(clean_crop, current_price, horizon_days=15)
    p_30d = forecast_price(clean_crop, current_price, horizon_days=30)

    # Volatility bounds & arrival pressure
    forecasts = [
        {"horizon": "Today (Current)", "days": 0, "predicted_price": current_price, "lower_ci": current_price, "upper_ci": current_price, "arrival_pressure": "Normal"},
        {"horizon": "3 Days", "days": 3, "predicted_price": p_3d, "lower_ci": round(p_3d * 0.97, 2), "upper_ci": round(p_3d * 1.03, 2), "arrival_pressure": "Moderate"},
        {"horizon": "7 Days", "days": 7, "predicted_price": p_7d, "lower_ci": round(p_7d * 0.95, 2), "upper_ci": round(p_7d * 1.05, 2), "arrival_pressure": "High Arrivals"},
        {"horizon": "15 Days", "days": 15, "predicted_price": p_15d, "lower_ci": round(p_15d * 0.93, 2), "upper_ci": round(p_15d * 1.07, 2), "arrival_pressure": "Stabilizing"},
        {"horizon": "30 Days", "days": 30, "predicted_price": p_30d, "lower_ci": round(p_30d * 0.90, 2), "upper_ci": round(p_30d * 1.10, 2), "arrival_pressure": "Lean Season Spike"},
    ]

    return {
        "crop": crop,
        "current_price": current_price,
        "trend_direction": "UPWARD" if p_7d >= current_price else "DOWNWARD",
        "optimal_sell_window": "Hold for 30 Days (Lean Season)" if p_30d > current_price * 1.05 else "Sell within 3-7 Days",
        "horizons": forecasts,
    }


@router.get("/{crop}/history")
async def get_price_history(crop: str, state: str | None = None, district: str | None = None):
    records = await fetch_mandi_prices(crop, state=state, district=district, limit=90)
    return {"crop": crop, "records": records}
