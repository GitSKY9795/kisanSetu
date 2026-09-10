# Contributing to KisanSetu

## Branching
- `main` — always deployable. Never push directly.
- `feature/<short-desc>` — e.g. `feature/sell-decision-api`, `feature/farmer-dashboard`, `feature/bhashini-voice`
- `fix/<short-desc>` — bug fixes

## Commit messages
Keep them short and imperative: `add net-realization endpoint`, `fix price forecast fallback`.
Prefix with the area when helpful: `backend: ...`, `frontend: ...`, `ml: ...`, `docs: ...`.

## Pull Requests
1. Branch off `main`, make your change.
2. Run tests/lint locally before pushing (see below).
3. Open a PR into `main`, tag at least one teammate for review.
4. Keep PRs scoped to one feature/fix — small PRs review faster.

## Local checks before pushing

**Backend**
```bash
cd backend
source venv/bin/activate
pytest
ruff check .        # if installed — otherwise just run pytest
```

**Frontend**
```bash
cd frontend
npm run lint
npm run build        # make sure it actually builds
```

## Adding a new API endpoint
1. Add/extend the Pydantic schema in `backend/app/schemas/`.
2. Add the route handler in `backend/app/api/routes_*.py`.
3. Wire it into `backend/app/main.py` if it's a new router.
4. Document it in `docs/API_ENDPOINTS.md`.
5. Add a test in `backend/tests/`.

## Adding a new frontend page
1. Add the component in `frontend/src/pages/`.
2. Wire the route in `frontend/src/App.jsx`.
3. Add any new API calls to `frontend/src/api/client.js`.

## Questions / blocked?
Ping the team group — don't sit blocked for more than an hour without asking.
