# KisanSetu  🌾

**Strengthening Market Linkages and Price Discovery for Farmers**
Smart India Hackathon 2026 — Problem Statement **SIH26132** (Government of Maharashtra)
Team **Wireless** · IIT Madras BS Degree Programme

> KisanSetu is an **agentic agricultural assistant** that tells farmers not just *what* the price is,
> but *when, where, and to whom* to sell for the best net realization — combining real-time market
> intelligence, an AI sell-decision engine, verified buyer discovery, FPO-based aggregation, and a
> voice-first multilingual interface (BHASHINI) for farmers with low digital literacy.

---

## 1. Problem Statement

Farmers — especially smallholders and FPOs — have limited visibility of prices, demand, and
buyer credentials across nearby markets. They often sell immediately after harvest due to
liquidity/storage constraints, with weak bargaining power. See [`docs/PROBLEM_STATEMENT.md`](docs/PROBLEM_STATEMENT.md)
for the full official PS text.

## 2. What We're Building

| Module | What it does |
|---|---|
| **Market Intelligence** | Aggregates mandi prices, arrivals & demand (Agmarknet, e-NAM) |
| **Sell-Decision AI** | SELL NOW / WAIT / STORE / AGGREGATE recommendation with confidence score |
| **Net-Realization Engine** | Price − Transport − Storage − Costs → true payout |
| **Buyer Discovery & FPO Aggregation** | Matches verified buyers to farmer/FPO lots |
| **Agentic Voice Assistant** | BHASHINI (voice/language) + LLM agent (orchestrator) + ML tools → one spoken, contextual answer |
| **Logistics Optimization** | Route planning for pickup/delivery (OR-Tools style via OpenRouteService) |
| **Payments & Trust** | Transaction tracking, dispute/grievance workflow (Razorpay test mode) |

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full system diagram and data flow.

## 3. Tech Stack

| Layer | Tech |
|---|---|
| **Frontend (Web)** | React.js + Vite + Tailwind CSS |
| **Mobile** | Flutter (Android-first) |
| **Backend** | Python, FastAPI, SQLAlchemy, WebSockets |
| **Database** | PostgreSQL + PostGIS, Redis, Supabase Storage |
| **AI/ML** | Pandas, NumPy, Prophet, XGBoost, Scikit-learn, YOLOv8, SHAP |
| **Agentic AI** | LangGraph + Gemini API (tool-calling orchestrator), **BHASHINI** (voice/ASR/NMT/TTS) |
| **Data / External APIs** | AGMARKNET (data.gov.in), e-NAM, Open-Meteo, OpenRouteService |
| **Background Jobs** | Celery + Redis |
| **Payments / Auth** | Razorpay (test mode), Supabase Auth / JWT |
| **Deployment** | GitHub Actions (CI/CD), Vercel (frontend), Render/Railway (backend), Supabase (DB/Auth/Storage) |

No AWS — everything runs on generous free tiers so any team member can spin up the full stack locally or on a free cloud deployment.

## 4. Repository Structure

```
kisansetu-ai/
├── backend/            # FastAPI service — APIs, ML models, agent orchestrator
│   └── app/
│       ├── core/        # config, db session, security/JWT
│       ├── models/      # SQLAlchemy models (Farmer, Buyer, Crop, Transaction, FPO)
│       ├── schemas/      # Pydantic request/response schemas
│       ├── api/          # route handlers (auth, farmers, buyers, prices, decision, agent, transactions)
│       ├── services/     # business logic: price forecast, decision engine, net realization,
│       │                 #   bhashini voice service, data_ingestion/ (Agmarknet, weather, routing)
│       ├── agents/        # LangGraph agent orchestrator + tool definitions
│       └── ml/            # training scripts + saved model artifacts
├── frontend/            # React + Tailwind web dashboard (farmer/buyer/FPO/admin views)
├── mobile/              # Flutter app (see mobile/README.md to scaffold)
├── ml-notebooks/         # exploratory notebooks for price forecasting & decision model
├── docs/                 # architecture, API reference, problem statement, team roles
└── .github/workflows/    # CI pipelines for backend & frontend
```

## 5. Getting Started (Local Dev — macOS)

These steps assume the setup this repo actually ships with: **SQLite locally** (no
Docker/Postgres needed to run the prototype) and a Python venv. If you later want to
run against Postgres/Supabase, everything is already parameterized via `DATABASE_URL`
in `.env` — just point it at your instance.

