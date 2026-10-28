from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import (
    routes_admin,
    routes_agent,
    routes_auth,
    routes_buyers,
    routes_decision,
    routes_farmers,
    routes_fpos,
    routes_grievances,
    routes_logistics,
    routes_marketplace,
    routes_prices,
    routes_quality,
    routes_transactions,
)
from app.core.config import settings
from app.core.database import IS_POSTGRES, Base, engine
import app.models  # noqa: F401 — registers every model on Base.metadata before create_all

# On PostgreSQL (Firebase SQL Connect) the tables are created and migrated by
# `firebase deploy --only dataconnect` from dataconnect/schema/schema.gql — the backend only
# uses them. The local SQLite file is still set up automatically.
if not IS_POSTGRES:
    Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.APP_NAME,
    description="AI-powered market intelligence & direct transaction platform for farmers "
    "(SIH26132 — Strengthening Market Linkages and Price Discovery for Farmers).",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(routes_auth.router)
app.include_router(routes_farmers.router)
app.include_router(routes_buyers.router)
app.include_router(routes_fpos.router)
app.include_router(routes_marketplace.router)
app.include_router(routes_admin.router)
app.include_router(routes_prices.router)
app.include_router(routes_decision.router)
app.include_router(routes_quality.router)
app.include_router(routes_logistics.router)
app.include_router(routes_agent.router)
app.include_router(routes_transactions.router)
app.include_router(routes_grievances.router)


@app.on_event("startup")
def keep_mandi_history_current():
    # Tops up data/agmarknet/ (the demand model's input) with the latest days, in the background.
    if settings.AGMARKNET_API_KEY:
        from app.ml.agmarknet_history import start_background_refresh

        start_background_refresh()


@app.get("/health", tags=["meta"])
def health():
    return {"status": "ok", "app": settings.APP_NAME, "env": settings.ENV}


@app.get("/", tags=["meta"])
def root():
    return {
        "message": "KisanSetu backend is running cleanly. Interactive docs available at /docs.",
        "version": "1.0.0",
    }
