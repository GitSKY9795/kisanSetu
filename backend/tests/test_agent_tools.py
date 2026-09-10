import pytest
from app.agents.tools import AGENT_TOOLS, get_market_price, get_price_forecast, calculate_net_realization_tool


def test_agent_tools_count():
    assert len(AGENT_TOOLS) == 11


def test_get_market_price_tool():
    res = get_market_price.invoke({"crop_name": "wheat", "district": "Ujjain"})
    assert res["crop_name"] == "wheat"
    assert res["modal_price_per_kg"] > 0


def test_get_price_forecast_tool():
    res = get_price_forecast.invoke({"crop_name": "wheat", "current_price_per_kg": 24.50})
    assert "predicted_price_per_kg_7d" in res
    assert res["predicted_price_per_kg_7d"] > 0
