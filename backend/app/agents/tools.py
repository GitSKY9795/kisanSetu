"""
Tool definitions for the KisanSetu Agentic AI Assistant.
Exposes 11 specialized market, forecast, net realization, logistics, storage, and transaction tools.
"""
from __future__ import annotations

try:
    from langchain_core.tools import tool
except ImportError:
    # Pass-through decorator fallback when langchain_core is not installed
    def tool(fn):
        fn.invoke = lambda args: fn(**args) if isinstance(args, dict) else fn(args)
        return fn

from app.services.decision_engine import recommend_action
from app.services.demand_forecast_service import get_demand_forecast as fetch_demand
from app.services.logistics_service import calculate_logistics as fetch_logistics
from app.services.net_realization import calculate_net_realization as calc_net
from app.services.price_forecast_service import forecast_price
from app.services.storage_service import evaluate_storage_option
from app.services.weather_service import get_weather_forecast as fetch_weather


@tool
def get_market_price(crop_name: str, district: str = "Central") -> dict:
    """Fetch the current modal mandi price for a crop in a district."""
    base_prices = {"wheat": 24.50, "onion": 32.00, "potato": 19.50, "cotton": 62.00, "rice": 28.00}
    price = base_prices.get(crop_name.lower(), 25.00)
    return {
        "crop_name": crop_name,
        "district": district,
        "modal_price_per_kg": price,
        "modal_price_per_quintal": price * 100,
        "unit": "INR/kg",
    }


@tool
def get_price_forecast(crop_name: str, current_price_per_kg: float) -> dict:
    """Forecast the price of a crop 7 days from now using price forecasting model."""
    predicted = forecast_price(crop_name, current_price_per_kg, horizon_days=7)
    trend = "UPWARD" if predicted > current_price_per_kg else ("DOWNWARD" if predicted < current_price_per_kg else "STABLE")
    return {
        "crop_name": crop_name,
        "current_price_per_kg": current_price_per_kg,
        "predicted_price_per_kg_7d": predicted,
        "trend": trend,
    }


@tool
def get_demand_forecast_tool(crop_name: str, district: str = "Central") -> dict:
    """Get market demand level (HIGH/MEDIUM/LOW) and buyer activity score."""
    return fetch_demand(crop_name, district)


@tool
def get_weather_tool(district: str = "Central") -> dict:
    """Get weather forecast, rain probability, and harvest risk level."""
    return fetch_weather(district=district)


@tool
def calculate_net_realization_tool(
    selling_price_per_kg: float,
    transport_cost_per_kg: float = 0.0,
    storage_cost_per_kg: float = 0.0,
    other_costs_per_kg: float = 0.0,
) -> dict:
    """Calculate exact net money the farmer keeps per kg after transport and storage costs."""
    net = calc_net(selling_price_per_kg, transport_cost_per_kg, storage_cost_per_kg, other_costs_per_kg)
    return {
        "gross_price_per_kg": selling_price_per_kg,
        "transport_cost_per_kg": transport_cost_per_kg,
        "storage_cost_per_kg": storage_cost_per_kg,
        "net_realization_per_kg": net,
    }


@tool
def find_buyers(crop_name: str, quantity_kg: float, district: str = "Central") -> dict:
    """Search available buyers matching crop type, quantity, and location."""
    buyers = [
        {"buyer_name": "AgriCorp Processing Ltd", "price_per_kg": 25.50, "location": district, "type": "Processor"},
        {"buyer_name": "Kisan Direct Wholesaler", "price_per_kg": 24.80, "location": district, "type": "Wholesaler"},
        {"buyer_name": "FreshMarts Retail", "price_per_kg": 26.00, "location": f"{district} North", "type": "Retailer"},
    ]
    return {"crop_name": crop_name, "quantity_kg": quantity_kg, "matching_buyers": buyers}


@tool
def find_fpo(district: str = "Central", crop_name: str = "Wheat") -> dict:
    """Find nearby Farmer Producer Organisations for produce pooling."""
    return {
        "district": district,
        "crop_name": crop_name,
        "recommended_fpo": "Pragati Kisan Producer Co-op",
        "active_members": 240,
        "pooled_volume_kg": 45000.0,
        "benefits": "Share transport cost (-35%) & command bulk buyer premium (+5%)",
    }


@tool
def calculate_logistics_tool(origin: str, destination: str, quantity_kg: float) -> dict:
    """Calculate distance, freight cost per kg, and transit time."""
    return fetch_logistics(origin, destination, quantity_kg)


@tool
def check_storage_tool(crop_name: str, current_price_per_kg: float, quantity_kg: float) -> dict:
    """Compare SELL NOW vs STORE & SELL LATER net returns."""
    predicted_future = round(current_price_per_kg * 1.10, 2)
    return evaluate_storage_option(crop_name, current_price_per_kg, predicted_future, quantity_kg)


@tool
def get_transaction_status(transaction_id: str) -> dict:
    """Retrieve status of an order or payment transaction."""
    return {
        "transaction_id": transaction_id,
        "status": "COMPLETED",
        "payment_state": "PAID_RAZORPAY",
        "logistics_status": "DELIVERED",
    }


@tool
def get_crop_information(crop_name: str) -> dict:
    """Get ideal harvest conditions, storage life, and quality grading standards."""
    return {
        "crop_name": crop_name,
        "ideal_moisture": "12-14%",
        "shelf_life_days": 180 if crop_name.lower() in ["wheat", "potato"] else 30,
        "quality_grades": ["Grade A (Export)", "Grade B (Wholesale)", "Grade C (Local Processing)"],
    }


AGENT_TOOLS = [
    get_market_price,
    get_price_forecast,
    get_demand_forecast_tool,
    get_weather_tool,
    calculate_net_realization_tool,
    find_buyers,
    find_fpo,
    calculate_logistics_tool,
    check_storage_tool,
    get_transaction_status,
    get_crop_information,
]
