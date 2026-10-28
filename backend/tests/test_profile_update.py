"""PATCH /auth/profile — a registered user edits their own profile."""
import uuid

from fastapi import Depends
from fastapi.testclient import TestClient

from app.core.database import SessionLocal, get_db
from app.core.deps import get_current_user
from app.main import app
from app.models.farmer import Farmer
from app.models.user import User, UserRole

client = TestClient(app)


def _phone() -> str:
    return f"+919{uuid.uuid4().int % 10**9:09d}"


def _login_as(user_id):
    """Resolve the user inside the request's own DB session, as the real dependency does."""
    def current_user(db=Depends(get_db)):
        return db.get(User, user_id)

    app.dependency_overrides[get_current_user] = current_user


def _farmer_account(db):
    user = User(firebase_uid=f"test-{uuid.uuid4().hex}", phone=_phone(), full_name="Old Name", role=UserRole.FARMER)
    db.add(user)
    db.flush()
    farmer = Farmer(id=uuid.uuid4(), user_id=user.id, name="Old Name", phone=user.phone, village="A", district="Ujjain",
                    state="Madhya Pradesh", farmer_type="Land Owner", land_area=2.0, main_crops="wheat")
    db.add(farmer)
    db.commit()
    return user, farmer


def test_farmer_updates_profile():
    db = SessionLocal()
    user, farmer = _farmer_account(db)
    _login_as(user.id)
    try:
        new_phone = _phone()
        res = client.patch("/auth/profile", json={"name": "New Name", "district": "Indore", "land_area": 4.5, "phone": new_phone, "pin_code": "452001"})
        assert res.status_code == 200, res.text
        profile = res.json()["profile"]
        assert profile["name"] == "New Name"
        assert profile["district"] == "Indore"
        assert profile["land_area"] == 4.5
        assert profile["phone"] == new_phone
        assert profile["village"] == "A"  # untouched fields stay as they were
        assert res.json()["user"]["full_name"] == "New Name"
    finally:
        app.dependency_overrides.pop(get_current_user, None)
        db.expire_all()
        db.delete(db.get(Farmer, farmer.id))
        db.delete(db.get(User, user.id))
        db.commit()
        db.close()


def test_profile_update_rejects_bad_input_and_foreign_fields():
    db = SessionLocal()
    user, farmer = _farmer_account(db)
    _login_as(user.id)
    try:
        assert client.patch("/auth/profile", json={"phone": "12345"}).status_code == 422
        assert client.patch("/auth/profile", json={"name": "   "}).status_code == 422
        assert client.patch("/auth/profile", json={"land_area": -1}).status_code == 422
        # buyer-only field on a farmer account
        assert client.patch("/auth/profile", json={"organization": "X Ltd"}).status_code == 422
    finally:
        app.dependency_overrides.pop(get_current_user, None)
        db.expire_all()
        db.delete(db.get(Farmer, farmer.id))
        db.delete(db.get(User, user.id))
        db.commit()
        db.close()


def test_phone_already_used_is_refused():
    db = SessionLocal()
    user, farmer = _farmer_account(db)
    other_user, other_farmer = _farmer_account(db)
    _login_as(user.id)
    try:
        res = client.patch("/auth/profile", json={"phone": other_farmer.phone})
        assert res.status_code == 409
    finally:
        app.dependency_overrides.pop(get_current_user, None)
        db.expire_all()
        for model, row_id in ((Farmer, farmer.id), (Farmer, other_farmer.id), (User, user.id), (User, other_user.id)):
            db.delete(db.get(model, row_id))
        db.commit()
        db.close()
