import pytest
from app.services.demand_forecast_service import get_demand_forecast
from app.services.weather_service import get_weather_forecast
from app.ml.quality_grading import analyze_produce_quality


def test_demand_forecast():
    df = get_demand_forecast("wheat", "Ujjain")
    assert df["demand_level"] in ["HIGH", "MEDIUM", "LOW"]
    assert "summary" in df


def test_weather_forecast():
    w = get_weather_forecast(district="Ujjain")
    assert "weather_condition" in w
    assert "harvest_risk" in w


def test_produce_quality_grading():
    res = analyze_produce_quality(filename="sample_wheat.jpg")
    assert res["detected_crop"] == "Wheat"
    assert res["quality_grade"] in ["Grade A", "Grade B", "Grade C"]
    assert res["confidence"] > 0.5
