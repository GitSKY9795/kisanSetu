"""
Smart Logistics, WDRA Cold Storage & e-NWR Pledge Financing API Routes.
Directly addresses Problem Statement: "storage options ... distress selling due to liquidity constraints".
"""
from fastapi import APIRouter, Query
from pydantic import BaseModel

from app.services.logistics_service import calculate_logistics
from app.services.storage_service import evaluate_storage_option

router = APIRouter(prefix="/logistics", tags=["logistics"])

WAREHOUSES_DIRECTORY = [
    {
        "id": "wh-01",
        "name": "Central Warehousing Corporation (CWC) Agro Hub",
        "type": "WDRA Accredited Cold Storage",
        "district": "Ujjain",
        "state": "Madhya Pradesh",
        "distance_km": 14.2,
        "total_capacity_mt": 5000,
        "available_capacity_mt": 1850,
        "occupancy_pct": 63,
        "daily_rate_per_quintal_inr": 0.45,
        "temperature_celsius": "2°C to 6°C",
        "suitable_crops": ["Potato", "Onion", "Tomato", "Wheat", "Soybean"],
        "wdra_accredited": True,
        "enwr_loan_enabled": True,
        "contact_phone": "+91 98260 11223",
        "insurance_covered": True,
    },
    {
        "id": "wh-02",
        "name": "Indore Agri-Logistics & Multi-Chamber Cold Chain",
        "type": "Multi-Temperature Controlled Facility",
        "district": "Indore",
        "state": "Madhya Pradesh",
        "distance_km": 48.0,
        "total_capacity_mt": 10000,
        "available_capacity_mt": 4200,
        "occupancy_pct": 58,
        "daily_rate_per_quintal_inr": 0.55,
        "temperature_celsius": "0°C to 10°C (Controlled Atmosphere)",
        "suitable_crops": ["Onion", "Tomato", "Fruits", "Vegetables"],
        "wdra_accredited": True,
        "enwr_loan_enabled": True,
        "contact_phone": "+91 94250 88991",
        "insurance_covered": True,
    },
    {
        "id": "wh-03",
        "name": "Dewas State Warehousing Corporation Dry Silos",
        "type": "Scientific Grain Storage Silos",
        "district": "Dewas",
        "state": "Madhya Pradesh",
        "distance_km": 36.5,
        "total_capacity_mt": 8000,
        "available_capacity_mt": 2900,
        "occupancy_pct": 64,
        "daily_rate_per_quintal_inr": 0.35,
        "temperature_celsius": "Ambient / Aerated",
        "suitable_crops": ["Wheat", "Soybean", "Maize", "Paddy", "Cotton"],
        "wdra_accredited": True,
        "enwr_loan_enabled": True,
        "contact_phone": "+91 97555 44321",
        "insurance_covered": True,
    },
    {
        "id": "wh-04",
        "name": "Ratlam Krishak Samriddhi Cold Storage",
        "type": "FPO Owned Cold Storage Hub",
        "district": "Ratlam",
        "state": "Madhya Pradesh",
        "distance_km": 82.0,
        "total_capacity_mt": 3500,
        "available_capacity_mt": 800,
        "occupancy_pct": 77,
        "daily_rate_per_quintal_inr": 0.40,
        "temperature_celsius": "2°C to 8°C",
        "suitable_crops": ["Garlic", "Onion", "Spices", "Wheat"],
        "wdra_accredited": True,
        "enwr_loan_enabled": True,
        "contact_phone": "+91 98930 77112",
        "insurance_covered": True,
    }
]


class LogisticsRequest(BaseModel):
    origin_district: str = "Ujjain"
    destination_district: str = "Indore"
    quantity_kg: float = 1000.0
    is_fpo_pooled: bool = False


class StorageRequest(BaseModel):
    crop_name: str = "Wheat"
    current_price_per_kg: float = 24.50
    predicted_future_price_per_kg: float = 27.00
    quantity_kg: float = 1000.0
    storage_days: int = 14


class PledgeLoanRequest(BaseModel):
    crop_name: str = "Wheat"
    quantity_quintals: float = 50.0
    current_mandi_price_per_quintal: float = 2450.0
    tenure_months: int = 3


@router.get("/warehouses")
def list_warehouses(district: str | None = None, crop: str | None = None):
    """List verified WDRA warehouses and cold storages with capacity & rates."""
    results = WAREHOUSES_DIRECTORY
    if district and district.lower() != "all":
        results = [w for w in results if w["district"].lower() == district.lower()]
    return {"count": len(results), "warehouses": results}


@router.post("/pledge-loan")
def calculate_pledge_loan(req: PledgeLoanRequest):
    """
    Calculates e-NWR (Electronic Negotiable Warehouse Receipt) Post-Harvest Pledge Loan.
    Enables farmers to receive 70% immediate liquidity without distress selling!
    """
    total_commodity_value = round(req.quantity_quintals * req.current_mandi_price_per_quintal, 2)
    max_loan_eligible = round(total_commodity_value * 0.70, 2)  # 70% LTV standard RBI/NABARD norm
    interest_rate_pct = 7.0  # Subsidized agri post-harvest interest rate
    monthly_interest = round((max_loan_eligible * (interest_rate_pct / 100)) / 12, 2)
    total_interest = round(monthly_interest * req.tenure_months, 2)

    return {
        "crop_name": req.crop_name,
        "quantity_quintals": req.quantity_quintals,
        "estimated_commodity_value_inr": total_commodity_value,
        "eligible_pledge_loan_inr": max_loan_eligible,
        "loan_to_value_ltv_pct": 70.0,
        "subsidized_interest_rate_pct": interest_rate_pct,
        "tenure_months": req.tenure_months,
        "monthly_interest_inr": monthly_interest,
        "total_interest_inr": total_interest,
        "disbursement_timeline": "Instant UPI / Direct Bank Transfer upon warehouse deposit",
        "participating_banks": ["State Bank of India", "NABARD", "Bank of Baroda", "HDFC Rural"],
    }


@router.post("/calculate-transport")
def get_transport_estimation(req: LogisticsRequest):
    """Calculate transport distance, freight charges per kg, and delivery timeframe."""
    return calculate_logistics(
        origin=req.origin_district,
        destination=req.destination_district,
        quantity_kg=req.quantity_kg,
        is_fpo_pooled=req.is_fpo_pooled,
    )


@router.post("/evaluate-storage")
def compare_storage_option(req: StorageRequest):
    """Compare SELL NOW vs STORE & SELL LATER net returns."""
    return evaluate_storage_option(
        crop_name=req.crop_name,
        current_price_per_kg=req.current_price_per_kg,
        predicted_future_price_per_kg=req.predicted_future_price_per_kg,
        quantity_kg=req.quantity_kg,
        storage_days=req.storage_days,
    )
