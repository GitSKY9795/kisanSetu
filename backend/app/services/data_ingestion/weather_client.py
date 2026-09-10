"""
Free, no-API-key weather forecasts from Open-Meteo — used to factor rain/temperature
risk into the Sell-Decision Engine (e.g. flag STORE if heavy rain would spoil an
already-harvested perishable lot in transit).
"""
import httpx

from app.core.config import settings


async def fetch_weather_forecast(latitude: float, longitude: float, days: int = 7) -> dict:
    params = {
        "latitude": latitude,
        "longitude": longitude,
        "daily": "temperature_2m_max,temperature_2m_min,precipitation_sum",
        "forecast_days": days,
        "timezone": "auto",
    }
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(f"{settings.OPEN_METEO_BASE_URL}/forecast", params=params)
        resp.raise_for_status()
        return resp.json()
