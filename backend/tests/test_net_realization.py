import pytest
from app.services.net_realization import calculate_net_realization, compare_buyer_offers


def test_calculate_net_realization():
    net = calculate_net_realization(
        selling_price_per_kg=25.00,
        transport_cost_per_kg=1.00,
        storage_cost_per_kg=0.50,
        other_costs_per_kg=0.00,
        platform_fee_percent=1.0,  # 0.25
    )
    assert net == 23.25


def test_compare_buyer_offers():
    offers = [
        {"buyer_id": "b1", "buyer_name": "Buyer A", "price_per_kg": 25.0, "transport_cost_per_kg": 2.0},
        {"buyer_id": "b2", "buyer_name": "Buyer B", "price_per_kg": 24.0, "transport_cost_per_kg": 0.5},
    ]
    res = compare_buyer_offers(offers, quantity_kg=1000.0)
    assert len(res["ranked_offers"]) == 2
    # Buyer B has price 24 - 0.5 - 0.24 = 23.26
    # Buyer A has price 25 - 2.0 - 0.25 = 22.75
    # So Buyer B ranks first despite lower quoted price!
    assert res["ranked_offers"][0]["buyer_name"] == "Buyer B"
    assert "yields a HIGHER NET REALIZATION" in res["explanation"]
