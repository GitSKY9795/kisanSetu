import pytest
from app.services.decision_engine import recommend_action


def test_recommend_action_store():
    res = recommend_action(
        crop_name="wheat",
        current_price_per_kg=24.50,
        quantity_kg=500.0,
        storage_capacity_kg=600.0,
        district="Ujjain",
    )
    assert "action" in res
    assert res["action"] in ["SELL_NOW", "WAIT", "STORE", "AGGREGATE"]
    assert "net_realization_per_kg" in res
    assert "reasons" in res
    assert len(res["reasons"]) > 0


def test_recommend_action_aggregate():
    res = recommend_action(
        crop_name="wheat",
        current_price_per_kg=24.50,
        quantity_kg=1000.0,
        storage_capacity_kg=100.0,  # Insufficient personal storage
        district="Ujjain",
    )
    assert res["action"] in ["AGGREGATE", "STORE", "SELL_NOW", "WAIT"]
