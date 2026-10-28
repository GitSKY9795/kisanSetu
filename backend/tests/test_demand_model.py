import numpy as np
import pandas as pd
import pytest

from app.ml.demand_features import ALL_INDIA, FEATURES, forward_change, series_features
from app.services import demand_forecast_service as svc


def _history(days: int = 200) -> pd.DataFrame:
    dates = pd.date_range("2025-01-01", periods=days, freq="D")
    price = 2000 * np.exp(np.linspace(0, 0.3, days))  # steady 30 % rise
    rows = []
    for state, scale in [(ALL_INDIA, 1.0), ("Madhya Pradesh", 0.95)]:
        for d, p in zip(dates, price):
            rows.append({"date": d, "state": state, "n_markets": 50, "modal_price": p * scale,
                         "min_price": p * scale * 0.9, "max_price": p * scale * 1.1})
    return pd.DataFrame(rows)


def test_features_use_only_the_past():
    history = _history()
    full = series_features(history, "wheat", "Madhya Pradesh")
    cut = series_features(history[history["date"] <= "2025-05-01"], "wheat", "Madhya Pradesh")
    day = pd.Timestamp("2025-05-01")
    assert np.allclose(full.loc[day, FEATURES].astype(float), cut.loc[day, FEATURES].astype(float))
    assert full.loc[day, "local_vs_national"] == pytest.approx(np.log(0.95), abs=1e-6)
    assert full.loc[day, "arrivals_ratio"] == pytest.approx(1.0)


def test_forward_change_looks_14_days_ahead():
    f = series_features(_history(), "wheat", ALL_INDIA)
    change = forward_change(f)
    day = pd.Timestamp("2025-03-01")
    expected = np.log(f.loc[pd.Timestamp("2025-03-15"), "smooth_price"] / f.loc[day, "smooth_price"])
    assert change.loc[day] == pytest.approx(expected)
    assert change.iloc[-14:].isna().all()


def test_unknown_crop_falls_back_to_profile():
    result = svc.get_demand_forecast("dragonfruit", "Ujjain")
    assert result["engine"].startswith("Fixed crop profile")
    assert 0 <= result["demand_score"] <= 1


@pytest.mark.skipif(not svc.MODEL_PATH.exists(), reason="demand model not trained")
def test_trained_model_prediction_contract():
    result = svc.get_demand_forecast("onion", "Nashik")
    assert result["demand_level"] in ("HIGH", "MEDIUM", "LOW")
    assert 0 <= result["demand_score"] <= 1
    if result["engine"].startswith("XGBoost"):
        assert sum(result["probabilities"].values()) == pytest.approx(1, abs=0.01)
        assert result["region"] in ("Maharashtra", ALL_INDIA)
