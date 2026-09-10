"""
OpenRouteService client — used for route distance/duration estimation.
"""
from app.core.config import settings
from app.services.logistics_service import calculate_distance

ORS_BASE_URL = "https://api.openrouteservice.org/v2"


async def get_route(
    start_lon: float, start_lat: float, end_lon: float, end_lat: float
) -> dict:
    """Returns distance (m) and duration (s) for a driving route between two points."""
    dist_km = calculate_distance(start_lat, start_lon, end_lat, end_lon)
    if dist_km < 5.0:
        dist_km = 35.0

    return {"distance_m": dist_km * 1000.0, "duration_s": (dist_km / 40.0) * 3600.0}


def estimate_transport_cost(distance_km: float, rate_per_km: float = 15.0) -> float:
    return round(distance_km * rate_per_km, 2)
