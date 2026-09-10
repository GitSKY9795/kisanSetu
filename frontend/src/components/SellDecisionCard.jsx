import { useLanguage } from "../context/LanguageContext.jsx";

/**
 * Displays the AI Sell-Decision Engine's full recommendation, including the
 * plain-English reasons, which engine produced it (XGBoost vs rule-based
 * fallback), demand/weather context, top SHAP feature contributions, and the
 * suggested logistics plan — everything POST /decision/recommend returns.
 */
const ACTION_STYLES = {
  SELL_NOW: "bg-green-100 text-green-800 border-green-300",
  WAIT: "bg-yellow-100 text-yellow-800 border-yellow-300",
  STORE: "bg-blue-100 text-blue-800 border-blue-300",
  AGGREGATE: "bg-purple-100 text-purple-800 border-purple-300",
};

const ACTION_EMOJI = {
  SELL_NOW: "💰",
  WAIT: "⏳",
  STORE: "📦",
  AGGREGATE: "🤝",
};

export default function SellDecisionCard({ decision }) {
  const { t } = useLanguage();
  if (!decision) return null;

  const style = ACTION_STYLES[decision.action] || "bg-gray-100 text-gray-800 border-gray-300";
  const reasons = decision.reasons?.length ? decision.reasons : decision.reasoning ? [decision.reasoning] : [];
  const shapEntries = decision.shap_feature_contributions
    ? Object.entries(decision.shap_feature_contributions)
        .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
        .slice(0, 4)
    : [];
  const maxAbsShap = shapEntries.length ? Math.max(...shapEntries.map(([, v]) => Math.abs(v))) : 1;

  return (
    <div className={`rounded-xl border p-5 ${style}`}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-xl font-black flex items-center gap-2">
          <span>{ACTION_EMOJI[decision.action] || "🌾"}</span>
          {decision.action?.replace("_", " ")}
        </h3>
        <span className="text-sm opacity-75 font-semibold">
          {t("decision.confidence")}: {Math.round((decision.confidence || 0) * 100)}%
        </span>
      </div>

      {decision.engine && (
        <div className="text-[11px] font-bold opacity-60 mt-1 uppercase tracking-wide">
          {t("decision.engineUsed")}: {decision.engine}
        </div>
      )}

      {reasons.length > 0 && (
        <ul className="mt-3 space-y-1.5 text-sm">
          {reasons.map((r, i) => (
            <li key={i} className="flex gap-2">
              <span className="opacity-50">•</span>
              <span>{r}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm bg-white/50 rounded-lg p-3">
        <div>
          <div className="opacity-60 text-xs">{t("decision.currentPrice")}</div>
          <div className="font-bold">₹{decision.current_price_per_kg}/kg</div>
        </div>
        <div>
          <div className="opacity-60 text-xs">{t("decision.forecast7d")}</div>
          <div className="font-bold">₹{decision.predicted_price_per_kg_7d}/kg</div>
        </div>
        <div>
          <div className="opacity-60 text-xs">{t("decision.netRealization")}</div>
          <div className="font-bold">₹{decision.net_realization_per_kg}/kg</div>
        </div>
        {decision.demand_level && (
          <div>
            <div className="opacity-60 text-xs">{t("decision.demand")}</div>
            <div className="font-bold">{decision.demand_level}</div>
          </div>
        )}
        {decision.weather_condition && (
          <div>
            <div className="opacity-60 text-xs">{t("decision.weather")}</div>
            <div className="font-bold">{decision.weather_condition}</div>
          </div>
        )}
        {decision.logistics?.transport_cost_per_kg !== undefined && (
          <div>
            <div className="opacity-60 text-xs">{t("decision.logisticsPlan")}</div>
            <div className="font-bold">
              ₹{decision.logistics.transport_cost_per_kg}/kg · {decision.logistics.distance_km} km
            </div>
          </div>
        )}
      </div>

      {shapEntries.length > 0 && (
        <div className="mt-4 bg-white/50 rounded-lg p-3">
          <div className="text-xs font-bold opacity-70 mb-2">{t("decision.keyFactors")} (SHAP)</div>
          <div className="space-y-1.5">
            {shapEntries.map(([feat, val]) => (
              <div key={feat} className="flex items-center gap-2 text-xs">
                <span className="w-40 truncate opacity-70">{feat.replace(/_/g, " ")}</span>
                <div className="flex-1 h-2 bg-black/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${val >= 0 ? "bg-emerald-600" : "bg-rose-500"}`}
                    style={{ width: `${(Math.abs(val) / maxAbsShap) * 100}%` }}
                  />
                </div>
                <span className="w-12 text-right font-semibold">{val >= 0 ? "+" : ""}{val.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
