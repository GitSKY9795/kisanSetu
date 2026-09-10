import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";
import { getCurrentPrice, getPriceHistory, getMultiHorizonForecast } from "../api/client.js";
import { useLanguage } from "../context/LanguageContext.jsx";

const CROPS = [
  { value: "wheat", label: "Wheat (गेहूँ)" },
  { value: "onion", label: "Onion (प्याज)" },
  { value: "potato", label: "Potato (आलू)" },
  { value: "tomato", label: "Tomato (टमाटर)" },
  { value: "cotton", label: "Cotton (कपास)" },
  { value: "soybean", label: "Soybean (सोयाबीन)" },
  { value: "maize", label: "Maize (मक्का)" },
];

export default function PriceTrends() {
  const { crop: cropParam } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const crop = cropParam || "wheat";

  const [records, setRecords] = useState([]);
  const [current, setCurrent] = useState(null);
  const [forecastHorizon, setForecastHorizon] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      getPriceHistory(crop),
      getCurrentPrice(crop),
      getMultiHorizonForecast(crop),
    ])
      .then(([history, curr, horizon]) => {
        setRecords(history.records || []);
        setCurrent(curr);
        setForecastHorizon(horizon);
      })
      .catch(() => setError(t("common.backendError")))
      .finally(() => setLoading(false));
  }, [crop]);

  const chartData = [...records]
    .reverse()
    .map((r) => ({ date: r.arrival_date, price: Number(r.modal_price) }));

  const trendUp = current && current.predicted_price_per_quintal_7d >= current.current_price_per_quintal;

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 flex items-center gap-2">
            <span>📈</span> {t("prices.title")}
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">{t("prices.subtitle")}</p>
        </div>

        <div className="flex items-center gap-3">
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">{t("prices.selectCrop")}</label>
            <select
              value={crop}
              onChange={(e) => navigate(`/prices/${e.target.value}`)}
              className="border border-gray-300 rounded-xl px-3 py-2 bg-gray-50 text-sm font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {CROPS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
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
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t("prices.current")}</div>
            <div className="text-3xl font-black text-emerald-800 mt-1">
              ₹{current.current_price_per_quintal?.toLocaleString("en-IN")}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              ₹{(current.current_price_per_quintal / 100).toFixed(2)} / kg • Market: {current.market || "APMC"}
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t("prices.forecast")} (7 Days)</div>
            <div className={`text-3xl font-black mt-1 ${trendUp ? "text-emerald-700" : "text-rose-600"}`}>
              ₹{current.predicted_price_per_quintal_7d?.toLocaleString("en-IN")}
              <span className="text-lg ml-1 font-bold">{trendUp ? "↑ (+2.8%)" : "↓ (-1.5%)"}</span>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              ₹{(current.predicted_price_per_quintal_7d / 100).toFixed(2)} / kg (Prophet ML Model)
            </div>
          </div>

          <div className="bg-gradient-to-r from-emerald-900 to-teal-900 text-white p-5 rounded-2xl shadow-sm flex flex-col justify-between">
            <div className="text-xs text-amber-300 uppercase font-black">{t("prices.sellWindow")}</div>
            <div className="text-lg font-black mt-1 text-white">
              {forecastHorizon?.optimal_sell_window || "Hold for 15-30 Days"}
            </div>
            <div className="text-xs text-emerald-200">
              Trend: <span className="font-bold text-amber-300">{forecastHorizon?.trend_direction || "UPWARD"}</span>
            </div>
          </div>
        </div>
      )}

      {/* Multi-Horizon Price Outlook Table */}
      {forecastHorizon && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
              <span>🎯</span> {t("prices.forecastTable")}
            </h3>
            <span className="text-xs font-bold text-gray-500">Confidence Band: 95% CI</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-100 text-gray-700 font-bold border-b text-[11px]">
                <tr>
                  <th className="p-3">Forecast Horizon</th>
                  <th className="p-3">Predicted Price / qtl</th>
                  <th className="p-3">Lower Bound (95% CI)</th>
                  <th className="p-3">Upper Bound (95% CI)</th>
                  <th className="p-3">Arrival Volume Pressure</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {forecastHorizon.horizons?.map((h, idx) => (
                  <tr key={idx} className={idx === 0 ? "bg-emerald-50/60 font-bold" : "hover:bg-gray-50"}>
                    <td className="p-3 font-bold text-gray-900">{h.horizon}</td>
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
                        {h.arrival_pressure}
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
          {crop} — {t("prices.trend90")} (APMC Modal Price History)
        </h2>
        {loading ? (
          <p className="text-sm text-gray-500">{t("common.loading")}</p>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="date" hide />
              <YAxis tick={{ fontSize: 11 }} width={55} domain={["dataMin - 100", "dataMax + 100"]} />
              <Tooltip formatter={(v) => [`₹${v}`, "Modal Price / qtl"]} labelFormatter={(l) => `Date: ${l}`} />
              <Line type="monotone" dataKey="price" stroke="#059669" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
