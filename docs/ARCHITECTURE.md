# Architecture

## High-Level Flow (matches the SIH deck's Technical Approach diagram)

```
FARMER / PRODUCER
  (Voice / Missed Call / IVR / WhatsApp / Mobile App)
        │
        ▼
VOICE-FIRST INTERFACE  (BHASHINI: ASR + NMT + TTS, IVR for feature phones, offline support)
        │
        ▼
AGENTIC ORCHESTRATION LAYER  (LangGraph agent + Gemini API — tool calling)
        │
        ├──► MARKET INTELLIGENCE     (real-time prices, demand insights, price forecasting)
        ├──► QUALITY & STANDARDS     (grade check, certifications info)
        ├──► TRANSPORT & LOGISTICS   (nearby services, freight rates, route info)
        ├──► STORAGE & FINANCE       (storage options, credit/loans, insurance info)
        └──► BUYER LINKAGE           (verified buyers, contract info, order matching)
        │
        ▼
DATA & AI ENGINE
  - Data aggregation & validation
  - AI/ML models: Prophet (price forecast), XGBoost (sell-decision classifier), SHAP (explainability)
  - Recommendation engine → SELL NOW / WAIT / STORE / AGGREGATE (with confidence score)
        │
        ▼
ACTIONABLE OUTPUTS
  Alerts & Notifications · Personalized Recommendations · Better Prices & Incomes · Reduced Risk & Uncertainty
```

## Agentic AI Design

KisanSetu is an **agentic agricultural assistant**, not a static chatbot:

1. **Input** — Farmer speaks in their language (crop, location, quantity, question) via
   WhatsApp / IVR / App mic.
2. **BHASHINI** — Speech-to-Text + regional-language translation → clean text query.
3. **Agent (LLM, LangGraph + Gemini)** — parses intent and **orchestrates tool calls**:
   - Price/Demand ML model (Prophet/XGBoost)
   - Weather/crop-condition check (Open-Meteo)
   - Net-Realization calculator
   - Sell-Decision Engine
4. **Decision Engine** — fuses all tool outputs → SELL NOW / WAIT / STORE / AGGREGATE,
   each with a confidence score and SHAP-based explanation.
5. **Output** — the agent composes one natural, contextual, reasoned answer (not a
   one-line bot reply).
6. **BHASHINI (TTS)** — converts the answer back to speech in the farmer's own language,
   delivered via WhatsApp / IVR / App.

## Data Sources

| Source | Purpose |
|---|---|
| AGMARKNET (data.gov.in) | Daily mandi prices & arrivals |
| e-NAM | National Agriculture Market data |
| Open-Meteo | Weather forecasts (crop condition, harvest timing) |
| OpenRouteService | Logistics route optimization |

## Service Boundaries

- **`backend/app/api`** — thin HTTP layer (FastAPI routers), no business logic.
- **`backend/app/services`** — business logic: forecasting, decision engine, net
  realization, BHASHINI integration, external data clients.
- **`backend/app/agents`** — the LangGraph orchestrator that ties services together as
  "tools" for the LLM agent.
- **`backend/app/ml`** — offline training scripts; trained artifacts loaded at runtime by
  `services/price_forecast_service.py` and `services/decision_engine.py`.
- Background/long-running jobs (nightly price re-training, batch forecasting) run via
  **Celery + Redis**, not inline in API requests.

## Deployment Topology

- **Frontend** → Vercel (React build)
- **Backend** → Render/Railway (Docker container running Uvicorn/FastAPI)
- **Database/Auth/Storage** → Supabase (Postgres + PostGIS, Auth, Storage)
- **Cache/Queue** → Redis (Upstash free tier or Render Redis add-on)
- **CI/CD** → GitHub Actions — lint + test on every PR, auto-deploy `main` to Vercel/Render
