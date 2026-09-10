"""
Smart Storage Service — manages storage unit lookup and compares "SELL NOW" vs "STORE -> SELL LATER".
"""
from __future__ import annotations


def evaluate_storage_option(
    crop_name: str,
    current_price_per_kg: float,
    predicted_future_price_per_kg: float,
    quantity_kg: float,
    storage_days: int = 14,
    daily_storage_cost_per_kg: float = 0.5,
    transport_cost_per_kg: float = 1.0,
) -> dict:
    total_storage_cost_per_kg = round(daily_storage_cost_per_kg * storage_days, 2)
    
    # Net realization if sold today
    net_sell_now_per_kg = round(current_price_per_kg - transport_cost_per_kg, 2)
    
    # Net realization if stored and sold later
    net_store_later_per_kg = round(
        predicted_future_price_per_kg - transport_cost_per_kg - total_storage_cost_per_kg, 2
    )

    profit_gain_per_kg = round(net_store_later_per_kg - net_sell_now_per_kg, 2)
    total_profit_gain = round(profit_gain_per_kg * quantity_kg, 2)

    is_storage_recommended = profit_gain_per_kg > 0.50

    return {
        "crop_name": crop_name,
        "quantity_kg": quantity_kg,
        "storage_days": storage_days,
        "current_price_per_kg": current_price_per_kg,
        "predicted_future_price_per_kg": predicted_future_price_per_kg,
        "daily_storage_cost_per_kg": daily_storage_cost_per_kg,
        "total_storage_cost_per_kg": total_storage_cost_per_kg,
        "net_sell_now_per_kg": net_sell_now_per_kg,
        "net_store_later_per_kg": net_store_later_per_kg,
        "profit_gain_per_kg": profit_gain_per_kg,
        "total_profit_gain": total_profit_gain,
        "is_storage_recommended": is_storage_recommended,
        "summary": (
            f"Storing {crop_name} for {storage_days} days costs ₹{total_storage_cost_per_kg}/kg in storage. "
            + (
                f"Expected net gain is +₹{profit_gain_per_kg}/kg (+₹{total_profit_gain} total). Holding produce is RECOMMENDED."
                if is_storage_recommended
                else f"Storage costs exceed price gains. Selling now gives higher immediate net realization."
            )
        ),
    }
