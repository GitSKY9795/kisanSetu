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


@app.get("/health", tags=["meta"])
def health():
    return {"status": "ok", "app": settings.APP_NAME, "env": settings.ENV}


@app.get("/", tags=["meta"])
def root():
    return {
        "message": "KisanSetu backend is running cleanly. Interactive docs available at /docs.",
        "version": "1.0.0",
    }
