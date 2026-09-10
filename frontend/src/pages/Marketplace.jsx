import React, { useEffect, useMemo, useState } from "react";
import { listMarketplaceListings, submitMarketplaceOffer, createTransaction } from "../api/client.js";
import { useLanguage } from "../context/LanguageContext.jsx";

export default function Marketplace() {
  const { t } = useLanguage();
  const [filterCrop, setFilterCrop] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Offer Modal State
  const [selectedListing, setSelectedListing] = useState(null);
  const [buyerName, setBuyerName] = useState("AgriCorp Processing Ltd");
  const [buyerCategory, setBuyerCategory] = useState("Processor");
  const [offeredPrice, setOfferedPrice] = useState("");
  const [offerQty, setOfferQty] = useState("");
  const [offerTerms, setOfferTerms] = useState("Farmgate pickup within 48h. Instant UPI escrow release on quality pass.");
  const [submittingOffer, setSubmittingOffer] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);

  const loadListings = () => {
    setLoading(true);
    listMarketplaceListings()
      .then((data) => setListings(data.listings || []))
      .catch(() => setError(t("common.backendError")))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadListings();
  }, []);

  const cropOptions = useMemo(() => {
    const crops = new Set(listings.map((l) => l.crop_name));
    return ["All", ...Array.from(crops)];
  }, [listings]);

  const filtered = listings.filter((item) => {
    const matchesCrop = filterCrop === "All" || item.crop_name.toLowerCase() === filterCrop.toLowerCase();
    const matchesSearch =
      !searchQuery ||
      item.crop_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.seller_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.district.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCrop && matchesSearch;
  });

  const handleOpenOfferModal = (listing) => {
    setSelectedListing(listing);
    setOfferedPrice(listing.price_per_kg);
    setOfferQty(listing.quantity_kg);
    setSuccessMsg(null);
  };

  const handleSendOffer = async (e) => {
    e.preventDefault();
    if (!selectedListing) return;
    setSubmittingOffer(true);
    try {
      await submitMarketplaceOffer({
        listing_id: selectedListing.id,
        crop_name: selectedListing.crop_name,
        farmer_name: selectedListing.seller_name,
        buyer_name: buyerName,
        buyer_category: buyerCategory,
        quantity_kg: Number(offerQty),
        asking_price_per_kg: Number(selectedListing.price_per_kg),
        offered_price_per_kg: Number(offeredPrice),
        terms: offerTerms,
      });

      // Also create milestone escrow order
      await createTransaction({
        farmer_name: selectedListing.seller_name,
        buyer_name: buyerName,
        crop_name: selectedListing.crop_name,
        quality_grade: selectedListing.quality_grade || "Grade A",
        quantity_kg: Number(offerQty),
        agreed_price_per_kg: Number(offeredPrice),
        transport_cost_per_kg: 1.0,
        storage_cost_per_kg: 0.0,
      });

      setSuccessMsg(`Offer & 4-Stage Escrow order created successfully for ${selectedListing.crop_name}!`);
      setTimeout(() => {
        setSelectedListing(null);
        setSuccessMsg(null);
      }, 2200);
    } catch (err) {
      alert("Error submitting offer: " + (err.response?.data?.detail || err.message));
    } finally {
      setSubmittingOffer(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
        <div className="flex justify-between items-center flex-wrap gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 flex items-center gap-2">
              <span>🌾</span> {t("marketplace.title")}
            </h1>
            <p className="text-gray-600 text-xs sm:text-sm mt-1">{t("marketplace.subtitle")}</p>
          </div>
          <div className="flex items-center gap-2 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
            <span className="text-emerald-700 font-black text-sm">🔒 100% Escrow Protected</span>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-wrap gap-3 items-center justify-between pt-2 border-t">
          <div className="w-full sm:w-72">
            <input
              type="text"
              placeholder={t("marketplace.searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3.5 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex gap-1.5 flex-wrap">
            {cropOptions.map((crop) => (
              <button
                key={crop}
                onClick={() => setFilterCrop(crop)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition ${
                  filterCrop === crop
                    ? "bg-emerald-600 text-white shadow"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {crop}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading && <p className="text-sm text-gray-500">{t("common.loading")}</p>}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-bold p-3 rounded-xl">
          ⚠️ {error}
        </div>
      )}

      {/* Produce Listings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((item) => (
          <div
            key={item.id}
            className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-lg hover:border-emerald-300 transition flex flex-col justify-between space-y-4 group"
          >
            <div>
              {/* Badges */}
              <div className="flex justify-between items-start mb-3 gap-2 flex-wrap">
                <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 text-[11px] font-black px-2.5 py-0.5 rounded-full">
                  {item.quality_grade}
                </span>
                <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                  ✓ {item.source === "FPO_POOL" ? t("marketplace.pooledLot") : t("marketplace.verifiedSeller")}
                </span>
              </div>

              <h3 className="text-xl font-black text-gray-900 group-hover:text-emerald-700 transition">
                {item.crop_name} <span className="text-sm font-semibold text-gray-500">({item.variety})</span>
              </h3>
              <div className="text-xs font-bold text-gray-600 mt-0.5">
                Seller: <span className="text-gray-900 font-extrabold">{item.seller_name}</span>
              </div>

              {/* Quality & Specifications Pill */}
              <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-200 my-3 text-xs space-y-1.5">
                <div className="flex justify-between text-gray-700">
                  <span>{t("marketplace.availableQty")}:</span>
                  <span className="font-black text-gray-950">{item.quantity_kg?.toLocaleString()} kg</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>{t("marketplace.askingPrice")}:</span>
                  <span className="font-black text-emerald-700 text-sm">₹{item.price_per_kg}/kg</span>
                </div>
                <div className="flex justify-between text-[11px] text-gray-500 pt-1 border-t border-emerald-200">
                  <span>Location:</span>
                  <span className="font-bold text-gray-700">{item.district}{item.state ? `, ${item.state}` : ""}</span>
                </div>
              </div>

              <div className="flex items-center gap-1 text-[11px] text-emerald-800 font-bold">
                <span>📜 {t("marketplace.hasCert")}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t">
              <button
                onClick={() => handleOpenOfferModal(item)}
                className="w-full bg-white border-2 border-emerald-600 text-emerald-800 hover:bg-emerald-50 font-black py-2 rounded-xl text-xs transition"
              >
                {t("marketplace.makeOffer")}
              </button>
              <button
                onClick={() => handleOpenOfferModal(item)}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-2 rounded-xl text-xs shadow transition"
              >
                {t("marketplace.buyNow")}
              </button>
            </div>
          </div>
        ))}

        {!loading && filtered.length === 0 && (
          <div className="col-span-3 bg-white p-12 rounded-2xl border text-center text-gray-500">
            {t("marketplace.empty")}
          </div>
        )}
      </div>

      {/* Offer / Purchase Modal */}
      {selectedListing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-6 space-y-4 animate-fadeIn">
            <div className="flex justify-between items-start border-b pb-3">
              <div>
                <span className="bg-emerald-100 text-emerald-900 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase">
                  B2B Escrow Trade Linkage
                </span>
                <h3 className="text-xl font-black text-gray-900 mt-1">
                  Make Offer for {selectedListing.crop_name}
                </h3>
                <p className="text-xs text-gray-500">Seller: {selectedListing.seller_name} ({selectedListing.district})</p>
              </div>
              <button
                onClick={() => setSelectedListing(null)}
                className="text-gray-400 hover:text-gray-700 text-2xl font-bold leading-none"
              >
                ×
              </button>
            </div>

            {successMsg ? (
              <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 p-6 rounded-2xl text-center font-bold text-sm space-y-2">
                <div className="text-4xl">🎉</div>
                <div>{successMsg}</div>
                <div className="text-xs text-emerald-700">Redirecting to active transactions…</div>
              </div>
            ) : (
              <form onSubmit={handleSendOffer} className="space-y-3.5 text-xs font-semibold">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Your Enterprise Name</label>
                    <input
                      type="text"
                      value={buyerName}
                      onChange={(e) => setBuyerName(e.target.value)}
                      className="w-full border border-gray-300 rounded-xl p-2.5"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Category</label>
                    <select
                      value={buyerCategory}
                      onChange={(e) => setBuyerCategory(e.target.value)}
                      className="w-full border border-gray-300 rounded-xl p-2.5 bg-gray-50"
                    >
                      <option value="Processor">Food Processor</option>
                      <option value="Wholesaler">Wholesaler</option>
                      <option value="Retailer">Retail Chain</option>
                      <option value="Exporter">Bulk Exporter</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Quantity (kg)</label>
                    <input
                      type="number"
                      value={offerQty}
                      onChange={(e) => setOfferQty(e.target.value)}
                      className="w-full border border-gray-300 rounded-xl p-2.5 font-bold"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Offered Price (₹/kg)</label>
                    <input
                      type="number"
                      step="0.25"
                      value={offeredPrice}
                      onChange={(e) => setOfferedPrice(e.target.value)}
                      className="w-full border border-gray-300 rounded-xl p-2.5 font-black text-emerald-800"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">Terms & Conditions</label>
                  <textarea
                    rows={2}
                    value={offerTerms}
                    onChange={(e) => setOfferTerms(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl p-2.5 text-xs"
                  />
                </div>

                <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-[11px] text-amber-900 space-y-1">
                  <div className="font-black">🔒 Escrow Protection Commitment</div>
                  <div>
                    Total Escrow Value:{" "}
                    <span className="font-black">₹{(Number(offeredPrice || 0) * Number(offerQty || 0)).toLocaleString()}</span>. Funds will be held securely until gate quality inspection.
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t">
                  <button
                    type="button"
                    onClick={() => setSelectedListing(null)}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold px-4 py-2.5 rounded-xl text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingOffer}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-6 py-2.5 rounded-xl text-xs shadow-md transition disabled:opacity-60"
                  >
                    {submittingOffer ? "Locking Escrow…" : "Confirm Digital Offer"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
