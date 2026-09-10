"""
Smart Logistics Service — calculates transport distances, estimated freight costs, and collection route details.
"""
from __future__ import annotations

import math

DEFAULT_FREIGHT_RATE_PER_TONNE_KM = 3.5  # INR per tonne-km


def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Haversine formula to compute distance in km between two GPS coordinates."""
    R = 6371.0  # Earth radius in kilometers
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 2)


def calculate_logistics(
    origin: str,
    destination: str,
    quantity_kg: float,
    origin_lat: float = 28.61,
    origin_lon: float = 77.20,
    dest_lat: float = 28.99,
    dest_lon: float = 77.70,
    is_fpo_pooled: bool = False,
) -> dict:
    distance_km = calculate_distance(origin_lat, origin_lon, dest_lat, dest_lon)
    if distance_km < 5.0:
        distance_km = 35.0  # realistic local mandi distance fallback

    quantity_tonnes = quantity_kg / 1000.0

    # FPO aggregation discount: sharing a truck reduces transport cost per kg by 35%
    discount_factor = 0.65 if is_fpo_pooled else 1.0

    total_transport_cost = distance_km * max(quantity_tonnes, 0.5) * DEFAULT_FREIGHT_RATE_PER_TONNE_KM * discount_factor
    transport_cost_per_kg = round(total_transport_cost / max(quantity_kg, 1.0), 2)
    estimated_transit_hours = round(distance_km / 40.0 + 1.0, 1)

    return {
        "origin": origin,
        "destination": destination,
        "distance_km": distance_km,
        "quantity_kg": quantity_kg,
        "is_fpo_pooled": is_fpo_pooled,
        "transport_cost_per_kg": transport_cost_per_kg,
        "total_transport_cost": round(total_transport_cost, 2),
        "estimated_transit_hours": estimated_transit_hours,
        "savings_from_fpo_pooling": round(
            (distance_km * max(quantity_tonnes, 0.5) * DEFAULT_FREIGHT_RATE_PER_TONNE_KM * 0.35), 2
        )
        if is_fpo_pooled
        else 0.0,
    }
