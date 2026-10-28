"""
OpenRouteService client — real geocoding + driving-route distance/duration for the
freight cost calculator.

Two real network calls per route: geocode each place name to coordinates, then fetch
the actual road route between them (heavy-goods-vehicle profile, appropriate for
farm-to-mandi freight trucks — not a car). Returns None on any failure (unconfigured
key, place not found, network/API error) rather than raising, so callers can cleanly
fall back to a straight-line estimate instead of the request failing outright —
mirrors the pattern used elsewhere in this app (AGMARKNET, BHASHINI): call the real
provider first, degrade to a clearly-labeled estimate rather than pretending
simulated data is live.
"""
from __future__ import annotations

import httpx

from app.core.config import settings

ORS_GEOCODE_URL = "https://api.openrouteservice.org/geocode/search"
ORS_DIRECTIONS_URL = "https://api.openrouteservice.org/v2/directions/driving-hgv"


def _configured() -> bool:
    return bool(settings.OPENROUTESERVICE_API_KEY)


async def geocode_place(place: str) -> tuple[float, float] | None:
    """Resolves a place name (district, city, mandi hub, ...) to (lat, lon) via ORS's
    geocoder, biased to India. None if unconfigured, not found, or the call fails."""
    if not _configured() or not place or not place.strip():
        return None
    params = {
        "api_key": settings.OPENROUTESERVICE_API_KEY,
        "text": f"{place.strip()}, India",
        "boundary.country": "IN",
        "size": 1,
    }
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(ORS_GEOCODE_URL, params=params)
            resp.raise_for_status()
            features = resp.json().get("features", [])
    except Exception:
        return None
    if not features:
        return None
    lon, lat = features[0]["geometry"]["coordinates"]
    return (lat, lon)


async def get_driving_route(
    origin_lat: float, origin_lon: float, dest_lat: float, dest_lon: float
) -> dict | None:
    """Real driving-route distance (m) and duration (s) between two coordinates via
    ORS Directions. None if unconfigured or the call fails."""
    if not _configured():
        return None
    body = {"coordinates": [[origin_lon, origin_lat], [dest_lon, dest_lat]]}
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.post(
                ORS_DIRECTIONS_URL,
                params={"api_key": settings.OPENROUTESERVICE_API_KEY},
                json=body,
                headers={"Content-Type": "application/json"},
            )
            resp.raise_for_status()
            summary = resp.json()["routes"][0]["summary"]
    except Exception:
        return None
    return {"distance_m": summary["distance"], "duration_s": summary["duration"]}


async def get_route_between_places(origin_place: str, dest_place: str) -> dict | None:
    """End-to-end: geocode both place names, then fetch the real driving route between
    them. None (never raises) if any step fails, so callers can fall back cleanly."""
    origin_coords = await geocode_place(origin_place)
    dest_coords = await geocode_place(dest_place)
    if not origin_coords or not dest_coords:
        return None
    route = await get_driving_route(*origin_coords, *dest_coords)
    if not route:
        return None
    return {
        "distance_km": round(route["distance_m"] / 1000.0, 2),
        "duration_hours": round(route["duration_s"] / 3600.0, 2),
    }
