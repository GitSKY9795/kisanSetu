import { useEffect, useState } from "react";
import {
  listBuyerRequirements,
  createBuyerRequirement,
  listTransactions,
  advanceEscrowStage,
  getDigitalInvoice,
  getBuyerTrust,
} from "../api/client.js";
import { useLanguage } from "../context/LanguageContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { T } from "../i18n/mark.js";
import { tServer, tStatus } from "../i18n/serverText.js";

const CROPS_OPTIONS = [
  { value: "Wheat" },
  { value: "Onion" },
  { value: "Potato" },
  { value: "Tomato" },
  { value: "Cotton" },
  { value: "Soybean" },
  { value: "Maize" },
  { value: "Paddy", label: T("Paddy / Rice") },
  { value: "Mustard" },
];

export default function BuyerDashboard() {
  const { t, tn } = useLanguage();
  const { profile } = useAuth();
  const [requirements, setRequirements] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [trustProfile, setTrustProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const [form, setForm] = useState({
    crop_name: "Wheat",
    quantity_kg: 2000,
    target_price: 26.0,
    district: "Ujjain",
  });

  const loadAll = () => {
    setLoading(true);
    const trustCall = profile?.id ? getBuyerTrust(profile.id) : Promise.resolve(null);
    Promise.all([listBuyerRequirements(), listTransactions(), trustCall])
      .then(([reqs, txns, trust]) => {
        setRequirements(reqs || []);
        setTransactions(txns || []);
        setTrustProfile(trust);
      })
      .catch(() => setError(t("Could not reach the KisanSetu backend. Ensure FastAPI is running on http://localhost:8000.")))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadAll();
  }, [profile?.id]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await createBuyerRequirement({
        crop_name: form.crop_name,
        quantity_kg: Number(form.quantity_kg),
        target_price_per_kg: Number(form.target_price),
        district: form.district,
      });
      loadAll();
    } catch (err) {
      setError(err.response?.data?.detail || t("Could not reach the KisanSetu backend. Ensure FastAPI is running on http://localhost:8000."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdvanceEscrow = async (txnId) => {
    try {
      await advanceEscrowStage(txnId);
      loadAll();
    } catch (err) {
      alert(t("Could not advance milestone"));
    }
  };

  const handleViewInvoice = async (txnId) => {
    try {
      const inv = await getDigitalInvoice(txnId);
      setSelectedInvoice(inv);
    } catch (err) {
      alert(t("Could not load invoice"));
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-xl flex justify-between items-center flex-wrap gap-4 border border-slate-800">
        <div>
          <span className="bg-amber-400 text-slate-950 text-xs font-black px-3.5 py-1 rounded-full uppercase tracking-wider">
            {t("Buyer Procurement Portal")}
          </span>
          <h1 className="text-2xl sm:text-3xl font-black mt-2 tracking-tight">{profile?.organization || profile?.name || t("Your Buyer Account")}</h1>
          <p className="text-slate-300 text-xs sm:text-sm mt-1 font-medium">{t("Source verified produce lots directly from farmers & FPOs with quality certifications and escrow protection.")}{profile?.buyer_category ? ` • ${t(profile.buyer_category)}` : ""}</p>
        </div>

        {trustProfile && (
          <div className="bg-slate-800/90 p-4 rounded-2xl border border-slate-700 text-right space-y-1">
            <div className="text-xs text-slate-400 uppercase font-bold">{t("Buyer Trust Score")}</div>
            <div className="text-3xl font-black text-emerald-400 flex items-center justify-end gap-1">
              <span>★</span> {trustProfile.trust_score} <span className="text-sm text-slate-400">/ 100</span>
            </div>
            <div className="text-[11px] text-emerald-300 font-semibold">
              {t("{pct}% Fulfillment • {hours}h Avg Settlement", { pct: trustProfile.fulfillment_rate_pct, hours: trustProfile.avg_settlement_hours })}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Create Purchase Requirement Form */}
        <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-4">
          <h3 className="text-lg font-black text-gray-900 border-b pb-2.5 flex items-center gap-2">
            <span>📋</span> {t("Post Bulk Procurement Requirement")}
          </h3>
          <form onSubmit={handleCreate} className="space-y-3.5 text-xs font-semibold">
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-gray-600">
              {tn("Posting as {name} ({category})", { name: <span className="font-black text-gray-900">{profile?.organization || profile?.name}</span>, category: t(profile?.buyer_category || "Buyer") })}
            </div>
            <div>
              <label className="block text-gray-700 font-bold mb-1">{t("Target Crop")}</label>
              {/* Dropdown for crop selection */}
              <select
                value={form.crop_name}
                onChange={(e) => setForm({ ...form, crop_name: e.target.value })}
                className="w-full border border-gray-300 rounded-xl p-2.5 bg-gray-50 font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {CROPS_OPTIONS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {t(c.label || c.value)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-gray-700 font-bold mb-1">{t("Procurement Volume (kg)")}</label>
              <input
                type="number"
                value={form.quantity_kg}
                onChange={(e) => setForm({ ...form, quantity_kg: e.target.value })}
                className="w-full border border-gray-300 rounded-xl p-2.5 font-bold focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-gray-700 font-bold mb-1">{t("Target Price (₹/kg)")}</label>
              <input
                type="number"
                step="0.5"
                value={form.target_price}
                onChange={(e) => setForm({ ...form, target_price: e.target.value })}
                className="w-full border border-gray-300 rounded-xl p-2.5 font-black text-emerald-800 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-gray-700 font-bold mb-1">{t("Target Sourcing District")}</label>
              <input
                type="text"
                value={form.district}
                onChange={(e) => setForm({ ...form, district: e.target.value })}
                className="w-full border border-gray-300 rounded-xl p-2.5 font-bold focus:outline-none"
                required
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-3 rounded-xl transition disabled:opacity-60 shadow-md text-xs cursor-pointer"
            >
              {submitting ? t("Broadcasting Requirement…") : t("+ Broadcast Requirement")}
            </button>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-bold p-3 rounded-xl">
                ⚠️ {error}
              </div>
            )}
          </form>
        </div>

        {/* Right Column: Active Requirements & Milestone Escrow Orders */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Requirements */}
          <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-4">
            <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
              <span>📢</span> {t("Active Procurement Requirements")}
            </h3>
            {loading && <p className="text-sm text-gray-500">{t("Loading…")}</p>}
            <div className="space-y-3">
              {requirements.map((req) => (
                <div
                  key={req.id}
                  className="bg-gray-50 p-4 rounded-2xl border border-gray-200 flex justify-between items-center flex-wrap gap-2 hover:bg-white hover:border-emerald-300 transition"
                >
                  <div>
                    <div className="flex gap-2 items-center">
                      <span className="bg-slate-800 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full">
                        {t(req.buyer_category)}
                      </span>
                      <span className="text-xs text-gray-500 font-bold">📍 {req.district}</span>
                    </div>
                    <h4 className="text-base font-black text-gray-900 mt-1">
                      {t("{crop} ({qty} kg)", { crop: t(req.crop_name), qty: req.quantity_kg?.toLocaleString() })}
                    </h4>
                    <p className="text-xs text-gray-500">{t("Quality Spec: {grade}", { grade: t(req.quality_grade || "Grade A") })}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-black text-emerald-700">{t("Max ₹{price}/kg", { price: req.target_price_per_kg })}</div>
                    <span className="text-[10px] text-gray-500">{t("Est: ₹{amount}", { amount: (req.target_price_per_kg * req.quantity_kg).toLocaleString() })}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 4-Stage Milestone Escrow Orders Tracker */}
          <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                  <span>🔒</span> {t("4-Stage Milestone Escrow Settlement Tracker")}
                </h3>
                <p className="text-xs text-gray-500">
                  {t("Secured agricultural trade contracts with milestone fund protection.")}
                </p>
              </div>
              <span className="bg-emerald-100 text-emerald-800 text-xs font-black px-3 py-1 rounded-full">
                {t("{count} Active Escrow Orders", { count: transactions.length })}
              </span>
            </div>

            <div className="space-y-4">
              {transactions.map((txn) => (
                <div
                  key={txn.id}
                  className="border border-emerald-200 rounded-2xl p-5 bg-emerald-50/30 space-y-3"
                >
                  <div className="flex justify-between items-start flex-wrap gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="bg-emerald-800 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full">
                          {t("Stage {n} of 4", { n: txn.escrow_stage })}
                        </span>
                        <span className="text-xs font-bold text-gray-600 font-mono">{txn.invoice_no || txn.id}</span>
                      </div>
                      <h4 className="text-lg font-black text-gray-900 mt-1">
                        {t("{crop} • {qty} kg", { crop: t(txn.crop_name), qty: txn.quantity_kg?.toLocaleString() })}
                      </h4>
                      <p className="text-xs text-gray-600">
                        {tn("Farmer: {name} • Rate: ₹{rate}/kg", { name: <span className="font-bold text-gray-900">{txn.farmer_name}</span>, rate: txn.agreed_price_per_kg })}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-gray-500 uppercase">{t("Escrow Value")}</div>
                      <div className="text-2xl font-black text-emerald-800">
                        ₹{txn.total_amount_inr?.toLocaleString()}
                      </div>
                      <div className="text-xs text-emerald-700 font-bold">{tStatus(t, txn.payment_status)}</div>
                    </div>
                  </div>

                  {/* 4-Stage Progress Stepper */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-center text-[10px] font-bold">
                    {txn.stages_timeline?.map((st) => (
                      <div
                        key={st.stage}
                        className={`p-2 rounded-xl border ${
                          st.status === "COMPLETED"
                            ? "bg-emerald-600 text-white border-emerald-700 shadow-sm"
                            : "bg-white text-gray-400 border-gray-200"
                        }`}
                      >
                        <div className="font-black text-xs">{st.stage}. {t(st.name)}</div>
                        <div className="text-[9px] mt-0.5">{tStatus(t, st.status)}</div>
                      </div>
                    ))}
                  </div>

                  {/* Escrow Actions */}
                  <div className="flex justify-between items-center pt-2 border-t border-emerald-200 flex-wrap gap-2">
                    <button
                      onClick={() => handleViewInvoice(txn.id)}
                      className="text-xs font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1 cursor-pointer"
                    >
                      <span>📜</span> {t("View Digital Invoice")}
                    </button>

                    {txn.escrow_stage < 4 && (
                      <button
                        onClick={() => handleAdvanceEscrow(txn.id)}
                        className="bg-emerald-700 hover:bg-emerald-600 text-white font-black px-4 py-1.5 rounded-xl text-xs shadow transition cursor-pointer"
                      >
                        {t("Advance to Stage {n} (Verify Milestone) →", { n: txn.escrow_stage + 1 })}
                      </button>
                    )}
                    {txn.escrow_stage === 4 && (
                      <span className="text-xs font-black text-emerald-800 bg-emerald-100 px-3 py-1 rounded-lg">
                        {t("✓ Funds Disbursed to Farmer UPI")}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Invoice Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-start border-b pb-3">
              <div>
                <h3 className="text-lg font-black text-gray-900">{t(selectedInvoice.invoice_header.title)}</h3>
                <p className="text-xs text-gray-500">
                  {t("Invoice No: {no} • Date: {date}", { no: selectedInvoice.invoice_header.invoice_no, date: selectedInvoice.invoice_header.date })}
                </p>
              </div>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="text-gray-400 hover:text-gray-700 text-2xl font-bold cursor-pointer"
              >
                ×
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3 rounded-2xl">
                <div>
                  <div className="font-bold text-gray-500">{t("Seller / Farmer")}</div>
                  <div className="font-black text-gray-900">{selectedInvoice.parties.seller_farmer}</div>
                </div>
                <div>
                  <div className="font-bold text-gray-500">{t("Buyer Entity")}</div>
                  <div className="font-black text-gray-900">{selectedInvoice.parties.buyer_organization}</div>
                </div>
              </div>

              <div className="border rounded-2xl p-3.5 space-y-1.5">
                <div className="flex justify-between font-semibold">
                  <span>{t("Commodity:")}</span>
                  <span className="font-bold text-gray-900">{t(selectedInvoice.item_details.crop)} ({tServer(t, selectedInvoice.item_details.quality_grade)})</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>{t("Quantity:")}</span>
                  <span>{selectedInvoice.item_details.quantity_kg} {t("kg")}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>{t("Rate:")}</span>
                  <span>₹{selectedInvoice.item_details.unit_price_inr} {t("/ kg")}</span>
                </div>
                <div className="flex justify-between font-black text-sm text-emerald-800 pt-1 border-t">
                  <span>{t("Gross Settlement:")}</span>
                  <span>₹{selectedInvoice.item_details.gross_amount_inr?.toLocaleString()}</span>
                </div>
              </div>

              <div className="bg-emerald-50 p-3 rounded-2xl border border-emerald-200 text-emerald-900 font-semibold text-[11px]">
                🔒 {t(selectedInvoice.settlement.guarantee)}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                onClick={() => window.print()}
                className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-4 py-2 rounded-xl text-xs cursor-pointer"
              >
                {t("🖨️ Print Slip")}
              </button>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl text-xs cursor-pointer"
              >
                {t("Close")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
