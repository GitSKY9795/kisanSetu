import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";
import { getCurrentPrice, getPriceHistory, getMultiHorizonForecast } from "../api/client.js";
import { useLanguage } from "../context/LanguageContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useGeolocation } from "../hooks/useGeolocation.js";
import { cropLabel, englishCropName } from "../i18n/crops.js";

const CROPS = ["wheat", "onion", "potato", "tomato", "cotton", "soybean", "maize"];

export default function PriceTrends() {
  const { crop: cropParam } = useParams();
  const navigate = useNavigate();
  const { t, tn, locale } = useLanguage();
  const { profile } = useAuth();
  const geo = useGeolocation();
  const crop = cropParam || "wheat";

  const [records, setRecords] = useState([]);
  const [current, setCurrent] = useState(null);
  const [forecastHorizon, setForecastHorizon] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [district, setDistrict] = useState("");
  const [districtInput, setDistrictInput] = useState("");
  const [districtEdited, setDistrictEdited] = useState(false);
  const [cropSearch, setCropSearch] = useState(crop);

  // Once we know the user's real district (their profile, or live geolocation), use it
  // as the default — but don't stomp on a district they've already typed in themselves.
  useEffect(() => {
    setCropSearch(crop);
  }, [crop]);

  useEffect(() => {
    if (district || districtEdited) return;
    const detected = profile?.district || geo.district;
    if (detected) {
      setDistrict(detected);
      setDistrictInput(detected);
    }
  }, [profile?.district, geo.district, district, districtEdited]);

  useEffect(() => {
    if (districtInput === district) return undefined;
    const timer = window.setTimeout(() => setDistrict(districtInput.trim()), 600);
    return () => window.clearTimeout(timer);
  }, [districtInput, district]);

  const state = profile?.state || geo.state;

  useEffect(() => {
    // District starts empty and gets filled in a moment (profile/geolocation), which
    // fires this effect twice in quick succession. An earlier, param-less request can
    // resolve *after* the later, correctly-scoped one (real network calls, variable
    // latency) and clobber it with stale data — `current` guards against that.
    let isActive = true;
    setLoading(true);
    setError(null);
    const params = district ? { district, state } : {};
    Promise.all([
      getPriceHistory(crop, params),
      getCurrentPrice(crop, params),
      getMultiHorizonForecast(crop, params),
    ])
      .then(([history, curr, horizon]) => {
        if (!isActive) return;
        setRecords(history.records || []);
        setCurrent(curr);
        setForecastHorizon(horizon);
      })
      .catch((err) => {
        if (!isActive) return;
        setError(
          (err.response?.data?.detail && t(err.response.data.detail))
            || (err.request
              ? t("The live mandi feed did not respond. FastAPI is running, but AGMARKNET is currently unavailable. Please retry shortly.")
              : err.message || t("Could not reach the KisanSetu backend. Ensure FastAPI is running on http://localhost:8000."))
        );
      })
      .finally(() => {
        if (isActive) setLoading(false);
      });
    return () => {
      isActive = false;
    };
  }, [crop, district, state]);

  const searchCrop = (event) => {
    event.preventDefault();
    const typed = cropSearch.trim();
    const value = (englishCropName(typed, t) || typed).toLowerCase();
    if (value) navigate(`/prices/${encodeURIComponent(value)}`);
  };

  const chartData = [...records]
    .reverse()
    .map((r) => ({ date: r.arrival_date, price: Number(r.modal_price) }));

  const trendUp = current && current.predicted_price_per_quintal_7d >= current.current_price_per_quintal;
  const trendPct = current && current.current_price_per_quintal
    ? (((current.predicted_price_per_quintal_7d - current.current_price_per_quintal) / current.current_price_per_quintal) * 100).toFixed(1)
    : null;

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 flex items-center gap-2">
            <span>📈</span> {t("Mandi Price Intelligence & Multi-Horizon Forecasts")}
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">{t("Real-time mandi modal prices, arrival volume pressure, and multi-horizon AI price forecasting.")}</p>
        </div>

        <div className="flex items-center gap-3">
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">{t("Select Commodity")}</label>
            <form onSubmit={searchCrop} className="flex gap-2">
              <input
                value={cropSearch}
                onChange={(e) => setCropSearch(e.target.value)}
                list="crop-suggestions"
                placeholder={t("e.g. wheat, turmeric, banana")}
                className="w-48 border border-gray-300 rounded-xl px-3 py-2 bg-gray-50 text-sm font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                aria-label={t("Search any crop")}
              />
              <datalist id="crop-suggestions">
                {CROPS.map((c) => <option key={c} value={c} label={cropLabel(t, c)} />)}
              </datalist>
              <button type="submit" className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white hover:bg-emerald-700">
                {t("Search")}
              </button>
            </form>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">{t("District")}</label>
            <input
              value={districtInput}
              onChange={(e) => {
                setDistrictEdited(true);
                setDistrictInput(e.target.value);
              }}
              placeholder={geo.loading ? t("Detecting your location…") : t("e.g. Ujjain")}
              className="border border-gray-300 rounded-xl px-3 py-2 bg-gray-50 text-sm font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 w-40"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-bold p-3 rounded-xl">
          ⚠️ {error}
        </div>
      )}

      {/* Metric Cards Grid */}
      {current && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t("Current Modal Benchmark")}</div>
            <div className="text-3xl font-black text-emerald-800 mt-1">
              ₹{current.current_price_per_quintal?.toLocaleString("en-IN")}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {t("₹{amount} / kg • Market: {market} • {source}", { amount: (current.current_price_per_quintal / 100).toFixed(2), market: t(current.market || "APMC"), source: t(current.source) })}
            </div>
            <div className="text-[10px] text-emerald-700 mt-1">{t("Live fetched {time}", { time: new Date(current.fetched_at).toLocaleString(locale) })}</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t("7-Day AI Price Forecast (7 Days)")}</div>
            <div className={`text-3xl font-black mt-1 ${trendUp ? "text-emerald-700" : "text-rose-600"}`}>
              ₹{current.predicted_price_per_quintal_7d?.toLocaleString("en-IN")}
              <span className="text-lg ml-1 font-bold">{trendUp ? `↑ (+${trendPct}%)` : `↓ (${trendPct}%)`}</span>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {t("₹{amount} / kg (Prophet ML Model)", { amount: (current.predicted_price_per_quintal_7d / 100).toFixed(2) })}
            </div>
          </div>

          <div className="bg-gradient-to-r from-emerald-900 to-teal-900 text-white p-5 rounded-2xl shadow-sm flex flex-col justify-between">
            <div className="text-xs text-amber-300 uppercase font-black">{t("Optimal Selling Window")}</div>
            <div className="text-lg font-black mt-1 text-white">
              {forecastHorizon?.optimal_sell_window ? t(forecastHorizon.optimal_sell_window) : t("Hold for 15-30 Days")}
            </div>
            <div className="text-xs text-emerald-200">
              {tn("Trend: {direction}", { direction: <span className="font-bold text-amber-300">{t(forecastHorizon?.trend_direction || "UPWARD")}</span> })}
            </div>
          </div>
        </div>
      )}

      {/* Multi-Horizon Price Outlook Table */}
      {forecastHorizon && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
              <span>🎯</span> {t("Multi-Horizon Price Outlook")}
            </h3>
            <span className="text-xs font-bold text-gray-500">{t("Confidence Band: 95% CI")}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-100 text-gray-700 font-bold border-b text-[11px]">
                <tr>
                  <th className="p-3">{t("Forecast Horizon")}</th>
                  <th className="p-3">{t("Predicted Price / qtl")}</th>
                  <th className="p-3">{t("Lower Bound (95% CI)")}</th>
                  <th className="p-3">{t("Upper Bound (95% CI)")}</th>
                  <th className="p-3">{t("Arrival Volume Pressure")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {forecastHorizon.horizons?.map((h, idx) => (
                  <tr key={idx} className={idx === 0 ? "bg-emerald-50/60 font-bold" : "hover:bg-gray-50"}>
                    <td className="p-3 font-bold text-gray-900">{t(h.horizon)}</td>
                    <td className="p-3 font-black text-emerald-800 text-sm">₹{h.predicted_price}</td>
                    <td className="p-3 text-gray-600">₹{h.lower_ci}</td>
                    <td className="p-3 text-emerald-700 font-semibold">₹{h.upper_ci}</td>
                    <td className="p-3">
                      <span
                        className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                          h.arrival_pressure === "High Arrivals"
                            ? "bg-rose-100 text-rose-800"
                            : h.arrival_pressure === "Lean Season Spike"
                            ? "bg-amber-100 text-amber-900"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {t(h.arrival_pressure)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 90-Day Trend Chart */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-3">
        <h2 className="text-base font-black text-gray-800 capitalize">
          {t("{crop} — 90-Day Historical Trend (APMC Modal Price History)", { crop: cropLabel(t, crop) })}
        </h2>
        {loading ? (
          <p className="text-sm text-gray-500">{t("Loading…")}</p>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="date" hide />
              <YAxis tick={{ fontSize: 11 }} width={55} domain={["dataMin - 100", "dataMax + 100"]} />
              <Tooltip formatter={(v) => [`₹${v}`, t("Modal Price / qtl")]} labelFormatter={(l) => t("Date: {date}", { date: l })} />
              <Line type="monotone" dataKey="price" stroke="#059669" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
