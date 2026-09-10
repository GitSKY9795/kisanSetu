import React, { useEffect, useState } from "react";
import { getAdminMetrics, getAdminDisputes } from "../api/client.js";
import { useLanguage } from "../context/LanguageContext.jsx";

export default function AdminDashboard() {
  const { t } = useLanguage();
  const [metrics, setMetrics] = useState(null);
  const [disputes, setDisputes] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([getAdminMetrics(), getAdminDisputes()])
      .then(([m, d]) => {
        setMetrics(m);
        setDisputes(d);
      })
      .catch(() => setError(t("common.backendError")));
  }, []);

  const stats = metrics
    ? [
        { label: t("admin.totalFarmers"), value: metrics.total_farmers.toLocaleString(), color: "border-emerald-500 text-emerald-800" },
        { label: t("admin.activeBuyers"), value: metrics.active_buyers.toLocaleString(), color: "border-blue-500 text-blue-800" },
        { label: t("admin.registeredFpos"), value: metrics.registered_fpos.toLocaleString(), color: "border-purple-500 text-purple-800" },
        { label: t("admin.activeListings"), value: metrics.active_listings.toLocaleString(), color: "border-amber-500 text-amber-800" },
        { label: t("admin.transactionVolume"), value: `₹${(metrics.completed_transactions_value_inr / 100000).toFixed(1)}L`, color: "border-teal-500 text-teal-800" },
        { label: t("admin.totalVolume"), value: `${metrics.total_produce_volume_tonnes.toLocaleString()} Tonnes`, color: "border-indigo-500 text-indigo-800" },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-lg flex justify-between items-center">
        <div>
          <span className="bg-slate-700 text-amber-400 text-xs font-extrabold px-3 py-1 rounded-full uppercase">
            Admin Console
          </span>
          <h1 className="text-2xl font-black mt-2">{t("admin.title")}</h1>
          <p className="text-slate-300 text-sm mt-1">{t("admin.subtitle")}</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-semibold p-3 rounded-lg">
          ⚠️ {error}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {stats.map((s, idx) => (
          <div key={idx} className={`bg-white p-5 rounded-xl border-l-4 ${s.color} border-y border-r border-gray-200 shadow-sm`}>
            <div className="text-xs font-bold text-gray-500 uppercase">{s.label}</div>
            <div className="text-2xl font-black mt-1">{s.value}</div>
          </div>
        ))}
        {!metrics && !error && <p className="text-sm text-gray-500 col-span-3">{t("common.loading")}</p>}
      </div>

      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <h2 className="text-lg font-bold text-gray-800 mb-4">{t("admin.disputes")}</h2>
        <div className="space-y-3">
          {disputes.map((d) => (
            <div key={d.id} className="border border-rose-200 bg-rose-50/50 rounded-lg p-4 flex justify-between items-center flex-wrap gap-3">
              <div>
                <span className="bg-rose-600 text-white text-xs font-extrabold px-2.5 py-0.5 rounded">
                  ORDER #{d.order_id?.replace(/\D/g, "") || d.id}
                </span>
                <div className="font-bold text-gray-900 mt-1">{d.farmer_name} (Farmer) vs {d.buyer_name} (Buyer)</div>
                <p className="text-xs text-gray-600">{d.reason}</p>
              </div>
              <button className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2 rounded-lg transition">
                {t("admin.review")}
              </button>
            </div>
          ))}
          {disputes.length === 0 && !error && <p className="text-sm text-gray-500">{t("admin.noDisputes")}</p>}
        </div>
      </div>
    </div>
  );
}
