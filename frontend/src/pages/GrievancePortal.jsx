import React, { useEffect, useState } from "react";
import { listGrievances, getGrievanceStats, createGrievance, resolveGrievance, listTransactions } from "../api/client.js";
import { useLanguage } from "../context/LanguageContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const CATEGORIES = [
  "Quality Specification Discrepancy",
  "Weight Shortage",
  "Payment Delay",
  "Transit Spoilage",
];

export default function GrievancePortal() {
  const { t } = useLanguage();
  const { role } = useAuth();
  const [grievances, setGrievances] = useState([]);
  const [stats, setStats] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("All");

  // Raise dispute modal
  const [showRaiseModal, setShowRaiseModal] = useState(false);
  const [form, setForm] = useState({
    transaction_id: "",
    category: CATEGORIES[0],
    disputed_amount_inr: 2500,
    description: "",
  });
  const [submitting, setSubmitting] = useState(false);

  // Resolve modal (admin only)
  const [activeTicketToResolve, setActiveTicketToResolve] = useState(null);
  const [resolutionNotes, setResolutionNotes] = useState(
    "Dispute board verified e-Pramaan certificate. Full disputed amount released to farmer."
  );

  const loadData = () => {
    setLoading(true);
    Promise.all([listGrievances(), getGrievanceStats(), listTransactions()])
      .then(([grvs, st, txns]) => {
        setGrievances(grvs || []);
        setStats(st);
        setTransactions(txns || []);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRaiseGrievance = async (e) => {
    e.preventDefault();
    if (!form.transaction_id) return;
    setSubmitting(true);
    try {
      await createGrievance({ ...form, disputed_amount_inr: Number(form.disputed_amount_inr) });
      setShowRaiseModal(false);
      loadData();
    } catch (err) {
      alert(err.response?.data?.detail || "Error submitting grievance ticket");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResolveGrievance = async (e) => {
    e.preventDefault();
    if (!activeTicketToResolve) return;
    try {
      await resolveGrievance(activeTicketToResolve.id, { resolution_summary: resolutionNotes });
      setActiveTicketToResolve(null);
      loadData();
    } catch (err) {
      alert(err.response?.data?.detail || "Error resolving grievance");
    }
  };

  const filtered =
    statusFilter === "All"
      ? grievances
      : grievances.filter((g) => g.status.toLowerCase() === statusFilter.toLowerCase());

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-rose-950 via-slate-900 to-emerald-950 text-white p-6 rounded-2xl shadow-xl flex justify-between items-center flex-wrap gap-4 border border-slate-800">
        <div>
          <span className="bg-rose-400 text-slate-950 text-xs font-black px-3.5 py-1 rounded-full uppercase tracking-wider">
            Fair Trade Assurance Board
          </span>
          <h1 className="text-2xl sm:text-3xl font-black mt-2">{t("grievances.title")}</h1>
          <p className="text-slate-300 text-xs sm:text-sm mt-1">{t("grievances.subtitle")}</p>
        </div>
        {(role === "FARMER" || role === "BUYER") && (
          <button
            onClick={() => setShowRaiseModal(true)}
            className="bg-rose-500 hover:bg-rose-400 text-white font-black px-5 py-3 rounded-xl text-xs shadow-lg transition"
          >
            {t("grievances.raiseDispute")}
          </button>
        )}
      </div>

      {/* KPI Stats Bar */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white p-4 rounded-2xl border border-gray-200 text-center shadow-sm">
            <div className="text-xs text-gray-500 font-bold uppercase">Total Grievances</div>
            <div className="text-2xl font-black text-gray-900 mt-1">{stats.total_grievances}</div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-gray-200 text-center shadow-sm">
            <div className="text-xs text-gray-500 font-bold uppercase">Resolution Rate</div>
            <div className="text-2xl font-black text-emerald-700 mt-1">{stats.resolution_rate_pct}%</div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-gray-200 text-center shadow-sm">
            <div className="text-xs text-gray-500 font-bold uppercase">Average Resolution</div>
            <div className="text-2xl font-black text-blue-700 mt-1">{stats.avg_resolution_time_hours} Hours</div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-gray-200 text-center shadow-sm">
            <div className="text-xs text-gray-500 font-bold uppercase">Escrow Protection</div>
            <div className="text-2xl font-black text-emerald-800 mt-1">{stats.escrow_protection_guarantee}</div>
          </div>
        </div>
      )}

      {/* Tickets List */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
        <div className="flex justify-between items-center flex-wrap gap-3 border-b pb-3">
          <div>
            <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
              <span>⚖️</span> {t("grievances.activeTickets")}
            </h3>
            <p className="text-xs text-gray-500">Track mediation milestones and settlement status.</p>
          </div>
          <div className="flex gap-2">
            {["All", "UNDER_MEDIATION", "RESOLVED"].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  statusFilter === st ? "bg-slate-900 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {st.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>

        {loading && <p className="text-sm text-gray-500">{t("common.loading")}</p>}

        <div className="space-y-4">
          {filtered.map((grv) => (
            <div
              key={grv.id}
              className={`p-5 rounded-2xl border space-y-3 transition ${
                grv.status === "RESOLVED"
                  ? "bg-emerald-50/40 border-emerald-300"
                  : "bg-rose-50/40 border-rose-300"
              }`}
            >
              <div className="flex justify-between items-start flex-wrap gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-black text-gray-700">{grv.ticket_no}</span>
                    <span
                      className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase ${
                        grv.status === "RESOLVED"
                          ? "bg-emerald-600 text-white"
                          : "bg-amber-400 text-slate-950"
                      }`}
                    >
                      {grv.status}
                    </span>
                  </div>
                  <h4 className="text-lg font-black text-gray-900 mt-1">{grv.category}</h4>
                  <p className="text-xs text-gray-600">
                    Raised by: <span className="font-bold text-gray-900">{grv.raised_by_name}</span> ({grv.raised_by_type})
                    {grv.against_party && <> against <span className="font-bold text-gray-900">{grv.against_party}</span></>}
                  </p>
                </div>

                <div className="text-right">
                  <div className="text-xs text-gray-500 font-bold uppercase">Disputed Amount</div>
                  <div className="text-2xl font-black text-rose-700">
                    ₹{grv.disputed_amount_inr?.toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-gray-200 text-xs space-y-1.5">
                <div className="text-gray-800 font-medium">
                  <span className="font-bold text-gray-900">Summary: </span>
                  {grv.description}
                </div>
                {grv.resolution_summary && (
                  <div className="text-emerald-900 font-bold bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                    Resolution: {grv.resolution_summary}
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center pt-2 border-t text-xs">
                <span className="text-gray-500">
                  {grv.status === "RESOLVED"
                    ? `Resolved At: ${grv.resolved_at?.slice(0, 10)}`
                    : `SLA Deadline: ${grv.sla_deadline?.slice(0, 10)}`}
                </span>

                {grv.status !== "RESOLVED" && role === "ADMIN" && (
                  <button
                    onClick={() => setActiveTicketToResolve(grv)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-1.5 rounded-xl text-xs transition"
                  >
                    Mediate & Settle Dispute →
                  </button>
                )}
              </div>
            </div>
          ))}

          {!loading && filtered.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-8">No grievance tickets found in this category.</p>
          )}
        </div>
      </div>

      {/* Raise Dispute Modal */}
      {showRaiseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-6 space-y-4 animate-fadeIn">
            <div className="flex justify-between items-start border-b pb-3">
              <div>
                <h3 className="text-xl font-black text-gray-900">Raise Dispute / Grievance Ticket</h3>
                <p className="text-xs text-gray-500">Fast-track resolution guaranteed by KisanSetu.</p>
              </div>
              <button onClick={() => setShowRaiseModal(false)} className="text-gray-400 hover:text-gray-700 text-2xl font-bold">×</button>
            </div>

            {transactions.length === 0 ? (
              <p className="text-sm text-gray-500">You don't have any transactions to raise a dispute against yet.</p>
            ) : (
              <form onSubmit={handleRaiseGrievance} className="space-y-3.5 text-xs font-semibold">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Transaction</label>
                  <select
                    value={form.transaction_id}
                    onChange={(e) => setForm({ ...form, transaction_id: e.target.value })}
                    className="w-full border rounded-xl p-2.5 bg-gray-50 font-bold"
                    required
                  >
                    <option value="">Select a transaction…</option>
                    {transactions.map((txn) => (
                      <option key={txn.id} value={txn.id}>
                        {txn.invoice_no} — {txn.crop_name} ({txn.quantity_kg} kg)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Dispute Category</label>
                    <select
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                      className="w-full border rounded-xl p-2.5 bg-gray-50 font-bold"
                    >
                      {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Disputed Amount (₹)</label>
                    <input
                      type="number"
                      value={form.disputed_amount_inr}
                      onChange={(e) => setForm({ ...form, disputed_amount_inr: e.target.value })}
                      className="w-full border rounded-xl p-2.5 font-bold text-rose-700"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">Detailed Description of Issue</label>
                  <textarea
                    rows={3}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full border rounded-xl p-2.5 text-xs"
                    required
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t">
                  <button type="button" onClick={() => setShowRaiseModal(false)} className="bg-gray-100 text-gray-700 font-bold px-4 py-2 rounded-xl">Cancel</button>
                  <button type="submit" disabled={submitting} className="bg-rose-600 hover:bg-rose-500 text-white font-black px-5 py-2 rounded-xl shadow">
                    {submitting ? "Submitting Ticket…" : "Submit Dispute"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Resolve Mediation Modal (admin only) */}
      {activeTicketToResolve && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4">
            <h3 className="text-xl font-black text-gray-900">
              Mediate & Settle Ticket {activeTicketToResolve.ticket_no}
            </h3>
            <form onSubmit={handleResolveGrievance} className="space-y-3.5 text-xs font-semibold">
              <div>
                <label className="block text-gray-700 font-bold mb-1">Mediation Resolution Order</label>
                <textarea
                  rows={3}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  className="w-full border rounded-xl p-2.5 text-xs"
                  required
                />
              </div>
              <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 text-emerald-900">
                Settlement Payout: <span className="font-black">₹{activeTicketToResolve.disputed_amount_inr}</span> will be disbursed to {activeTicketToResolve.raised_by_name} via Escrow release.
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setActiveTicketToResolve(null)} className="bg-gray-100 text-gray-700 font-bold px-4 py-2 rounded-xl">Cancel</button>
                <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-5 py-2 rounded-xl shadow">Confirm Settlement</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
