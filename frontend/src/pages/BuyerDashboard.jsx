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

const CROPS_OPTIONS = [
  { value: "Wheat", label: "Wheat (गेहूँ)" },
  { value: "Onion", label: "Onion (प्याज)" },
  { value: "Potato", label: "Potato (आलू)" },
  { value: "Tomato", label: "Tomato (टमाटर)" },
  { value: "Cotton", label: "Cotton (कपास)" },
  { value: "Soybean", label: "Soybean (सोयाबीन)" },
  { value: "Maize", label: "Maize (मक्का)" },
  { value: "Paddy", label: "Paddy / Rice (धान / चावल)" },
  { value: "Mustard", label: "Mustard (सरसों)" },
];

export default function BuyerDashboard() {
  const { t } = useLanguage();
  const [category, setCategory] = useState("Processor");
  const [requirements, setRequirements] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [trustProfile, setTrustProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const [form, setForm] = useState({
    buyer_name: "AgriCorp Processing Ltd",
    crop_name: "Wheat",
    quantity_kg: 2000,
    target_price: 26.0,
    district: "Ujjain",
  });

  const loadAll = () => {
    setLoading(true);
    Promise.all([
      listBuyerRequirements(),
      listTransactions(),
      getBuyerTrust("AgriCorp Processing Ltd"),
    ])
      .then(([reqs, txns, trust]) => {
        setRequirements(reqs || []);
        setTransactions(txns || []);
        setTrustProfile(trust);
      })
      .catch(() => setError(t("common.backendError")))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await createBuyerRequirement({
        buyer_name: form.buyer_name,
        buyer_category: category,
        crop_name: form.crop_name,
        quantity_kg: Number(form.quantity_kg),
        target_price_per_kg: Number(form.target_price),
        district: form.district,
      });
      loadAll();
    } catch (err) {
      setError(err.response?.data?.detail || t("common.backendError"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdvanceEscrow = async (txnId) => {
    try {
      await advanceEscrowStage(txnId);
      loadAll();
    } catch (err) {
      alert("Could not advance milestone");
    }
  };

  const handleViewInvoice = async (txnId) => {
    try {
      const inv = await getDigitalInvoice(txnId);
      setSelectedInvoice(inv);
    } catch (err) {
      alert("Could not load invoice");
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-xl flex justify-between items-center flex-wrap gap-4 border border-slate-800">
        <div>
          <span className="bg-amber-400 text-slate-950 text-xs font-black px-3.5 py-1 rounded-full uppercase tracking-wider">
            {t("buyer.title")}
          </span>
          <h1 className="text-2xl sm:text-3xl font-black mt-2 tracking-tight">AgriCorp Processing Ltd</h1>
          <p className="text-slate-300 text-xs sm:text-sm mt-1 font-medium">{t("buyer.subtitle")}</p>
        </div>

        {trustProfile && (
          <div className="bg-slate-800/90 p-4 rounded-2xl border border-slate-700 text-right space-y-1">
            <div className="text-xs text-slate-400 uppercase font-bold">Buyer Trust Score</div>
            <div className="text-3xl font-black text-emerald-400 flex items-center justify-end gap-1">
              <span>★</span> {trustProfile.trust_score} <span className="text-sm text-slate-400">/ 100</span>
            </div>
            <div className="text-[11px] text-emerald-300 font-semibold">
              {trustProfile.fulfillment_rate_pct}% Fulfillment • {trustProfile.avg_settlement_hours}h Avg Settlement
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Create Purchase Requirement Form */}
        <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-4">
          <h3 className="text-lg font-black text-gray-900 border-b pb-2.5 flex items-center gap-2">
            <span>📋</span> {t("buyer.postRequirement")}
          </h3>
          <form onSubmit={handleCreate} className="space-y-3.5 text-xs font-semibold">
            <div>
              <label className="block text-gray-700 font-bold mb-1">{t("buyer.buyerName")}</label>
              <input
                type="text"
                value={form.buyer_name}
                onChange={(e) => setForm({ ...form, buyer_name: e.target.value })}
                className="w-full border border-gray-300 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>
            <div>
              <label className="block text-gray-700 font-bold mb-1">{t("buyer.buyerCategory")}</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full border border-gray-300 rounded-xl p-2.5 bg-gray-50 font-bold focus:outline-none"
              >
                <option value="Processor">Food Processor (प्रोसेसर)</option>
                <option value="Wholesaler">Wholesaler (थोक विक्रेता)</option>
                <option value="Retailer">Retail Chain (रिटेलर)</option>
                <option value="Institutional">Institutional Buyer (संस्थागत)</option>
                <option value="Bulk">Bulk Exporter (थोक निर्यातक)</option>
              </select>
            </div>
            <div>
              <label className="block text-gray-700 font-bold mb-1">{t("buyer.requiredCrop")}</label>
              {/* Dropdown for crop selection */}
              <select
                value={form.crop_name}
                onChange={(e) => setForm({ ...form, crop_name: e.target.value })}
                className="w-full border border-gray-300 rounded-xl p-2.5 bg-gray-50 font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {CROPS_OPTIONS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-gray-700 font-bold mb-1">{t("buyer.requiredQuantity")}</label>
              <input
                type="number"
                value={form.quantity_kg}
                onChange={(e) => setForm({ ...form, quantity_kg: e.target.value })}
                className="w-full border border-gray-300 rounded-xl p-2.5 font-bold focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-gray-700 font-bold mb-1">{t("buyer.maxPrice")}</label>
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
              <label className="block text-gray-700 font-bold mb-1">{t("buyer.targetDistrict")}</label>
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
              {submitting ? t("buyer.posting") : t("buyer.postButton")}
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
              <span>📢</span> {t("buyer.activeRequirements")}
            </h3>
            {loading && <p className="text-sm text-gray-500">{t("common.loading")}</p>}
            <div className="space-y-3">
              {requirements.map((req) => (
                <div
                  key={req.id}
                  className="bg-gray-50 p-4 rounded-2xl border border-gray-200 flex justify-between items-center flex-wrap gap-2 hover:bg-white hover:border-emerald-300 transition"
                >
                  <div>
                    <div className="flex gap-2 items-center">
                      <span className="bg-slate-800 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full">
                        {req.buyer_category}
                      </span>
                      <span className="text-xs text-gray-500 font-bold">📍 {req.district}</span>
                    </div>
                    <h4 className="text-base font-black text-gray-900 mt-1">
                      {req.crop_name} ({req.quantity_kg?.toLocaleString()} kg)
                    </h4>
                    <p className="text-xs text-gray-500">Quality Spec: {req.quality_grade || "Grade A"}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-black text-emerald-700">Max ₹{req.target_price_per_kg}/kg</div>
                    <span className="text-[10px] text-gray-500">Est: ₹{(req.target_price_per_kg * req.quantity_kg).toLocaleString()}</span>
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
                  <span>🔒</span> 4-Stage Milestone Escrow Settlement Tracker
                </h3>
                <p className="text-xs text-gray-500">
                  Secured agricultural trade contracts with milestone fund protection.
                </p>
              </div>
              <span className="bg-emerald-100 text-emerald-800 text-xs font-black px-3 py-1 rounded-full">
                {transactions.length} Active Escrow Orders
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
                          Stage {txn.escrow_stage} of 4
                        </span>
                        <span className="text-xs font-bold text-gray-600 font-mono">{txn.invoice_no || txn.id}</span>
                      </div>
                      <h4 className="text-lg font-black text-gray-900 mt-1">
                        {txn.crop_name} • {txn.quantity_kg?.toLocaleString()} kg
                      </h4>
                      <p className="text-xs text-gray-600">
                        Farmer: <span className="font-bold text-gray-900">{txn.farmer_name}</span> • Rate: ₹{txn.agreed_price_per_kg}/kg
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-gray-500 uppercase">Escrow Value</div>
                      <div className="text-2xl font-black text-emerald-800">
                        ₹{txn.total_amount_inr?.toLocaleString()}
                      </div>
                      <div className="text-xs text-emerald-700 font-bold">{txn.payment_status}</div>
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
                        <div className="font-black text-xs">{st.stage}. {st.name}</div>
                        <div className="text-[9px] mt-0.5">{st.status}</div>
                      </div>
                    ))}
                  </div>

                  {/* Escrow Actions */}
                  <div className="flex justify-between items-center pt-2 border-t border-emerald-200 flex-wrap gap-2">
                    <button
                      onClick={() => handleViewInvoice(txn.id)}
                      className="text-xs font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1 cursor-pointer"
                    >
                      <span>📜</span> View Digital Invoice
                    </button>

                    {txn.escrow_stage < 4 && (
                      <button
                        onClick={() => handleAdvanceEscrow(txn.id)}
                        className="bg-emerald-700 hover:bg-emerald-600 text-white font-black px-4 py-1.5 rounded-xl text-xs shadow transition cursor-pointer"
                      >
                        Advance to Stage {txn.escrow_stage + 1} (Verify Milestone) →
                      </button>
                    )}
                    {txn.escrow_stage === 4 && (
                      <span className="text-xs font-black text-emerald-800 bg-emerald-100 px-3 py-1 rounded-lg">
                        ✓ Funds Disbursed to Farmer UPI
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
                <h3 className="text-lg font-black text-gray-900">{selectedInvoice.invoice_header.title}</h3>
                <p className="text-xs text-gray-500">
                  Invoice No: {selectedInvoice.invoice_header.invoice_no} • Date: {selectedInvoice.invoice_header.date}
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
                  <div className="font-bold text-gray-500">Seller / Farmer</div>
                  <div className="font-black text-gray-900">{selectedInvoice.parties.seller_farmer}</div>
                </div>
                <div>
                  <div className="font-bold text-gray-500">Buyer Entity</div>
                  <div className="font-black text-gray-900">{selectedInvoice.parties.buyer_organization}</div>
                </div>
              </div>

              <div className="border rounded-2xl p-3.5 space-y-1.5">
                <div className="flex justify-between font-semibold">
                  <span>Commodity:</span>
                  <span className="font-bold text-gray-900">{selectedInvoice.item_details.crop} ({selectedInvoice.item_details.quality_grade})</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Quantity:</span>
                  <span>{selectedInvoice.item_details.quantity_kg} kg</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Rate:</span>
                  <span>₹{selectedInvoice.item_details.unit_price_inr} / kg</span>
                </div>
                <div className="flex justify-between font-black text-sm text-emerald-800 pt-1 border-t">
                  <span>Gross Settlement:</span>
                  <span>₹{selectedInvoice.item_details.gross_amount_inr?.toLocaleString()}</span>
                </div>
              </div>

              <div className="bg-emerald-50 p-3 rounded-2xl border border-emerald-200 text-emerald-900 font-semibold text-[11px]">
                🔒 {selectedInvoice.settlement.guarantee}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                onClick={() => window.print()}
                className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-4 py-2 rounded-xl text-xs cursor-pointer"
              >
                🖨️ Print Slip
              </button>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
