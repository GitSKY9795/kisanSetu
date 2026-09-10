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
import uuid

from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal
from app.core.deps import get_current_user
from app.models.buyer import Buyer
from app.models.crop import CropListing
from app.models.farmer import Farmer
from app.models.fpo import FPO, FPOPool, FPOPoolMember
from app.models.transaction import Transaction
from app.models.user import User, UserRole

client = TestClient(app)


def _unique_phone() -> str:
    return f"9{uuid.uuid4().int % 10**9:09d}"


def _make_user(db, role) -> User:
    user = User(firebase_uid=f"test-{uuid.uuid4().hex}", phone=_unique_phone(), full_name=f"Test {role.value}", role=role)
    db.add(user)
    db.flush()
    return user


def _login_as(user: User):
    app.dependency_overrides[get_current_user] = lambda: user


def _logout():
    app.dependency_overrides.pop(get_current_user, None)


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
    db = SessionLocal()
    try:
        farmer_user = _make_user(db, UserRole.FARMER)
        farmer = Farmer(user_id=farmer_user.id, name="Test Farmer", phone=farmer_user.phone, district="Ujjain", state="Madhya Pradesh")
        db.add(farmer)
        db.flush()

        buyer_user = _make_user(db, UserRole.BUYER)
        buyer = Buyer(user_id=buyer_user.id, name="Test Buyer Corp", phone=buyer_user.phone, buyer_category="Processor")
        db.add(buyer)
        db.flush()

        listing = CropListing(
            farmer_id=farmer.id, crop_name="Wheat", quantity_kg=500.0, price_per_kg=25.50,
            district="Ujjain", state="Madhya Pradesh", status="LISTED",
        )
        db.add(listing)
        db.commit()
        db.refresh(listing)

        # Submit offer as the buyer
        _login_as(buyer_user)
        offer_payload = {
            "listing_id": str(listing.id),
            "offered_price_per_kg": 26.00,
            "offered_quantity_kg": 500.0,
            "terms": "48hr farmgate pickup",
        }
        res = client.post("/marketplace/offers", json=offer_payload)
        assert res.status_code == 200
        offer_id = res.json()["id"]

        # Counter offer
        res_counter = client.post(f"/marketplace/offers/{offer_id}/counter", json={"counter_price_per_kg": 26.50})
        assert res_counter.status_code == 200
        assert res_counter.json()["offered_price_per_kg"] == 26.50

        # Accept offer as the farmer who owns the listing
        _login_as(farmer_user)
        res_accept = client.post(f"/marketplace/offers/{offer_id}/accept")
        assert res_accept.status_code == 200
        assert res_accept.json()["offer"]["status"] == "ACCEPTED"
    finally:
        _logout()
        db.close()


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
    db = SessionLocal()
    try:
        farmer_user = _make_user(db, UserRole.FARMER)
        farmer = Farmer(user_id=farmer_user.id, name="Test Farmer", phone=farmer_user.phone, district="Ujjain", state="Madhya Pradesh")
        db.add(farmer)
        db.flush()

        buyer_user = _make_user(db, UserRole.BUYER)
        buyer = Buyer(user_id=buyer_user.id, name="Test Buyer Corp", phone=buyer_user.phone, buyer_category="Processor")
        db.add(buyer)
        db.flush()

        txn = Transaction(
            invoice_no=f"INV-TEST-{uuid.uuid4().hex[:8].upper()}",
            farmer_id=farmer.id, buyer_id=buyer.id, crop_name="Wheat",
            quantity_kg=500.0, agreed_price_per_kg=25.0,
        )
        db.add(txn)
        db.commit()
        db.refresh(txn)

        admin_user = _make_user(db, UserRole.ADMIN)
        db.commit()

        # List grievances (as the farmer, before raising any)
        _login_as(farmer_user)
        res_list = client.get("/grievances")
        assert res_list.status_code == 200

        # Raise grievance
        payload = {
            "transaction_id": str(txn.id),
            "category": "Weight Shortage",
            "disputed_amount_inr": 1500.0,
            "description": "50kg weighing discrepancy at unloading weighbridge",
        }
        res_raise = client.post("/grievances", json=payload)
        assert res_raise.status_code == 200
        grv_id = res_raise.json()["id"]

        # Resolve grievance as admin
        _login_as(admin_user)
        res_resolve = client.post(
            f"/grievances/{grv_id}/resolve",
            json={"resolution_summary": "Re-weighed and verified. Reimbursement issued."},
        )
        assert res_resolve.status_code == 200
        assert res_resolve.json()["status"] == "RESOLVED"
    finally:
        _logout()
        db.close()


def test_fpo_payout_ledger():
    db = SessionLocal()
    try:
        fpo_owner = _make_user(db, UserRole.FPO)
        fpo = FPO(owner_user_id=fpo_owner.id, name="Test FPO", district="Nashik", state="Maharashtra")
        db.add(fpo)
        db.flush()

        farmer_user = _make_user(db, UserRole.FARMER)
        farmer = Farmer(user_id=farmer_user.id, name="Test Farmer", phone=farmer_user.phone, district="Nashik", state="Maharashtra")
        db.add(farmer)
        db.flush()

        pool = FPOPool(
            fpo_id=fpo.id, crop_name="Onion", total_quantity_kg=1000.0,
            target_quantity_kg=5000.0, target_price_per_kg=27.0, mandi_benchmark_price_per_kg=24.5,
        )
        db.add(pool)
        db.flush()
        db.add(FPOPoolMember(pool_id=pool.id, farmer_id=farmer.id, quantity_kg=1000.0))
        db.commit()
        db.refresh(pool)

        _login_as(farmer_user)
        res = client.get(f"/fpos/pools/{pool.id}/payout-ledger")
        assert res.status_code == 200
        data = res.json()
        assert "ledger" in data
        assert len(data["ledger"]) > 0
        assert data["gross_revenue_inr"] > 0
    finally:
        _logout()
        db.close()
