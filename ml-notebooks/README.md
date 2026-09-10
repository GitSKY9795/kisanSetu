# ML Notebooks

Exploratory work lives here before it gets promoted into a clean training
script under `backend/app/ml/`. Suggested notebooks to create:

1. **`01_agmarknet_eda.ipynb`** — pull sample data via
   `backend/app/services/data_ingestion/agmarknet_client.py`, explore price
   trends per crop/market, check for missing/noisy records.
2. **`02_price_forecasting_prophet.ipynb`** — prototype the Prophet model
   before hardening it into `backend/app/ml/train_price_model.py`.
3. **`03_decision_model_features.ipynb`** — feature engineering for the
   Sell-Decision classifier (price volatility, days-since-harvest, distance
   to nearest buyer, storage capacity vs. quantity) before promoting to
   `backend/app/ml/train_decision_model.py`.
4. **`04_shap_explainability.ipynb`** — inspect SHAP values from the trained
   decision model to sanity-check *why* it recommends what it recommends —
   this feeds directly into the agent's `reasoning` output.

## Getting sample data quickly

```python
import asyncio
from app.services.data_ingestion.agmarknet_client import fetch_mandi_prices

records = asyncio.run(fetch_mandi_prices("onion", state="Maharashtra", limit=200))
```

Export to CSV for the training scripts:
```python
import pandas as pd
pd.DataFrame(records).to_csv("../backend/data/onion_prices.csv", index=False)
```

Keep large raw data files out of git (see root `.gitignore`) — commit notebooks
and small derived samples only.
