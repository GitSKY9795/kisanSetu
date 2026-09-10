# Team Wireless — Roles & Folder Ownership

| Member | Role (from PPT) | Primary Ownership |
|---|---|---|
| **Sanjay Saraswat** (Team Leader) | AI & ML Developer | `backend/app/ml/`, `backend/app/agents/` (LangGraph orchestrator), `backend/app/services/price_forecast_service.py`, `backend/app/services/decision_engine.py` — repo owner, CI/CD, integration |
| **Vidisha Goel** | AI & ML Developer | `backend/app/ml/` (Prophet/XGBoost training, SHAP explainability), `backend/app/services/decision_engine.py`, `ml-notebooks/` |
| **V Lakshmi Sravani** | Backend Developer | `backend/app/api/` (routes), `backend/app/models/`, `backend/app/core/database.py`, DB schema & migrations |
| **Vinay Yadav** | Frontend & UI/UX Developer | `frontend/` (React + Tailwind web dashboard), `mobile/` (Flutter app), design system |
| **Mohammed Abdul Rab** | Researcher | `docs/` (problem statement, competitor research, references), data source validation (Agmarknet/e-NAM/Bhashini docs), pitch content |
| **B Prasanna Lakshmi** | Backend Developer | `backend/app/services/data_ingestion/` (Agmarknet, Open-Meteo, OpenRouteService clients), `backend/app/services/bhashini_service.py`, background jobs (Celery) |

## Suggested Day-1 Split

1. **Sanjay + Vidisha** → get the Prophet price-forecast model training on sample Agmarknet CSV data (`backend/app/ml/train_price_model.py`), then wire `decision_engine.py` to output SELL/WAIT/STORE/AGGREGATE.
2. **Lakshmi Sravani + Prasanna** → stand up the FastAPI + Postgres skeleton (`docker compose up`, run migrations, get `/health` and `/farmers` endpoints working end to end).
3. **Vinay** → scaffold the React dashboard shell (Navbar, Login, Farmer Dashboard) hitting the `/health` endpoint first, then the real APIs as they land.
4. **Mohammed** → finalize `docs/PROBLEM_STATEMENT.md` + `docs/ARCHITECTURE.md` narrative, keep the SIH deck and this repo in sync, gather Agmarknet/e-NAM/Bhashini API docs links for the team.

## Branching Convention

- `main` — always deployable
- `feature/<short-desc>` — e.g. `feature/sell-decision-api`, `feature/farmer-dashboard`
- Open a PR into `main`, tag at least one teammate for review before merging.
