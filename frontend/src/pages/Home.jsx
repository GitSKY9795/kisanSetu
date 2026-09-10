import { Link } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext.jsx";
import { useAssistant } from "../context/AssistantContext.jsx";

export default function Home() {
  const { t } = useLanguage();
  const { openAssistant } = useAssistant();

  const portalCards = [
    {
      to: "/farmer",
      emoji: "👨‍🌾",
      key: "farmer",
      border: "border-emerald-500 hover:border-emerald-600",
      btn: "bg-emerald-600 hover:bg-emerald-500",
      tag: "AI Decision & Arbitrage",
    },
    {
      to: "/buyer",
      emoji: "🏬",
      key: "buyer",
      border: "border-slate-700 hover:border-slate-900",
      btn: "bg-slate-900 hover:bg-slate-800",
      tag: "Direct B2B Sourcing",
    },
    {
      to: "/fpo",
      emoji: "🤝",
      key: "fpo",
      border: "border-teal-500 hover:border-teal-600",
      btn: "bg-teal-700 hover:bg-teal-600",
      tag: "Bulk Lot Aggregator",
    },
    {
      to: "/marketplace",
      emoji: "🛒",
      key: "marketplace",
      border: "border-amber-500 hover:border-amber-600",
      btn: "bg-amber-600 hover:bg-amber-500",
      tag: "100% Escrow Protected",
    },
  ];

  const featureCards = [
    { to: "/prices", emoji: "📈", key: "prices" },
    { to: "/farmer", emoji: "📜", key: "quality" },
    { to: "/logistics", emoji: "🏬", key: "logistics" },
    { to: "/grievances", emoji: "⚖️", key: "grievances" },
  ];

  return (
    <div className="max-w-7xl mx-auto my-6 space-y-12">
      {/* Hero Section */}
      <div className="text-center space-y-4 max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-900 text-xs font-black px-4 py-1.5 rounded-full uppercase tracking-wider border border-emerald-300 shadow-sm">
          <span>🏆</span> {t("home.badge")}
        </div>
        <h1 className="text-4xl sm:text-6xl font-black text-gray-900 tracking-tight leading-tight">
          <span className="bg-gradient-to-r from-emerald-800 to-teal-700 bg-clip-text text-transparent">
            {t("appName")}
          </span>
        </h1>
        <p className="text-gray-700 text-lg sm:text-xl font-medium leading-relaxed">
          {t("home.heroLine")}{" "}
          <span className="font-black text-emerald-900 block mt-1">{t("home.heroQuestion")}</span>
        </p>
        <p className="text-xs sm:text-sm text-gray-500 max-w-2xl mx-auto">{t("home.heroSub")}</p>

        {/* Action Buttons */}
        <div className="flex justify-center gap-3 pt-2 flex-wrap">
          <Link
            to="/farmer"
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-6 py-3 rounded-2xl text-sm shadow-lg hover:shadow-xl transition flex items-center gap-2"
          >
            <span>👨‍🌾</span> Launch Farmer Decision Hub →
          </Link>
          <button
            onClick={() => openAssistant()}
            className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black px-6 py-3 rounded-2xl text-sm shadow-md transition flex items-center gap-2 border border-amber-300"
          >
            <span className="animate-pulse">🎙️</span> Try Multilingual Voice Assistant
          </button>
        </div>
      </div>

      {/* Primary 4 Portals */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {portalCards.map((c) => (
          <Link
            key={c.key}
            to={c.to}
            className={`bg-white p-6 rounded-3xl border-2 ${c.border} shadow-md hover:shadow-2xl transition-all duration-300 flex flex-col justify-between space-y-4 group hover:-translate-y-1`}
          >
            <div className="space-y-3">
              <div className="flex justify-between items-start">
                <span className="text-4xl group-hover:scale-110 transition">{c.emoji}</span>
                <span className="bg-gray-100 text-gray-700 text-[10px] font-black px-2.5 py-0.5 rounded-full">
                  {c.tag}
                </span>
              </div>
              <h3 className="text-xl font-black text-gray-900 group-hover:text-emerald-700 transition">
                {t(`home.cards.${c.key}.title`)}
              </h3>
              <p className="text-xs text-gray-600 font-medium leading-relaxed">
                {t(`home.cards.${c.key}.body`)}
              </p>
            </div>
            <div
              className={`${c.btn} text-white font-black text-xs py-2.5 rounded-xl text-center shadow transition`}
            >
              {t("common.enterPortal")} →
            </div>
          </Link>
        ))}
      </div>

      {/* Secondary Capabilities Section */}
      <div className="space-y-6">
        <div className="text-center space-y-1">
          <h2 className="text-2xl font-black text-gray-900">{t("home.exploreTitle")}</h2>
          <p className="text-xs sm:text-sm text-gray-500">{t("home.exploreSubtitle")}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {featureCards.map((c) => (
            <Link
              key={c.key}
              to={c.to}
              className="bg-white p-6 rounded-2xl border border-gray-200 hover:border-emerald-500 shadow-sm hover:shadow-xl transition-all duration-300 text-center space-y-2 group hover:-translate-y-1"
            >
              <div className="text-3xl group-hover:scale-110 transition">{c.emoji}</div>
              <h3 className="text-base font-black text-gray-900">{t(`home.cards.${c.key}.title`)}</h3>
              <p className="text-xs text-gray-600 font-medium leading-relaxed">
                {t(`home.cards.${c.key}.body`)}
              </p>
            </Link>
          ))}
        </div>
      </div>

      {/* Intelligence Engine Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 text-white rounded-3xl p-8 text-center space-y-3 shadow-xl border border-emerald-800">
        <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-3 py-1 rounded-full uppercase">
          AI Architecture & Machine Learning Stack
        </span>
        <h3 className="font-black text-2xl text-white">💡 {t("home.poweredBy")}</h3>
        <p className="text-xs sm:text-sm text-emerald-200 max-w-3xl mx-auto leading-relaxed">
          {t("home.poweredByBody")}
        </p>
      </div>
    </div>
  );
}
