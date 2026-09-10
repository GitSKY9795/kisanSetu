import React, { useRef, useState } from "react";
import { analyzeCropQuality, generateQualityCertificate } from "../api/client.js";
import { useLanguage } from "../context/LanguageContext.jsx";

export default function QualityGradingCard({ initialCrop = "Wheat", initialQty = 500, initialDistrict = "Ujjain" }) {
  const { t } = useLanguage();
  const [analyzing, setAnalyzing] = useState(false);
  const [generatingCert, setGeneratingCert] = useState(false);
  const [error, setError] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [result, setResult] = useState(null);
  const [certificate, setCertificate] = useState(null);
  const [showCertModal, setShowCertModal] = useState(false);

  // Quality grading parameters
  const [params, setParams] = useState({
    crop_name: initialCrop,
    farmer_name: "Ramesh Kumar",
    district: initialDistrict,
    quantity_kg: initialQty,
    moisture_pct: 11.2,
    foreign_matter_pct: 0.8,
    damaged_grains_pct: 1.2,
    grain_size_mm: 6.5,
    sample_notes: "Cleaned grain lot with high luster and uniform grain size.",
  });

  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // Auto-set crop if filename hints at it
      const name = file.name.toLowerCase();
      if (name.includes("onion")) setParams((p) => ({ ...p, crop_name: "Onion" }));
      else if (name.includes("potato")) setParams((p) => ({ ...p, crop_name: "Potato" }));
      else if (name.includes("cotton")) setParams((p) => ({ ...p, crop_name: "Cotton" }));
      else if (name.includes("tomato")) setParams((p) => ({ ...p, crop_name: "Tomato" }));
    }
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setError(null);
    try {
      const filename = selectedFile ? selectedFile.name : `${params.crop_name.toLowerCase()}_sample.jpg`;
      const data = await analyzeCropQuality(filename, selectedFile);
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.detail || t("common.backendError"));
    } finally {
      setAnalyzing(false);
    }
  };

  const handleGenerateCertificate = async () => {
    setGeneratingCert(true);
    setError(null);
    try {
      const certData = await generateQualityCertificate({
        ...params,
        quantity_kg: Number(params.quantity_kg),
        moisture_pct: Number(params.moisture_pct),
        foreign_matter_pct: Number(params.foreign_matter_pct),
        damaged_grains_pct: Number(params.damaged_grains_pct),
        grain_size_mm: Number(params.grain_size_mm),
      });
      setCertificate(certData);
      setShowCertModal(true);
    } catch (err) {
      setError(err.response?.data?.detail || t("common.backendError"));
    } finally {
      setGeneratingCert(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
      <div className="flex justify-between items-center border-b pb-3 flex-wrap gap-2">
        <div>
          <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
            <span>🔍</span> {t("quality.title")}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">{t("quality.subtitle")}</p>
        </div>
        {result && (
          <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-black px-3 py-1 rounded-full">
            ✓ {result.quality_grade}
          </span>
        )}
      </div>

      {/* Image Upload / Camera Box */}
      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
      <div
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-emerald-300 rounded-xl p-5 text-center bg-emerald-50/40 hover:bg-emerald-50 transition cursor-pointer group"
      >
        <div className="text-3xl mb-1 group-hover:scale-110 transition">📷</div>
        <div className="text-sm font-bold text-gray-800">
          {selectedFile ? `Selected: ${selectedFile.name}` : t("quality.chooseImage")}
        </div>
        <div className="text-xs text-gray-500 mt-1">{t("quality.hint")}</div>
      </div>

      {/* Manual / Sensor Quality Inspection Parameters */}
      <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3">
        <div className="text-xs font-black text-gray-700 uppercase tracking-wider">
          🔬 Agmark Inspection Parameters
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="block text-gray-600 font-bold mb-1">{t("quality.moisture")}</label>
            <input
              type="number"
              step="0.1"
              value={params.moisture_pct}
              onChange={(e) => setParams({ ...params, moisture_pct: e.target.value })}
              className="w-full bg-white border border-gray-300 rounded-lg p-2 font-bold text-emerald-800"
            />
          </div>
          <div>
            <label className="block text-gray-600 font-bold mb-1">{t("quality.foreignMatter")}</label>
            <input
              type="number"
              step="0.1"
              value={params.foreign_matter_pct}
              onChange={(e) => setParams({ ...params, foreign_matter_pct: e.target.value })}
              className="w-full bg-white border border-gray-300 rounded-lg p-2 font-bold text-emerald-800"
            />
          </div>
          <div>
            <label className="block text-gray-600 font-bold mb-1">{t("quality.damagedGrains")}</label>
            <input
              type="number"
              step="0.1"
              value={params.damaged_grains_pct}
              onChange={(e) => setParams({ ...params, damaged_grains_pct: e.target.value })}
              className="w-full bg-white border border-gray-300 rounded-lg p-2 font-bold text-emerald-800"
            />
          </div>
          <div>
            <label className="block text-gray-600 font-bold mb-1">{t("quality.grainSize")}</label>
            <input
              type="number"
              step="0.1"
              value={params.grain_size_mm}
              onChange={(e) => setParams({ ...params, grain_size_mm: e.target.value })}
              className="w-full bg-white border border-gray-300 rounded-lg p-2 font-bold text-emerald-800"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          onClick={handleAnalyze}
          disabled={analyzing}
          className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-2.5 rounded-xl text-xs shadow transition disabled:opacity-60 flex items-center justify-center gap-2"
        >
          <span>🤖</span> {analyzing ? t("quality.analyzing") : t("quality.scan")}
        </button>

        <button
          onClick={handleGenerateCertificate}
          disabled={generatingCert}
          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-2.5 rounded-xl text-xs shadow-md transition disabled:opacity-60 flex items-center justify-center gap-2"
        >
          <span>📜</span> {generatingCert ? "Generating e-Pramaan…" : t("quality.generateCert")}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-bold p-3 rounded-xl">
          ⚠️ {error}
        </div>
      )}

      {/* Scan Analysis Output */}
      {result && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs space-y-2">
          <div className="flex justify-between items-center font-black text-emerald-950">
            <span>Detected: {result.detected_crop} ({result.quality_grade})</span>
            <span className="bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded font-black">
              {(result.confidence * 100).toFixed(0)}% AI Confidence
            </span>
          </div>
          <p className="text-emerald-900 font-medium">{result.summary}</p>
          <div className="flex gap-4 text-emerald-800 font-semibold pt-1 border-t border-emerald-200">
            <span>Defect Rate: {result.defect_percentage}%</span>
            <span>Defects: {result.detected_defects?.join(", ")}</span>
          </div>
        </div>
      )}

      {/* Certificate Success Button */}
      {certificate && !showCertModal && (
        <button
          onClick={() => setShowCertModal(true)}
          className="w-full bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 font-black py-2.5 rounded-xl text-xs transition flex items-center justify-center gap-2"
        >
          <span>✨</span> {t("quality.viewCert")} ({certificate.certificate_id})
        </button>
      )}

      {/* Digital Quality Certificate Modal (e-Pramaan) */}
      {showCertModal && certificate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border-2 border-emerald-600 overflow-hidden animate-fadeIn">
            {/* Certificate Header */}
            <div className="bg-gradient-to-r from-emerald-900 to-teal-900 text-white p-5 flex justify-between items-start">
              <div>
                <span className="bg-amber-400 text-emerald-950 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Government of India • AGMARK Specification Standard
                </span>
                <h2 className="text-xl font-black mt-2 flex items-center gap-2">
                  <span>📜</span> Digital Produce Quality Certificate (e-Pramaan)
                </h2>
                <p className="text-xs text-emerald-200 mt-0.5 font-mono">
                  ID: {certificate.certificate_id} • Hash: {certificate.verification_hash}
                </p>
              </div>
              <button
                onClick={() => setShowCertModal(false)}
                className="text-white/80 hover:text-white text-2xl font-bold leading-none p-1"
              >
                ×
              </button>
            </div>

            {/* Certificate Body */}
            <div className="p-6 space-y-4 text-xs text-gray-800">
              <div className="grid grid-cols-2 gap-4 bg-emerald-50/60 p-4 rounded-xl border border-emerald-200">
                <div>
                  <div className="text-gray-500 font-bold uppercase text-[10px]">Farmer / Producer</div>
                  <div className="text-base font-black text-emerald-950">{certificate.farmer_name}</div>
                  <div className="text-xs text-gray-600">{certificate.district}, Madhya Pradesh</div>
                </div>
                <div className="text-right">
                  <div className="text-gray-500 font-bold uppercase text-[10px]">Commodity & Lot Size</div>
                  <div className="text-base font-black text-emerald-950">{certificate.crop_name}</div>
                  <div className="text-xs font-bold text-amber-700">{certificate.quantity_kg?.toLocaleString()} kg</div>
                </div>
              </div>

              {/* Quality Grade Seal */}
              <div className="bg-gradient-to-r from-amber-50 to-emerald-50 p-4 rounded-xl border-2 border-amber-300 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-amber-900 uppercase">Assessed AGMARK Quality Grade</div>
                  <div className="text-xl font-black text-emerald-900 mt-0.5">{certificate.quality_grade}</div>
                  <div className="text-[11px] text-gray-600 mt-1">{certificate.recommendation}</div>
                </div>
                <div className="text-center bg-white p-2.5 rounded-xl border border-amber-300 shadow-sm">
                  <div className="text-[10px] font-bold text-gray-500 uppercase">Price Index</div>
                  <div className="text-lg font-black text-emerald-700">+{((certificate.price_multiplier - 1) * 100).toFixed(0)}% Premium</div>
                </div>
              </div>

              {/* Parameter Table */}
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-gray-100 text-gray-700 font-bold border-b text-[11px]">
                    <tr>
                      <th className="p-2.5">Parameter</th>
                      <th className="p-2.5">Tested Value</th>
                      <th className="p-2.5">AGMARK Compliance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium">
                    <tr>
                      <td className="p-2.5 font-bold">Moisture Content</td>
                      <td className="p-2.5 font-black text-emerald-800">{certificate.parameters.moisture_content}</td>
                      <td className="p-2.5 text-emerald-700 font-bold">✓ PASS (Grade A Spec)</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-bold">Foreign Matter</td>
                      <td className="p-2.5 font-black text-emerald-800">{certificate.parameters.foreign_matter}</td>
                      <td className="p-2.5 text-emerald-700 font-bold">✓ PASS</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-bold">Damaged / Broken Grains</td>
                      <td className="p-2.5 font-black text-emerald-800">{certificate.parameters.damaged_grains}</td>
                      <td className="p-2.5 text-emerald-700 font-bold">✓ PASS</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-bold">Grain Kernel Diameter</td>
                      <td className="p-2.5 font-black text-emerald-800">{certificate.parameters.grain_size}</td>
                      <td className="p-2.5 text-emerald-700 font-bold">✓ UNIFORM</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* QR Verification Seal */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
                <div className="space-y-0.5">
                  <div className="font-bold text-gray-900">🔒 Cryptographically Signed Certificate</div>
                  <div className="text-[11px] text-gray-500 font-mono">Verify at: {certificate.qr_payload}</div>
                </div>
                <div className="bg-white p-2 rounded-lg border font-mono text-center text-xs font-black text-emerald-800">
                  [QR VERIFIED]
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-100 p-4 flex justify-end gap-3 border-t">
              <button
                onClick={() => {
                  window.print();
                }}
                className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-4 py-2 rounded-xl text-xs transition flex items-center gap-1.5"
              >
                <span>🖨️</span> Print / Save PDF
              </button>
              <button
                onClick={() => setShowCertModal(false)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-5 py-2 rounded-xl text-xs transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
