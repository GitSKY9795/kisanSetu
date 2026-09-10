import React, { useEffect, useState } from "react";
import { listFPOPools, addFPOPoolMember, createFPOPool, getFpoPayoutLedger } from "../api/client.js";
import { useLanguage } from "../context/LanguageContext.jsx";

export default function FPODashboard() {
  const { t } = useLanguage();
  const [pools, setPools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberQty, setNewMemberQty] = useState(250);
  const [selectedPoolForMember, setSelectedPoolForMember] = useState(null);

  // New pool modal
  const [showCreatePool, setShowCreatePool] = useState(false);
  const [poolForm, setPoolForm] = useState({
    fpo_name: "Pragati Kisan Producer Co-op",
    crop_name: "Wheat",
    variety: "Sharbati Gold",
    district: "Ujjain",
    target_price_per_kg: 27.5,
    target_quantity_kg: 10000,
  });

  // Payout Ledger Modal
  const [activeLedger, setActiveLedger] = useState(null);
  const [loadingLedger, setLoadingLedger] = useState(false);

  const loadPools = () => {
    setLoading(true);
    listFPOPools()
      .then((data) => setPools(data || []))
      .catch(() => setError(t("common.backendError")))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadPools();
  }, []);

  const handleAddMember = async (poolId) => {
    if (!newMemberName) return;
    setError(null);
    try {
      await addFPOPoolMember(poolId, { farmer_name: newMemberName, quantity_kg: Number(newMemberQty) });
      setNewMemberName("");
      setSelectedPoolForMember(null);
      loadPools();
    } catch (err) {
      setError(err.response?.data?.detail || t("common.backendError"));
    }
  };

  const handleCreatePool = async (e) => {
    e.preventDefault();
    try {
      await createFPOPool({
        ...poolForm,
        target_price_per_kg: Number(poolForm.target_price_per_kg),
        target_quantity_kg: Number(poolForm.target_quantity_kg),
      });
      setShowCreatePool(false);
      loadPools();
    } catch (err) {
      alert("Error creating aggregation pool");
    }
  };

  const handleViewLedger = async (poolId) => {
    setLoadingLedger(true);
    try {
      const data = await getFpoPayoutLedger(poolId);
      setActiveLedger(data);
    } catch (err) {
      alert("Could not load payout ledger");
    } finally {
      setLoadingLedger(false);
    }
  };

  const totalAggregated = pools.reduce((acc, p) => acc + (p.total_quantity_kg || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 text-white p-6 rounded-2xl shadow-xl flex justify-between items-center flex-wrap gap-4 border border-teal-800">
        <div>
          <span className="bg-teal-500 text-teal-950 text-xs font-black px-3.5 py-1 rounded-full uppercase tracking-wider">
            FPO Aggregation Hub
          </span>
          <h1 className="text-2xl sm:text-3xl font-black mt-2">{t("fpo.title")}</h1>
          <p className="text-teal-200 text-xs sm:text-sm mt-1">{t("fpo.subtitle")}</p>
        </div>
        <div className="flex gap-4 items-center flex-wrap">
          <div className="text-right bg-teal-950/60 p-4 rounded-2xl border border-teal-700 backdrop-blur-sm">
            <div className="text-xs text-teal-300 uppercase font-bold">{t("fpo.totalAggregated")}</div>
            <div className="text-3xl font-black text-amber-300">{totalAggregated.toLocaleString()} kg</div>
          </div>
          <button
            onClick={() => setShowCreatePool(true)}
            className="bg-amber-400 hover:bg-amber-300 text-emerald-950 font-black px-4 py-3 rounded-xl text-xs shadow-lg transition"
          >
            + Create New Aggregated Lot
          </button>
        </div>
      </div>

      {/* Active Aggregation Pools */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
        <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
          <span>📦</span> {t("fpo.activePools")}
        </h2>

        {loading && <p className="text-sm text-gray-500">{t("common.loading")}</p>}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-bold p-3 rounded-xl">
            ⚠️ {error}
          </div>
        )}

        {pools.map((pool) => {
          const progressPct = Math.min(
            100,
            Math.round((pool.total_quantity_kg / (pool.target_quantity_kg || 10000)) * 100)
          );

          return (
            <div
              key={pool.id}
              className="border-2 border-emerald-300 rounded-2xl p-6 bg-emerald-50/40 space-y-4"
            >
              <div className="flex justify-between items-start flex-wrap gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold text-emerald-700 uppercase">
                      📍 {pool.district} • {pool.variety}
                    </span>
                    <span className="bg-emerald-200 text-emerald-900 text-[10px] font-black px-2 py-0.5 rounded-full">
                      {pool.quality_grade || "Grade A"}
                    </span>
                  </div>
                  <h3 className="text-2xl font-black text-gray-900 mt-1">
                    {pool.crop_name} Corporate Bulk Lot
                  </h3>
                </div>

                <div className="text-right">
                  <span className="bg-amber-100 text-amber-900 text-xs font-black px-3 py-1 rounded-full border border-amber-300">
                    Target Rate: ₹{pool.target_price_per_kg}/kg
                  </span>
                  <div className="text-3xl font-black text-emerald-900 mt-1">
                    {pool.total_quantity_kg?.toLocaleString()} kg
                  </div>
                </div>
              </div>

              {/* Volume Milestone Progress Bar */}
              <div className="space-y-1.5 bg-white p-4 rounded-xl border border-emerald-200">
                <div className="flex justify-between text-xs font-bold text-gray-700">
                  <span>
                    Aggregated: <span className="text-emerald-800 font-black">{pool.total_quantity_kg?.toLocaleString()} kg</span>
                  </span>
                  <span>
                    Corporate Contract Target:{" "}
                    <span className="text-gray-900 font-black">{(pool.target_quantity_kg || 10000).toLocaleString()} kg</span>
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-emerald-600 to-teal-500 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${progressPct}%` }}
                  ></div>
                </div>
                <div className="text-right text-[11px] font-extrabold text-emerald-700">
                  {progressPct}% of bulk procurement threshold reached
                </div>
              </div>

              {/* Member Contribution Roster */}
              <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-2">
                <h4 className="text-xs font-black text-gray-700 uppercase tracking-wider">
                  👨‍🌾 {t("fpo.memberContributions")} ({pool.contributions?.length || 0} Members)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  {pool.contributions?.map((m, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between items-center bg-gray-50 p-2.5 rounded-lg border border-gray-100"
                    >
                      <span className="font-bold text-gray-800">{m.farmer_name}</span>
                      <span className="text-emerald-800 font-black">{m.quantity_kg?.toLocaleString()} kg</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Bar */}
              <div className="flex justify-between items-center pt-2 border-t border-emerald-200 flex-wrap gap-2">
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    placeholder={t("fpo.farmerNamePlaceholder")}
                    value={selectedPoolForMember === pool.id ? newMemberName : ""}
                    onChange={(e) => {
                      setSelectedPoolForMember(pool.id);
                      setNewMemberName(e.target.value);
                    }}
                    className="text-xs border border-gray-300 rounded-xl px-3 py-2 w-48 focus:outline-none"
                  />
                  <input
                    type="number"
                    placeholder={t("fpo.qtyPlaceholder")}
                    value={selectedPoolForMember === pool.id ? newMemberQty : 250}
                    onChange={(e) => {
                      setSelectedPoolForMember(pool.id);
                      setNewMemberQty(e.target.value);
                    }}
                    className="text-xs border border-gray-300 rounded-xl px-3 py-2 w-24 focus:outline-none"
                  />
                  <button
                    onClick={() => handleAddMember(pool.id)}
                    className="bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-black px-4 py-2 rounded-xl transition"
                  >
                    {t("fpo.addMember")}
                  </button>
                </div>

                <button
                  onClick={() => handleViewLedger(pool.id)}
                  className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-black px-4 py-2 rounded-xl transition flex items-center gap-1.5 shadow"
                >
                  <span>📊</span> {t("fpo.viewLedger")}
                </button>
              </div>
            </div>
          );
        })}

        {!loading && pools.length === 0 && (
          <p className="text-sm text-gray-500">{t("fpo.empty")}</p>
        )}
      </div>

      {/* Payout Ledger Modal */}
      {activeLedger && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl p-6 space-y-4 animate-fadeIn">
            <div className="flex justify-between items-start border-b pb-3">
              <div>
                <span className="bg-teal-100 text-teal-900 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase">
                  Transparent Payout Ledger
                </span>
                <h3 className="text-xl font-black text-gray-900 mt-1">
                  {activeLedger.fpo_name} • {activeLedger.crop_name} Pooled Lot
                </h3>
                <p className="text-xs text-gray-500">
                  Total Volume: {activeLedger.total_quantity_kg?.toLocaleString()} kg @ ₹{activeLedger.agreed_selling_price_per_kg}/kg
                </p>
              </div>
              <button
                onClick={() => setActiveLedger(null)}
                className="text-gray-400 hover:text-gray-700 text-2xl font-bold"
              >
                ×
              </button>
            </div>

            {/* Summary KPI Pills */}
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="bg-gray-50 p-3 rounded-xl border">
                <div className="text-gray-500 font-bold">Gross Revenue</div>
                <div className="text-lg font-black text-gray-900">₹{activeLedger.gross_revenue_inr?.toLocaleString()}</div>
              </div>
              <div className="bg-amber-50 p-3 rounded-xl border border-amber-200">
                <div className="text-amber-800 font-bold">FPO Fee (2%)</div>
                <div className="text-lg font-black text-amber-900">-₹{activeLedger.fpo_operational_fee_inr?.toLocaleString()}</div>
              </div>
              <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                <div className="text-emerald-800 font-bold">Net Distributed to Farmers</div>
                <div className="text-lg font-black text-emerald-900">₹{activeLedger.total_net_distributable_inr?.toLocaleString()}</div>
              </div>
            </div>

            {/* Member Ledger Table */}
            <div className="overflow-x-auto max-h-80 border rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-100 font-bold text-gray-700 border-b">
                  <tr>
                    <th className="p-3">Farmer Member</th>
                    <th className="p-3">Quantity</th>
                    <th className="p-3">Share %</th>
                    <th className="p-3">Gross Amount</th>
                    <th className="p-3">Net Payout</th>
                    <th className="p-3 text-right">Extra vs Mandi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {activeLedger.ledger?.map((m, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="p-3 font-bold text-gray-900">{m.farmer_name}</td>
                      <td className="p-3">{m.quantity_kg?.toLocaleString()} kg</td>
                      <td className="p-3">{m.share_pct}%</td>
                      <td className="p-3">₹{m.gross_amount_inr?.toLocaleString()}</td>
                      <td className="p-3 font-black text-emerald-800">₹{m.net_payout_inr?.toLocaleString()}</td>
                      <td className="p-3 text-right font-black text-emerald-700">
                        +₹{m.extra_income_vs_mandi_inr?.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                onClick={() => window.print()}
                className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-4 py-2 rounded-xl text-xs"
              >
                🖨️ Print Ledger Slip
              </button>
              <button
                onClick={() => setActiveLedger(null)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-2 rounded-xl text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Pool Modal */}
      {showCreatePool && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4">
            <h3 className="text-xl font-black text-gray-900">Create Produce Aggregation Lot</h3>
            <form onSubmit={handleCreatePool} className="space-y-3 text-xs font-semibold">
              <div>
                <label className="block text-gray-700 font-bold mb-1">Crop Name</label>
                <input
                  type="text"
                  value={poolForm.crop_name}
                  onChange={(e) => setPoolForm({ ...poolForm, crop_name: e.target.value })}
                  className="w-full border rounded-xl p-2.5 font-bold"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700 font-bold mb-1">Variety</label>
                <input
                  type="text"
                  value={poolForm.variety}
                  onChange={(e) => setPoolForm({ ...poolForm, variety: e.target.value })}
                  className="w-full border rounded-xl p-2.5 font-bold"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700 font-bold mb-1">District</label>
                <input
                  type="text"
                  value={poolForm.district}
                  onChange={(e) => setPoolForm({ ...poolForm, district: e.target.value })}
                  className="w-full border rounded-xl p-2.5 font-bold"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700 font-bold mb-1">Target Rate (₹/kg)</label>
                <input
                  type="number"
                  step="0.5"
                  value={poolForm.target_price_per_kg}
                  onChange={(e) => setPoolForm({ ...poolForm, target_price_per_kg: e.target.value })}
                  className="w-full border rounded-xl p-2.5 font-black text-emerald-800"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700 font-bold mb-1">Target Lot Quantity (kg)</label>
                <input
                  type="number"
                  value={poolForm.target_quantity_kg}
                  onChange={(e) => setPoolForm({ ...poolForm, target_quantity_kg: e.target.value })}
                  className="w-full border rounded-xl p-2.5 font-bold"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowCreatePool(false)}
                  className="bg-gray-100 text-gray-700 font-bold px-4 py-2 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-5 py-2 rounded-xl shadow"
                >
                  Create Pool
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
