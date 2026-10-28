import React, { useEffect, useState } from "react";
import { listWarehouses, calculatePledgeLoan, calculateTransport } from "../api/client.js";
import { useLanguage } from "../context/LanguageContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useGeolocation } from "../hooks/useGeolocation.js";
import { tServer } from "../i18n/serverText.js";

export default function LogisticsStorage() {
  const { t, tn } = useLanguage();
  const { profile } = useAuth();
  const geo = useGeolocation();
  const [activeTab, setActiveTab] = useState("warehouses"); // "warehouses" | "pledge" | "freight"
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [districtFilter, setDistrictFilter] = useState("All");

  // Pledge Loan state
  const [pledgeForm, setPledgeForm] = useState({
    crop_name: "Wheat",
    quantity_quintals: 50,
    current_mandi_price_per_quintal: 2450,
    tenure_months: 3,
  });
  const [loanResult, setLoanResult] = useState(null);
  const [calculatingLoan, setCalculatingLoan] = useState(false);

  // Freight state
  const [freightForm, setFreightForm] = useState({
    origin_district: "Ujjain",
    destination_district: "Indore",
    quantity_kg: 1000,
    is_fpo_pooled: true,
  });
  const [freightResult, setFreightResult] = useState(null);
  const [calculatingFreight, setCalculatingFreight] = useState(false);
  const [originTouched, setOriginTouched] = useState(false);

  // Default the freight origin to the farmer's real district (profile, then live
  // geolocation) once known — but never override a value they've already edited.
  useEffect(() => {
    if (originTouched) return;
    const detected = profile?.district || geo.district;
    if (detected) setFreightForm((f) => ({ ...f, origin_district: detected }));
  }, [profile?.district, geo.district, originTouched]);

  useEffect(() => {
    setLoading(true);
    listWarehouses()
      .then((data) => setWarehouses(data.warehouses || []))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const handleCalculatePledge = async (e) => {
    e.preventDefault();
    setCalculatingLoan(true);
    try {
      const res = await calculatePledgeLoan({
        ...pledgeForm,
        quantity_quintals: Number(pledgeForm.quantity_quintals),
        current_mandi_price_per_quintal: Number(pledgeForm.current_mandi_price_per_quintal),
        tenure_months: Number(pledgeForm.tenure_months),
      });
      setLoanResult(res);
    } catch (err) {
      alert(t("Error calculating pledge loan"));
    } finally {
      setCalculatingLoan(false);
    }
  };

  const handleCalculateFreight = async (e) => {
    e.preventDefault();
    setCalculatingFreight(true);
    try {
      const res = await calculateTransport({
        ...freightForm,
        quantity_kg: Number(freightForm.quantity_kg),
      });
      setFreightResult(res);
    } catch (err) {
      alert(t("Error calculating freight"));
    } finally {
      setCalculatingFreight(false);
    }
  };

  const filteredWarehouses =
    districtFilter === "All"
      ? warehouses
      : warehouses.filter((w) => w.district.toLowerCase() === districtFilter.toLowerCase());

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950 text-white p-6 rounded-2xl shadow-xl flex justify-between items-center flex-wrap gap-4 border border-slate-800">
        <div>
          <span className="bg-emerald-400 text-slate-950 text-xs font-black px-3.5 py-1 rounded-full uppercase tracking-wider">
            {t("WDRA Logistics & Storage Infrastructure")}
          </span>
          <h1 className="text-2xl sm:text-3xl font-black mt-2">{t("WDRA Cold Storage & Smart Logistics")}</h1>
          <p className="text-slate-300 text-xs sm:text-sm mt-1">{t("Overcome distress selling with verified warehousing, live occupancy, and post-harvest pledge loans.")}</p>
        </div>
        <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700 text-right backdrop-blur-sm">
          <div className="text-xs text-amber-300 uppercase font-bold">{t("e-NWR Post-Harvest Financing")}</div>
          <div className="text-2xl font-black text-white mt-0.5">{t("70% Collateral Liquidity")}</div>
          <div className="text-[11px] text-emerald-300">{t("NABARD / RBI Subsidized 7% Interest")}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 bg-white p-1.5 rounded-2xl shadow-sm gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab("warehouses")}
          className={`px-4 py-2.5 rounded-xl text-xs font-black transition whitespace-nowrap flex items-center gap-2 ${
            activeTab === "warehouses" ? "bg-emerald-600 text-white shadow" : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          {t("🏬 Verified Cold Storages & Warehouses")}
        </button>
        <button
          onClick={() => setActiveTab("pledge")}
          className={`px-4 py-2.5 rounded-xl text-xs font-black transition whitespace-nowrap flex items-center gap-2 ${
            activeTab === "pledge" ? "bg-emerald-600 text-white shadow" : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          {t("💰 e-NWR Post-Harvest Pledge Loan")}
        </button>
        <button
          onClick={() => setActiveTab("freight")}
          className={`px-4 py-2.5 rounded-xl text-xs font-black transition whitespace-nowrap flex items-center gap-2 ${
            activeTab === "freight" ? "bg-emerald-600 text-white shadow" : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          {t("🚚 Shared Freight Pooling")}
        </button>
      </div>

      {/* Tab 1: WDRA Warehouses Directory */}
      {activeTab === "warehouses" && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex justify-between items-center flex-wrap gap-3">
            <div>
              <h3 className="text-lg font-black text-gray-900">{t("Verified WDRA Cold Storages & Scientific Silos")}</h3>
              <p className="text-xs text-gray-500">{t("Live capacity monitoring with insurance and electronic receipt backing.")}</p>
            </div>
            <div className="flex gap-2">
              {["All", "Ujjain", "Indore", "Dewas", "Ratlam"].map((d) => (
                <button
                  key={d}
                  onClick={() => setDistrictFilter(d)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    districtFilter === d ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {t(d)}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredWarehouses.map((wh) => (
              <div
                key={wh.id}
                className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:border-emerald-300 transition space-y-4"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="bg-blue-100 text-blue-900 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase">
                      {t(wh.type)}
                    </span>
                    <h4 className="text-lg font-black text-gray-900 mt-1">{t(wh.name)}</h4>
                    <p className="text-xs text-gray-500">{t("📍 {district}, {state} ({km} km away)", { district: t(wh.district), state: t(wh.state), km: wh.distance_km })}</p>
                  </div>
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full">
                    {t("WDRA Accredited")}
                  </span>
                </div>

                {/* Capacity Dial */}
                <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100 space-y-1.5">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-gray-600">{t("Live Capacity Occupancy")}:</span>
                    <span className="text-emerald-800 font-black">{t("{pct}% Full ({mt} MT Available)", { pct: wh.occupancy_pct, mt: wh.available_capacity_mt })}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-emerald-600 h-2.5 rounded-full"
                      style={{ width: `${wh.occupancy_pct}%` }}
                    ></div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs bg-emerald-50/50 p-3 rounded-xl border border-emerald-100">
                  <div>
                    <div className="text-gray-500 font-semibold">{t("Daily Storage Rate")}</div>
                    <div className="font-black text-emerald-900">₹{wh.daily_rate_per_quintal_inr} {t("/ qtl / day")}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 font-semibold">{t("Temperature")}</div>
                    <div className="font-black text-emerald-900">{tServer(t, wh.temperature_celsius)}</div>
                  </div>
                </div>

                <div className="text-[11px] text-gray-600 font-medium">
                  {tn("Suitable Crops: {crops}", { crops: <span className="font-bold text-gray-900">{wh.suitable_crops?.map((c) => t(c)).join(", ")}</span> })}
                </div>

                <div className="flex justify-between items-center pt-2 border-t text-xs">
                  <span className="text-gray-500 font-mono">{wh.contact_phone}</span>
                  <button
                    onClick={() => {
                      setActiveTab("pledge");
                      setPledgeForm((p) => ({ ...p, crop_name: wh.suitable_crops[0] }));
                    }}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-4 py-2 rounded-xl text-xs transition"
                  >
                    {t("Deposit & Pledge Loan →")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: e-NWR Pledge Loan Calculator */}
      {activeTab === "pledge" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
            <h3 className="text-lg font-black text-gray-900 border-b pb-2.5">
              {t("💰 Calculate Post-Harvest Pledge Loan")}
            </h3>
            <form onSubmit={handleCalculatePledge} className="space-y-3.5 text-xs font-semibold">
              <div>
                <label className="block text-gray-700 font-bold mb-1">{t("Crop Stored")}</label>
                <input
                  type="text"
                  value={pledgeForm.crop_name}
                  onChange={(e) => setPledgeForm({ ...pledgeForm, crop_name: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl p-2.5 font-bold"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700 font-bold mb-1">{t("Quantity (Quintals - 100kg each)")}</label>
                <input
                  type="number"
                  value={pledgeForm.quantity_quintals}
                  onChange={(e) => setPledgeForm({ ...pledgeForm, quantity_quintals: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl p-2.5 font-bold"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700 font-bold mb-1">{t("Current Mandi Price (₹/Quintal)")}</label>
                <input
                  type="number"
                  value={pledgeForm.current_mandi_price_per_quintal}
                  onChange={(e) => setPledgeForm({ ...pledgeForm, current_mandi_price_per_quintal: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl p-2.5 font-black text-emerald-800"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700 font-bold mb-1">{t("Tenure (Months)")}</label>
                <select
                  value={pledgeForm.tenure_months}
                  onChange={(e) => setPledgeForm({ ...pledgeForm, tenure_months: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl p-2.5 bg-gray-50 font-bold"
                >
                  <option value="1">{t("1 Month")}</option>
                  <option value="2">{t("2 Months")}</option>
                  <option value="3">{t("3 Months (Recommended for Lean Season)")}</option>
                  <option value="6">{t("6 Months")}</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={calculatingLoan}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3 rounded-xl shadow transition text-xs"
              >
                {calculatingLoan ? t("Calculating Eligibility…") : t("Calculate Loan Eligibility")}
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 space-y-4">
            {loanResult ? (
              <div className="bg-white p-6 rounded-2xl border-2 border-emerald-500 shadow-md space-y-5 animate-fadeIn">
                <div className="flex justify-between items-start flex-wrap gap-2 border-b pb-3">
                  <div>
                    <span className="bg-amber-400 text-slate-900 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase">
                      {t("Approved e-NWR Pledge Facility")}
                    </span>
                    <h3 className="text-2xl font-black text-emerald-950 mt-1">
                      {t("₹{amount} Eligible Instant Loan", { amount: loanResult.eligible_pledge_loan_inr?.toLocaleString() })}
                    </h3>
                    <p className="text-xs text-gray-600">
                      {t("Commodity Value: ₹{amount} (70% LTV Norm)", { amount: loanResult.estimated_commodity_value_inr?.toLocaleString() })}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-gray-500 uppercase">{t("Subsidized Interest")}</span>
                    <div className="text-xl font-black text-emerald-700">{t("7.0% p.a.")}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div className="bg-gray-50 p-3 rounded-xl border">
                    <div className="text-gray-500 font-bold">{t("Monthly Interest")}</div>
                    <div className="text-base font-black text-gray-900 mt-0.5">₹{loanResult.monthly_interest_inr}</div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-xl border">
                    <div className="text-gray-500 font-bold">{t("Total Interest ({months} mo)", { months: loanResult.tenure_months })}</div>
                    <div className="text-base font-black text-gray-900 mt-0.5">₹{loanResult.total_interest_inr}</div>
                  </div>
                  <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                    <div className="text-emerald-800 font-bold">{t("Disbursement Speed")}</div>
                    <div className="text-sm font-black text-emerald-950 mt-0.5">{t("Instant UPI / Bank")}</div>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-xl border space-y-2 text-xs">
                  <div className="font-bold text-gray-900">{t("Partner Financing Banks (Direct e-NWR API):")}</div>
                  <div className="flex gap-2 flex-wrap">
                    {loanResult.participating_banks?.map((b) => (
                      <span key={b} className="bg-white border text-gray-700 font-bold px-2.5 py-1 rounded-lg">
                        🏦 {t(b)}
                      </span>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => alert(t("e-NWR electronic pledge application initiated! Verification OTP sent."))}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3 rounded-xl shadow-lg transition text-xs"
                >
                  {t("Apply for Instant e-NWR Loan Release →")}
                </button>
              </div>
            ) : (
              <div className="bg-white p-10 rounded-2xl border border-dashed border-gray-300 text-center space-y-2">
                <div className="text-4xl">💰</div>
                <h4 className="text-lg font-bold text-gray-800">{t("e-NWR 70% Instant Pledge Financing")}</h4>
                <p className="text-xs text-gray-500 max-w-md mx-auto">{t("Deposit produce in WDRA warehouse, receive 70% value as instant loan at 7% subsidized interest, sell when prices peak!")}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Shared Freight Pooling */}
      {activeTab === "freight" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
            <h3 className="text-lg font-black text-gray-900 border-b pb-2.5">
              {t("🚚 Shared Freight Route Calculator")}
            </h3>
            <form onSubmit={handleCalculateFreight} className="space-y-3.5 text-xs font-semibold">
              <div>
                <label className="block text-gray-700 font-bold mb-1">{t("Origin District")}</label>
                <input
                  type="text"
                  value={freightForm.origin_district}
                  onChange={(e) => {
                    setOriginTouched(true);
                    setFreightForm({ ...freightForm, origin_district: e.target.value });
                  }}
                  className="w-full border rounded-xl p-2.5"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-bold mb-1">{t("Destination Mandi / Buyer Hub")}</label>
                <input
                  type="text"
                  value={freightForm.destination_district}
                  onChange={(e) => setFreightForm({ ...freightForm, destination_district: e.target.value })}
                  className="w-full border rounded-xl p-2.5"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-bold mb-1">{t("Lot Quantity (kg)")}</label>
                <input
                  type="number"
                  value={freightForm.quantity_kg}
                  onChange={(e) => setFreightForm({ ...freightForm, quantity_kg: e.target.value })}
                  className="w-full border rounded-xl p-2.5"
                />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="fpoPool"
                  checked={freightForm.is_fpo_pooled}
                  onChange={(e) => setFreightForm({ ...freightForm, is_fpo_pooled: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 rounded"
                />
                <label htmlFor="fpoPool" className="text-xs font-bold text-gray-700 cursor-pointer">
                  {t("Enable FPO Shared Logistics Pooling (35% Subsidy)")}
                </label>
              </div>

              <button
                type="submit"
                disabled={calculatingFreight}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-3 rounded-xl shadow transition text-xs"
              >
                {calculatingFreight ? t("Calculating Route…") : t("Calculate Freight Cost")}
              </button>
            </form>
          </div>

          <div className="lg:col-span-2">
            {freightResult ? (
              <div className="bg-white p-6 rounded-2xl border border-emerald-300 shadow space-y-4">
                <div className="flex justify-between items-start border-b pb-3">
                  <div>
                    <span
                      className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                        freightResult.data_source === "OpenRouteService live route"
                          ? "bg-emerald-100 text-emerald-900"
                          : "bg-amber-100 text-amber-900"
                      }`}
                    >
                      {freightResult.data_source === "OpenRouteService live route"
                        ? t("OpenRouteService Live Route")
                        : t("Estimated (route service unavailable)")}
                    </span>
                    <h3 className="text-xl font-black text-gray-900 mt-1">
                      {freightResult.origin} → {freightResult.destination} ({freightResult.distance_km} {t("km")})
                    </h3>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-500 font-bold">{t("Estimated Delivery")}</div>
                    <div className="text-lg font-black text-emerald-700">{t("{hours} Hours", { hours: freightResult.estimated_transit_hours })}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div className="bg-gray-50 p-3 rounded-xl border">
                    <div className="text-gray-500 font-bold">{t("Transport Rate")}</div>
                    <div className="text-lg font-black text-gray-900">₹{freightResult.transport_cost_per_kg} {t("/ kg")}</div>
                  </div>
                  <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                    <div className="text-emerald-800 font-bold">{t("Total Freight Payout")}</div>
                    <div className="text-lg font-black text-emerald-950">
                      ₹{Number(freightResult.total_transport_cost ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div className="bg-teal-50 p-3 rounded-xl border border-teal-200">
                    <div className="text-teal-800 font-bold">{t("Shared Pool Savings")}</div>
                    <div className="text-lg font-black text-teal-950">
                      {freightForm.is_fpo_pooled ? t("35% Saved") : t("Standard Solo")}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white p-10 rounded-2xl border border-dashed text-center text-gray-500 text-xs">
                {t("Select your route and click calculate to check shared truck pooling rates.")}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
