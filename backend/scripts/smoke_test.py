"""
Quick end-to-end sanity check — run this right after `pip install -r requirements.txt`
to confirm the backend actually boots, the DB models create tables, and the core
services (decision engine, net realization) compute correctly.

Usage:
    cd backend && python -m scripts.smoke_test
"""
from app.core.database import Base, engine
from app.services.decision_engine import recommend_action
from app.services.net_realization import calculate_net_realization


def main():
    Base.metadata.create_all(bind=engine)
    print("✔ DB tables created:", list(Base.metadata.tables.keys()))

    net = calculate_net_realization(20, 2, 1)
    assert net == 17.0
    print("✔ Net-realization engine OK:", net)

    decision = recommend_action("onion", 20, 500, storage_capacity_kg=1000)
    assert decision["action"] in {"SELL_NOW", "WAIT", "STORE", "AGGREGATE"}
    print("✔ Sell-decision engine OK:", decision["action"], "-", decision["reasoning"])

    from fastapi.testclient import TestClient
    from app.main import app

    client = TestClient(app)
    resp = client.get("/health")
    assert resp.status_code == 200
    print("✔ FastAPI app boots, /health OK:", resp.json())

    print("\nAll smoke tests passed. You're good to go — `uvicorn app.main:app --reload`.")


if __name__ == "__main__":
    main()
