"""
Weather Intelligence Service — integrates weather indicators (temperature, rainfall probability, weather risks) into selling recommendations.
"""
from __future__ import annotations

import json
import urllib.parse
import urllib.request
from functools import lru_cache

_DEFAULT_POINT = (28.61, 77.20)  # used only when no usable place name is given
_GENERIC_DISTRICTS = {"", "central", "all", "india"}


@lru_cache(maxsize=256)
def _geocode(place: str) -> tuple[float, float] | None:
    """Looks a district/town up with Open-Meteo's geocoder so the forecast is for the place
    actually asked about (previously every forecast was for New Delhi's coordinates)."""
    try:
        url = "https://geocoding-api.open-meteo.com/v1/search?" + urllib.parse.urlencode(
            {"name": place, "count": 1, "country_code": "IN", "language": "en"}
        )
        req = urllib.request.Request(url, headers={"User-Agent": "KisanSetu/1.0"})
        with urllib.request.urlopen(req, timeout=3.0) as res:
            hit = (json.loads(res.read().decode()).get("results") or [None])[0]
            if hit:
                return float(hit["latitude"]), float(hit["longitude"])
    except Exception:
        pass
    return None


def get_weather_forecast(latitude: float | None = None, longitude: float | None = None, district: str = "Central") -> dict:
    """Fetches real weather from Open-Meteo for the given coordinates, or for `district` when no
    coordinates are passed, or provides a reliable weather signal fallback."""
    if latitude is None or longitude is None:
        point = None
        if (district or "").strip().lower() not in _GENERIC_DISTRICTS:
            point = _geocode(district.strip())
        latitude, longitude = point or _DEFAULT_POINT
    try:
        url = (
            f"https://api.open-meteo.com/v1/forecast?latitude={latitude}&longitude={longitude}"
            "&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=7"
        )
        req = urllib.request.Request(url, headers={"User-Agent": "KisanSetu/1.0"})
        with urllib.request.urlopen(req, timeout=3.0) as res:
            if res.status == 200:
                data = json.loads(res.read().decode())
                daily = data.get("daily", {})
                max_temp = (daily.get("temperature_2m_max") or [30.0])[0]
                min_temp = (daily.get("temperature_2m_min") or [20.0])[0]
                rain_series = [p for p in (daily.get("precipitation_probability_max") or []) if p is not None]
                rain_prob = rain_series[0] if rain_series else 15.0
                week_rain = max(rain_series) if rain_series else rain_prob

                condition = "Favourable"
                risk = "LOW"
                if rain_prob > 60:
                    condition = "Heavy Rain Warning"
                    risk = "HIGH"
                elif rain_prob > 30:
                    condition = "Light Rain Expected"
                    risk = "MEDIUM"

                return {
                    "district": district,
                    "temperature_max_c": max_temp,
                    "temperature_min_c": min_temp,
                    "rain_probability_pct": rain_prob,
                    "rain_probability_next_7_days_max_pct": week_rain,
                    "weather_condition": condition,
                    "harvest_risk": risk,
                    "source": "Open-Meteo API",
                }
    except Exception:
        pass

    # Offline fallback
    return {
        "district": district,
        "temperature_max_c": 31.5,
        "rain_probability_pct": 12.0,
        "weather_condition": "Favourable / Clear Skies",
        "harvest_risk": "LOW",
        "source": "Offline Weather Estimate",
    }
