"""
Smart Logistics Service — calculates transport distances, estimated freight costs, and collection route details.
"""
from __future__ import annotations

import math

from app.services.data_ingestion.routing_client import get_route_between_places

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


def _freight_breakdown(
    origin: str,
    destination: str,
    distance_km: float,
    duration_hours: float,
    quantity_kg: float,
    is_fpo_pooled: bool,
    data_source: str,
) -> dict:
    """Shared cost math for both the real-route and straight-line-estimate paths, so
    the two only ever differ in how distance_km/duration_hours were obtained."""
    quantity_tonnes = quantity_kg / 1000.0
    # FPO aggregation discount: sharing a truck reduces transport cost per kg by 35%
    discount_factor = 0.65 if is_fpo_pooled else 1.0

    total_transport_cost = distance_km * max(quantity_tonnes, 0.5) * DEFAULT_FREIGHT_RATE_PER_TONNE_KM * discount_factor
    transport_cost_per_kg = round(total_transport_cost / max(quantity_kg, 1.0), 2)

    return {
        "origin": origin,
        "destination": destination,
        "distance_km": distance_km,
        "quantity_kg": quantity_kg,
        "is_fpo_pooled": is_fpo_pooled,
        "transport_cost_per_kg": transport_cost_per_kg,
        "total_transport_cost": round(total_transport_cost, 2),
        "estimated_transit_hours": round(duration_hours, 1),
        "savings_from_fpo_pooling": round(
            (distance_km * max(quantity_tonnes, 0.5) * DEFAULT_FREIGHT_RATE_PER_TONNE_KM * 0.35), 2
        )
        if is_fpo_pooled
        else 0.0,
        "data_source": data_source,
    }


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
    """Fast, synchronous straight-line estimate — no network call. Used where a full
    routed lookup isn't warranted (e.g. the decision engine's internal net-realization
    estimate against a placeholder "district Central Mandi", not a real address)."""
    distance_km = calculate_distance(origin_lat, origin_lon, dest_lat, dest_lon)
    if distance_km < 5.0:
        distance_km = 35.0  # realistic local mandi distance fallback
    duration_hours = distance_km / 40.0 + 1.0
    return _freight_breakdown(
        origin, destination, distance_km, duration_hours, quantity_kg, is_fpo_pooled,
        data_source="estimated (straight-line)",
    )


async def calculate_logistics_live(
    origin: str,
    destination: str,
    quantity_kg: float,
    is_fpo_pooled: bool = False,
) -> dict:
    """The real freight route calculator: geocodes origin/destination via
    OpenRouteService and fetches the actual road distance/duration for a freight
    truck between them. Falls back to the straight-line estimate (clearly labeled via
    `data_source`) only if OpenRouteService is unconfigured, a place can't be
    geocoded, or the routing call fails — never silently mixes real and estimated
    numbers in one result."""
    route = await get_route_between_places(origin, destination)
    if route is not None:
        return _freight_breakdown(
            origin, destination, route["distance_km"], route["duration_hours"],
            quantity_kg, is_fpo_pooled, data_source="OpenRouteService live route",
        )
    return calculate_logistics(origin, destination, quantity_kg, is_fpo_pooled=is_fpo_pooled)
