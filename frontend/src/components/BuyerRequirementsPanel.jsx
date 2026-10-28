import { useEffect, useState } from "react";
import { listBuyerRequirements } from "../api/client.js";
import { useLanguage } from "../context/LanguageContext.jsx";
import { tStatus } from "../i18n/serverText.js";

function formatPostedAt(value, t, locale) {
  if (!value) return t("Recently posted");
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? t("Recently posted") : t("Posted {date}", { date: date.toLocaleDateString(locale) });
}

export default function BuyerRequirementsPanel({ compact = false }) {
  const { t, tn, locale } = useLanguage();
  const [requirements, setRequirements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    listBuyerRequirements()
      .then((data) => {
        if (active) setRequirements(data || []);
      })
      .catch(() => {
        if (active) setError(t("Buyer requirements could not be loaded."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="bg-white p-6 rounded-2xl border border-amber-200 shadow-sm space-y-4">
      <div className="flex justify-between items-start gap-3 flex-wrap">
        <div>
          <p className="text-[11px] font-black uppercase tracking-wider text-amber-700">{t("Shared buyer demand")}</p>
          <h2 className="text-xl font-black text-gray-900 mt-1">{t("What buyers need right now")}</h2>
          <p className="text-xs text-gray-500 mt-1">{t("Buyer requirements are visible to farmers and FPO aggregators as soon as they are posted.")}</p>
        </div>
        <span className="bg-amber-100 text-amber-900 text-xs font-black px-3 py-1.5 rounded-full border border-amber-200">
          {t("{count} active", { count: requirements.length })}
        </span>
      </div>

      {loading && <p className="text-sm text-gray-500">{t("Loading live requirements...")}</p>}
      {error && <p className="bg-red-50 border border-red-200 text-red-700 text-xs font-bold p-3 rounded-xl">{error}</p>}
      {!loading && !error && requirements.length === 0 && (
        <p className="text-sm text-gray-500 bg-gray-50 rounded-xl p-4">{t("No active buyer requirements yet.")}</p>
      )}

      <div className={`grid gap-3 ${compact ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"}`}>
        {requirements.map((requirement) => (
          <article key={requirement.id} className="border border-amber-100 bg-amber-50/40 rounded-xl p-4 space-y-3">
            <div className="flex justify-between items-start gap-2">
              <div>
                <h3 className="font-black text-gray-900">{t(requirement.crop_name)}</h3>
                <p className="text-[11px] text-gray-500">{requirement.buyer_name} • {t(requirement.buyer_category)}</p>
              </div>
              <span className="text-[10px] font-black uppercase text-emerald-700 bg-emerald-100 px-2 py-1 rounded-full">{tStatus(t, requirement.status)}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-white rounded-lg border border-amber-100 p-2">
                <div className="text-gray-500">{t("Required volume")}</div>
                <div className="font-black text-gray-900">{requirement.quantity_kg?.toLocaleString()} {t("kg")}</div>
              </div>
              <div className="bg-white rounded-lg border border-amber-100 p-2">
                <div className="text-gray-500">{t("Target price")}</div>
                <div className="font-black text-emerald-700">₹{requirement.target_price_per_kg}{t("/kg")}</div>
              </div>
            </div>
            <div className="flex justify-between items-center text-[11px] text-gray-600">
              <span>{tn("Grade: {grade}", { grade: <strong>{t(requirement.quality_grade || "Grade A")}</strong> })}</span>
              <span>📍 {requirement.district}</span>
            </div>
            <div className="text-[10px] text-gray-400">{formatPostedAt(requirement.created_at, t, locale)}</div>
          </article>
        ))}
      </div>
    </section>
  );
}