### Prerequisites
- Python 3.11+ (`python3 --version`)
- Node.js 18+ (`node --version`)
- [Homebrew](https://brew.sh) (for `libomp`, needed by XGBoost on macOS)
- Docker is **optional** — only needed if you want local Postgres/Redis instead of SQLite.

### 5.1 Clone & configure
```bash
git checkout -b feature/<your-name>-<short-topic>   # work on a feature branch, not main
cp backend/.env.example backend/.env                 # fill in optional keys later — SQLite needs none
```
`.env` holds secrets and is already in `.gitignore` — never commit it.

### 5.2 macOS system dependency: libomp (required by XGBoost)
```bash
brew install libomp
```
Without this, `import xgboost` will crash with an `OMP` / `libomp.dylib not found` error on macOS.

### 5.3 Backend
```bash
cd backend
python3 -m venv venv
source venv/bin/activate                 # you'll see (venv) in your prompt

pip install --upgrade pip
pip install -r requirements.txt          # ~3–5 min first time (compiles nothing; all wheels)
```

**Prophet needs a compiled CmdStan backend, installed separately, once:**
```bash
python -c "import cmdstanpy; cmdstanpy.install_cmdstan()"   # ~5–10 min, one-time; needs internet
```
> `requirements.txt` already pins `cmdstanpy<1.3.0` — required for compatibility with
> `prophet==1.1.6`. Don't bump either independently.

Now seed some demo data and run the test suite as a sanity check:
```bash
python -m scripts.seed_data       # seeds a demo farmer/buyers/FPO pool/listing into SQLite
python -m pytest tests/ -q        # should show: 16 passed
```

Generate synthetic training data and train the ML models (optional — the app runs
fine with rule-based fallbacks if you skip this, but training gives you the real
XGBoost + SHAP-explained decisions and Prophet-forecasted prices):
```bash
python -m app.ml.generate_sample_data     # writes backend/data/*.csv
python -m app.ml.train_decision_model     # trains XGBoost sell-decision classifier (~10s)
python -m app.ml.train_price_model        # trains Prophet per crop (~1–3 min per crop, needs cmdstan installed above)
```

Start the API:
```bash
uvicorn app.main:app --reload --port 8000
```
API docs (interactive) at `http://localhost:8000/docs`. Health check at `/health`.

> **What needs an API key vs. what doesn't:** every route in `docs/API_ENDPOINTS.md`
> works out of the box with no keys — services fall back to realistic simulated data
> (weather, demand, mandi prices, quality grading) when an external API key isn't set.
> The one thing that needs `GEMINI_API_KEY` in `.env` to give real LLM answers is the
> agentic assistant (`app/agents/orchestrator.py`); without it, `/agent/query` still
> responds using its rule-based tool-calling fallback, so the UI keeps working.

### 5.4 Frontend
```bash
cd frontend
npm install
cp .env.example .env              # VITE_API_BASE_URL=http://localhost:8000 (default is already correct)
npm run dev
```
Runs at `http://localhost:5173` — with the backend running on port 8000, every
dashboard (Farmer, Buyer, FPO, Marketplace, Admin, AI Assistant) is live-wired to
real API calls, not mock data.

### 5.5 Mobile (Flutter)
See [`mobile/README.md`](mobile/README.md) — optional, not required to explore the prototype.

## 6. macOS Troubleshooting

| Symptom | Fix |
|---|---|
| `import xgboost` → `libomp.dylib not found` | `brew install libomp` (see 5.2) |
| `cmdstanpy` install hangs or fails with a GitHub connection error | Re-run `python -c "import cmdstanpy; cmdstanpy.install_cmdstan()"` — it retries on transient network errors; check you're not on a restrictive network/VPN blocking `github.com` |
| `pip install -r requirements.txt` fails on `langchain-core` / `langgraph` conflict | Don't add or bump `langgraph-prebuilt` as a separate pin — `langgraph==0.2.34` already bundles its own `langgraph.prebuilt` submodule. Reinstall from this repo's `requirements.txt` as-is. |
| Training `train_price_model.py` fails / very slow | Make sure `cmdstanpy.install_cmdstan()` finished successfully first (5.3). First fit per crop is slower; subsequent ones are faster. |
| Frontend pages show "Could not reach the KisanSetu backend" | Make sure `uvicorn` is running on port 8000 in another terminal, and `frontend/.env` has `VITE_API_BASE_URL=http://localhost:8000` |
| `sqlite3.OperationalError` on a fresh clone | Delete `backend/kisansetu.db` if present and re-run `python -m scripts.seed_data` — SQLite will recreate all tables automatically on first import of `app.core.database` |

## 7. Team & Ownership

See [`docs/TEAM_ROLES.md`](docs/TEAM_ROLES.md) for who owns which folder — pushed here so
everyone knows exactly where to start contributing on day 1.

## 8. Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for branch naming, commit style, and PR checklist.
Short version: **branch off `main`, never push directly to it** — e.g. `git checkout -b feature/vinay-marketplace-ui`.

## 9. License

MIT — see [`LICENSE`](LICENSE).
