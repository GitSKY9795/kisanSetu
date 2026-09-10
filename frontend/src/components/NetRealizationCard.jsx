import { useLanguage } from "../context/LanguageContext.jsx";

/**
 * Derives its numbers directly from the live decision object returned by
 * POST /decision/recommend — no hardcoded prices. Shows an empty prompt state
 * until a decision has actually been calculated.
 */
export default function NetRealizationCard({ decision }) {
  const { t } = useLanguage();

  if (!decision) {
    return (
      <div className="p-5 rounded-xl border border-dashed border-gray-300 bg-white text-center text-sm text-gray-500">
        {t("netRealization.empty")}
      </div>
    );
  }

  const quotedPrice =
    decision.action === "SELL_NOW" ? decision.current_price_per_kg : decision.predicted_price_per_kg_7d;
  const transportCost = decision.logistics?.transport_cost_per_kg ?? 0;
  const netRealization = decision.net_realization_per_kg;
  const storageFees = Math.max((quotedPrice - transportCost) - netRealization, 0);
  const quantityKg = decision.quantity_kg || 0;
  const totalNet = (decision.total_net_realization ?? netRealization * quantityKg).toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  });

  return (
    <div className="p-5 rounded-xl border border-emerald-500 bg-emerald-50/60 shadow-md">
      <div className="flex justify-between items-start mb-3">
        <div>
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">{t("netRealization.title")}</span>
          <h3 className="text-lg font-extrabold text-gray-800">
            {decision.crop_name} · {quantityKg} kg
          </h3>
        </div>
        <span className="bg-emerald-600 text-white text-xs font-bold px-2.5 py-1 rounded-full uppercase">
          {t("netRealization.bestMatch")}
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 my-4 bg-white p-3 rounded-lg border border-gray-100 shadow-sm text-center">
        <div>
          <div className="text-xs text-gray-500">{t("netRealization.quotedPrice")}</div>
          <div className="text-base font-bold text-gray-800">₹{quotedPrice?.toFixed?.(2) ?? quotedPrice}/kg</div>
        </div>
        <div>
          <div className="text-xs text-gray-500">{t("netRealization.transportCost")}</div>
          <div className="text-base font-semibold text-rose-600">-₹{transportCost.toFixed(2)}/kg</div>
        </div>
        <div>
          <div className="text-xs text-gray-500">{t("netRealization.storageFees")}</div>
          <div className="text-base font-semibold text-rose-600">-₹{storageFees.toFixed(2)}/kg</div>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded p-1">
          <div className="text-xs text-emerald-700 font-bold">{t("netRealization.net")}</div>
          <div className="text-lg font-extrabold text-emerald-800">₹{netRealization?.toFixed?.(2) ?? netRealization}/kg</div>
        </div>
      </div>

      <div className="flex justify-between items-center text-sm font-semibold border-t pt-3 border-gray-200">
        <span className="text-gray-600">{t("netRealization.totalPayout")} ({quantityKg} kg):</span>
        <span className="text-xl font-black text-emerald-700">₹{totalNet}</span>
      </div>
    </div>
  );
}
