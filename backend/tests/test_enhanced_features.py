"""
Tests for newly added SIH 2026 features:
- Multi-mandi price arbitrage
- Multi-horizon forecasts
- Digital Quality Certificate (e-Pramaan)
- Marketplace Digital Offers & Counter-Offers
- WDRA Warehouses & e-NWR Pledge Loans
- 4-Stage Milestone Escrow
- Grievance Redressal
- FPO Member Payout Ledger
"""
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_nearby_mandis_arbitrage():
    response = client.get("/prices/wheat/nearby-mandis?quantity_quintals=10")
    assert response.status_code == 200
    data = response.json()
    assert "best_mandi" in data
    assert "arbitrage_gain_per_quintal" in data
    assert len(data["mandis"]) > 0
    assert any(m["is_best_payout"] for m in data["mandis"])


def test_multi_horizon_forecast():
    response = client.get("/prices/wheat/forecast-multi-horizon")
    assert response.status_code == 200
    data = response.json()
    assert "horizons" in data
    assert len(data["horizons"]) >= 4
    assert "trend_direction" in data


def test_quality_certificate_generation():
    payload = {
        "crop_name": "Wheat",
        "farmer_name": "Ramesh Kumar",
        "district": "Ujjain",
        "quantity_kg": 1000.0,
        "moisture_pct": 11.5,
        "foreign_matter_pct": 0.8,
        "damaged_grains_pct": 1.2,
        "grain_size_mm": 6.8,
        "sample_notes": "Sharbati Gold premium lot"
    }
    response = client.post("/quality/certificate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "certificate_id" in data
    assert "verification_hash" in data
    assert data["quality_grade"].startswith("Grade A")


def test_marketplace_offers_and_negotiation():
    # Submit offer
    offer_payload = {
        "listing_id": "fl-01",
        "crop_name": "Wheat",
        "farmer_name": "Ramesh Kumar",
        "buyer_name": "AgriCorp Processing Ltd",
        "buyer_category": "Processor",
        "quantity_kg": 500.0,
        "asking_price_per_kg": 25.50,
        "offered_price_per_kg": 26.00,
        "terms": "48hr farmgate pickup"
    }
    res = client.post("/marketplace/offers", json=offer_payload)
    assert res.status_code == 200
    offer_data = res.json()
    offer_id = offer_data["id"]

    # Counter offer
    res_counter = client.post(f"/marketplace/offers/{offer_id}/counter", json={"counter_price_per_kg": 26.50})
    assert res_counter.status_code == 200
    assert res_counter.json()["offered_price_per_kg"] == 26.50

    # Accept offer
    res_accept = client.post(f"/marketplace/offers/{offer_id}/accept")
    assert res_accept.status_code == 200
    assert res_accept.json()["status"] == "ACCEPTED"


def test_warehouses_and_pledge_loan():
    res_wh = client.get("/logistics/warehouses")
    assert res_wh.status_code == 200
    assert len(res_wh.json()["warehouses"]) > 0

    loan_payload = {
        "crop_name": "Wheat",
        "quantity_quintals": 50.0,
        "current_mandi_price_per_quintal": 2500.0,
        "tenure_months": 3
    }
    res_loan = client.post("/logistics/pledge-loan", json=loan_payload)
    assert res_loan.status_code == 200
    data = res_loan.json()
    assert data["loan_to_value_ltv_pct"] == 70.0
    assert data["eligible_pledge_loan_inr"] == 87500.0


def test_grievances_lifecycle():
    # List grievances
    res_list = client.get("/grievances")
    assert res_list.status_code == 200

    # Raise grievance
    payload = {
        "order_id": "txn-881",
        "raised_by_type": "FARMER",
        "raised_by_name": "Ramesh Kumar",
        "against_party": "AgriCorp Processing Ltd",
        "category": "Weight Shortage",
        "crop_name": "Wheat",
        "disputed_amount_inr": 1500.0,
        "description": "50kg weighing discrepancy at unloading weighbridge",
        "evidence_notes": "Weighbridge slip attached"
    }
    res_raise = client.post("/grievances", json=payload)
    assert res_raise.status_code == 200
    grv_id = res_raise.json()["id"]

    # Resolve grievance
    res_resolve = client.post(
        f"/grievances/{grv_id}/resolve",
        json={"resolution_summary": "Re-weighed and verified. Reimbursement issued.", "settlement_amount_inr": 1500.0}
    )
    assert res_resolve.status_code == 200
    assert res_resolve.json()["status"] == "RESOLVED"


def test_fpo_payout_ledger():
    res = client.get("/fpos/pools/pool-101/payout-ledger")
    assert res.status_code == 200
    data = res.json()
    assert "ledger" in data
    assert len(data["ledger"]) > 0
    assert data["gross_revenue_inr"] > 0
