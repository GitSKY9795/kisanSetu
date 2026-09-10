import { useEffect, useState } from "react";
import SellDecisionCard from "../components/SellDecisionCard.jsx";
import NetRealizationCard from "../components/NetRealizationCard.jsx";
import QualityGradingCard from "../components/QualityGradingCard.jsx";
import { getDecision, getCurrentPrice, getNearbyMandis, listMarketplaceOffers, acceptMarketplaceOffer, counterMarketplaceOffer } from "../api/client.js";
import { useLanguage } from "../context/LanguageContext.jsx";
import { useAssistant } from "../context/AssistantContext.jsx";

const CROPS = [
  { value: "Wheat", label: "Wheat (गेहूँ)" },
  { value: "Onion", label: "Onion (प्याज)" },
  { value: "Potato", label: "Potato (आलू)" },
  { value: "Tomato", label: "Tomato (टमाटर)" },
  { value: "Cotton", label: "Cotton (कपास)" },
  { value: "Soybean", label: "Soybean (सोयाबीन)" },
  { value: "Maize", label: "Maize (मक्का)" },
];

export default function FarmerDashboard() {
  const { t } = useLanguage();
  const { openAssistant } = useAssistant();

  const [activeTab, setActiveTab] = useState("decision"); // "decision" | "arbitrage" | "quality" | "offers"

  const [form, setForm] = useState({
    crop_name: "Wheat",
    quantity_kg: 500,
    district: "Ujjain",
    harvest_date: "Ready for Harvest (3 days)",
    storage_capacity_kg: 600,
  });

  const [decision, setDecision] = useState(null);
  const [currentPriceInfo, setCurrentPriceInfo] = useState(null);
  const [arbitrageData, setArbitrageData] = useState(null);
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingArbitrage, setLoadingArbitrage] = useState(false);
  const [error, setError] = useState(null);
  const [counterPrice, setCounterPrice] = useState("");
  const [activeOfferForCounter, setActiveOfferForCounter] = useState(null);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const loadOffers = () => {
    listMarketplaceOffers()
      .then((data) => setOffers(data || []))
      .catch(() => {});
  };

  useEffect(() => {
    loadOffers();
  }, []);

  const handleEvaluate = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const priceData = await getCurrentPrice(form.crop_name, { district: form.district });
      const currentPricePerKg = priceData.current_price_per_quintal / 100;
      setCurrentPriceInfo(priceData);

      const result = await getDecision({
        crop_name: form.crop_name,
        current_price_per_kg: Number(currentPricePerKg.toFixed(2)),
        quantity_kg: Number(form.quantity_kg),
        storage_capacity_kg: Number(form.storage_capacity_kg),
        district: form.district,
        transport_cost_per_kg: 1.0,
        storage_cost_per_kg: 0.5,
      });
      setDecision(result);

      // Also load nearby mandis arbitrage
      loadArbitrage();
    } catch (err) {
      setError(err.response?.data?.detail || t("common.backendError"));
    } finally {
      setLoading(false);
    }
  };

  const loadArbitrage = async () => {
    setLoadingArbitrage(true);
    try {
      const qtyQuintals = Number(form.quantity_kg) / 100;
      const data = await getNearbyMandis(form.crop_name.toLowerCase(), { quantity_quintals: qtyQuintals });
      setArbitrageData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingArbitrage(false);
    }
  };

  const handleAcceptOffer = async (offerId) => {
    try {
      await acceptMarketplaceOffer(offerId);
      loadOffers();
    } catch (err) {
      alert("Could not accept offer: " + (err.response?.data?.detail || err.message));
    }
  };

  const handleCounterOffer = async (e) => {
    e.preventDefault();
    if (!activeOfferForCounter || !counterPrice) return;
    try {
      await counterMarketplaceOffer(activeOfferForCounter.id, {
        counter_price_per_kg: Number(counterPrice),
        updated_terms: "Farmer requested price revision based on AGMARK Grade A e-Pramaan certificate.",
      });
      setActiveOfferForCounter(null);
      setCounterPrice("");
      loadOffers();
    } catch (err) {
      alert("Could not submit counter-offer");
    }
  };

  const askAboutThisCrop = () => {
    openAssistant({
      mode: "voice",
      context: { crop_name: form.crop_name, quantity_kg: Number(form.quantity_kg), district: form.district },
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-900 text-white p-6 rounded-2xl shadow-xl flex justify-between items-center flex-wrap gap-4 border border-emerald-800">
        <div>
          <span className="bg-amber-400 text-emerald-950 text-xs font-black px-3.5 py-1 rounded-full uppercase tracking-wider shadow-sm">
            {t("farmer.badge")}
          </span>
          <h1 className="text-2xl sm:text-3xl font-black mt-2 tracking-tight">{t("farmer.welcome")}</h1>
          <p className="text-emerald-200 text-sm mt-1 flex items-center gap-1.5 font-medium">
            <span>📍</span> {t("farmer.location")}
          </p>
        </div>
        {currentPriceInfo && (
          <div className="bg-emerald-900/60 p-4 rounded-2xl border border-emerald-700 text-right backdrop-blur-sm">
            <div className="text-xs text-emerald-300 uppercase font-bold tracking-wider">
              {t("farmer.marketPrice")} ({form.crop_name})
            </div>
            <div className="text-3xl font-black text-amber-300">
              ₹{currentPriceInfo.current_price_per_quintal?.toLocaleString("en-IN")}{" "}
              <span className="text-sm font-semibold text-emerald-200">/ qtl</span>
            </div>
            <div className="text-xs text-emerald-300 mt-0.5">
              ≈ ₹{(currentPriceInfo.current_price_per_quintal / 100).toFixed(2)} / kg
            </div>
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-gray-200 bg-white p-1.5 rounded-2xl shadow-sm gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab("decision")}
          className={`px-4 py-2.5 rounded-xl text-xs font-black transition whitespace-nowrap flex items-center gap-2 ${
            activeTab === "decision"
              ? "bg-emerald-600 text-white shadow-md"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          {t("farmer.tabDecision")}
        </button>
        <button
          onClick={() => {
            setActiveTab("arbitrage");
            if (!arbitrageData) loadArbitrage();
          }}
          className={`px-4 py-2.5 rounded-xl text-xs font-black transition whitespace-nowrap flex items-center gap-2 ${
            activeTab === "arbitrage"
              ? "bg-emerald-600 text-white shadow-md"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          {t("farmer.tabArbitrage")}
        </button>
        <button
          onClick={() => setActiveTab("quality")}
          className={`px-4 py-2.5 rounded-xl text-xs font-black transition whitespace-nowrap flex items-center gap-2 ${
            activeTab === "quality"
              ? "bg-emerald-600 text-white shadow-md"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          {t("farmer.tabQuality")}
        </button>
        <button
          onClick={() => setActiveTab("offers")}
          className={`px-4 py-2.5 rounded-xl text-xs font-black transition whitespace-nowrap flex items-center gap-2 ${
            activeTab === "offers"
              ? "bg-emerald-600 text-white shadow-md"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          {t("farmer.tabOffers")}{" "}
          {offers.length > 0 && (
            <span className="bg-amber-400 text-slate-900 text-[10px] font-black px-1.5 py-0.5 rounded-full">
              {offers.length}
            </span>
          )}
        </button>
      </div>

      {/* Market Quick Metric Badges */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-gray-200 text-center shadow-sm">
          <div className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">{t("farmer.marketPrice")}</div>
          <div className="text-xl font-black text-emerald-800 mt-1">
            {decision ? `₹${decision.current_price_per_kg}/kg` : "—"}
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-200 text-center shadow-sm">
          <div className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">{t("farmer.demandLevel")}</div>
          <div className="text-xl font-black text-blue-700 mt-1">{decision ? decision.demand_level : "—"}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-200 text-center shadow-sm">
          <div className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">{t("farmer.weatherRisk")}</div>
          <div className="text-xl font-black text-teal-700 mt-1">{decision ? decision.weather_condition : "—"}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-200 text-center shadow-sm">
          <div className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">{t("farmer.logisticsFreight")}</div>
          <div className="text-xl font-black text-gray-800 mt-1">
            {decision?.logistics ? `₹${decision.logistics.transport_cost_per_kg}/kg` : "—"}
          </div>
        </div>
      </div>

      {/* Tab 1: AI Decision & Produce Form */}
      {activeTab === "decision" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form Input Column */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
            <h3 className="text-lg font-black text-gray-900 border-b pb-2.5 flex items-center gap-2">
              <span>🌾</span> {t("farmer.formTitle")}
            </h3>
            <form onSubmit={handleEvaluate} className="space-y-3.5 text-xs font-semibold">
              <div>
                <label className="block font-bold text-gray-700 mb-1">{t("farmer.cropName")}</label>
                <select
                  name="crop_name"
                  value={form.crop_name}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-xl p-2.5 bg-gray-50 text-sm font-bold text-gray-800"
                >
                  {CROPS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-1">{t("farmer.quantityKg")}</label>
                <input
                  type="number"
                  name="quantity_kg"
                  value={form.quantity_kg}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-xl p-2.5 text-sm font-bold text-gray-800"
                />
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-1">{t("farmer.district")}</label>
                <input
                  type="text"
                  name="district"
                  value={form.district}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-xl p-2.5 text-sm font-bold text-gray-800"
                />
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-1">{t("farmer.harvestReadiness")}</label>
                <input
                  type="text"
                  name="harvest_date"
                  value={form.harvest_date}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-xl p-2.5 text-sm font-bold text-gray-800"
                />
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-1">{t("farmer.storageCapacity")}</label>
                <input
                  type="number"
                  name="storage_capacity_kg"
                  value={form.storage_capacity_kg}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-xl p-2.5 text-sm font-bold text-gray-800"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3 rounded-xl shadow-lg transition disabled:opacity-60 text-sm"
              >
                {loading ? t("farmer.calculating") : t("farmer.calculate")}
              </button>
              <button
                type="button"
                onClick={askAboutThisCrop}
                className="w-full bg-white border-2 border-emerald-600 text-emerald-800 hover:bg-emerald-50 font-black py-2.5 rounded-xl text-xs transition flex items-center justify-center gap-1.5"
              >
                {t("farmer.askAi")}
              </button>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-bold p-3 rounded-xl">
                  ⚠️ {error}
                </div>
              )}
            </form>
          </div>

          {/* AI Recommendation Output */}
          <div className="lg:col-span-2 space-y-5">
            {!decision && !loading && (
              <div className="bg-white border-2 border-dashed border-gray-300 rounded-2xl p-10 text-center text-sm text-gray-500 space-y-2">
                <div className="text-4xl">🌾</div>
                <div className="font-bold text-gray-700">{t("farmer.emptyState")}</div>
              </div>
            )}
            <SellDecisionCard decision={decision} />
            <NetRealizationCard decision={decision} />
          </div>
        </div>
      )}

      {/* Tab 2: Nearby Mandis Spatial Price Arbitrage */}
      {activeTab === "arbitrage" && (
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-3">
            <div className="flex justify-between items-start flex-wrap gap-3">
              <div>
                <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
                  <span>📍</span> {t("arbitrage.title")}
                </h3>
                <p className="text-xs text-gray-600 mt-1">{t("arbitrage.subtitle")}</p>
              </div>
              <button
                onClick={loadArbitrage}
                disabled={loadingArbitrage}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black px-4 py-2 rounded-xl transition"
              >
                {loadingArbitrage ? "Updating Prices…" : "🔄 Refresh Nearby APMCs"}
              </button>
            </div>

            {arbitrageData && (
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-300 rounded-2xl p-4 flex justify-between items-center flex-wrap gap-3">
                <div>
                  <span className="bg-emerald-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase">
                    {t("arbitrage.bestBadge")}
                  </span>
                  <div className="text-xl font-black text-emerald-950 mt-1">
                    {arbitrageData.best_mandi}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-gray-600">{t("arbitrage.gainText")}</div>
                  <div className="text-2xl font-black text-emerald-700">
                    +₹{arbitrageData.total_arbitrage_gain_inr?.toLocaleString()} In-Hand
                  </div>
                </div>
              </div>
            )}

            {/* Mandis Comparison Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-100 text-gray-700 font-bold border-b text-[11px]">
                  <tr>
                    <th className="p-3">{t("arbitrage.mandi")}</th>
                    <th className="p-3">{t("arbitrage.distance")}</th>
                    <th className="p-3">{t("arbitrage.grossPrice")}</th>
                    <th className="p-3">{t("arbitrage.transportDeduction")}</th>
                    <th className="p-3">{t("arbitrage.mandiCess")}</th>
                    <th className="p-3">{t("arbitrage.netPayout")}</th>
                    <th className="p-3 text-right">{t("arbitrage.totalPayout")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {arbitrageData?.mandis?.map((m, idx) => (
                    <tr
                      key={idx}
                      className={m.is_best_payout ? "bg-emerald-50/80 font-bold text-emerald-950" : "hover:bg-gray-50"}
                    >
                      <td className="p-3">
                        <div className="font-black flex items-center gap-1.5">
                          {m.market_name}{" "}
                          {m.is_best_payout && (
                            <span className="bg-emerald-600 text-white text-[9px] px-1.5 py-0.2 rounded font-black">
                              BEST
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-gray-500 font-normal">{m.district}, {m.state}</div>
                      </td>
                      <td className="p-3 font-semibold text-gray-700">{m.distance_km} km</td>
                      <td className="p-3 font-bold text-gray-900">₹{m.gross_price_per_quintal}</td>
                      <td className="p-3 text-rose-600 font-semibold">-₹{m.transport_cost_per_quintal}</td>
                      <td className="p-3 text-gray-600">-₹{m.mandi_cess_per_quintal}</td>
                      <td className="p-3 font-black text-emerald-700 text-sm">₹{m.net_realization_per_quintal}</td>
                      <td className="p-3 text-right font-black text-gray-900 text-sm">
                        ₹{m.total_net_payout_inr?.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: AI Quality & e-Pramaan Certificate */}
      {activeTab === "quality" && (
        <QualityGradingCard
          initialCrop={form.crop_name}
          initialQty={Number(form.quantity_kg)}
          initialDistrict={form.district}
        />
      )}

      {/* Tab 4: Direct Buyer Offers & Escrow */}
      {activeTab === "offers" && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b pb-3">
            <div>
              <h3 className="text-xl font-black text-gray-900">💬 Active Buyer Offers & Escrow Contracts</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Review digital bids received from verified food processors and wholesalers for your lots.
              </p>
            </div>
            <span className="bg-emerald-100 text-emerald-800 text-xs font-black px-3 py-1 rounded-full">
              {offers.length} Offers
            </span>
          </div>

          <div className="space-y-3">
            {offers.map((offer) => (
              <div
                key={offer.id}
                className="p-5 rounded-2xl border border-gray-200 bg-gray-50/50 hover:bg-white hover:border-emerald-300 transition space-y-3"
              >
                <div className="flex justify-between items-start flex-wrap gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="bg-slate-900 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full">
                        {offer.buyer_category}
                      </span>
                      <span className="text-xs font-bold text-gray-500 font-mono">Offer ID: {offer.id}</span>
                      <span className="bg-amber-100 text-amber-900 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                        {offer.status}
                      </span>
                    </div>
                    <h4 className="text-lg font-black text-gray-900 mt-1">{offer.buyer_name}</h4>
                    <p className="text-xs text-gray-600 font-medium">
                      Crop: <span className="font-bold text-gray-900">{offer.crop_name}</span> ({offer.quantity_kg} kg)
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-gray-500 uppercase">Offered Price</div>
                    <div className="text-2xl font-black text-emerald-700">₹{offer.offered_price_per_kg} / kg</div>
                    <div className="text-xs text-gray-500">
                      Asking: ₹{offer.asking_price_per_kg} • Total: ₹{(offer.offered_price_per_kg * offer.quantity_kg).toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="bg-white p-3 rounded-xl border border-gray-200 text-xs text-gray-700 flex justify-between items-center flex-wrap gap-2">
                  <div>
                    <span className="font-bold text-gray-900">Terms: </span>
                    <span>{offer.terms}</span>
                  </div>
                  <div className="text-emerald-800 font-black flex items-center gap-1">
                    <span>🔒 Escrow: {offer.escrow_status}</span>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  {offer.status !== "ACCEPTED" ? (
                    <>
                      <button
                        onClick={() => {
                          setActiveOfferForCounter(offer);
                          setCounterPrice(offer.offered_price_per_kg);
                        }}
                        className="bg-white border border-gray-300 hover:bg-gray-100 text-gray-800 font-bold px-4 py-2 rounded-xl text-xs transition"
                      >
                        Submit Counter-Offer
                      </button>
                      <button
                        onClick={() => handleAcceptOffer(offer.id)}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-5 py-2 rounded-xl text-xs shadow-md transition"
                      >
                        ✓ Accept & Lock Escrow
                      </button>
                    </>
                  ) : (
                    <div className="text-xs font-black text-emerald-700 bg-emerald-100 px-3 py-1.5 rounded-xl">
                      ✓ Deal Confirmed • Payment Locked in Escrow
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Counter Modal */}
          {activeOfferForCounter && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
              <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4">
                <h3 className="text-lg font-black text-gray-900">
                  Submit Counter-Offer to {activeOfferForCounter.buyer_name}
                </h3>
                <form onSubmit={handleCounterOffer} className="space-y-3 text-xs">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Your Counter Price (₹/kg)</label>
                    <input
                      type="number"
                      step="0.25"
                      value={counterPrice}
                      onChange={(e) => setCounterPrice(e.target.value)}
                      className="w-full border border-gray-300 rounded-xl p-2.5 font-black text-base text-emerald-800"
                      required
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveOfferForCounter(null)}
                      className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold px-4 py-2 rounded-xl"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-5 py-2 rounded-xl shadow"
                    >
                      Send Counter-Offer
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
