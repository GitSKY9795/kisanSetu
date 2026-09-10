import { useEffect, useState } from "react";
import { NavLink, Link, useNavigate } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext.jsx";
import { getApplicationSession, logoutApplicationSession } from "../api/client.js";
import { auth } from "../firebase.js";
import { signOut } from "firebase/auth";

const navLinkClass = ({ isActive }) =>
  `px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
    isActive
      ? "bg-emerald-800 text-amber-300 shadow-sm border border-emerald-600/60"
      : "text-emerald-100/90 hover:text-white hover:bg-emerald-900/50"
  }`;

export default function Navbar() {
  const { lang, setLang, t, languages } = useLanguage();
  const navigate = useNavigate();
  const [farmerName, setFarmerName] = useState("Farmer");

  useEffect(() => {
    getApplicationSession().then((session) => setFarmerName(session.farmer?.full_name || "Farmer")).catch(() => {});
  }, []);

  const handleLogout = async () => {
    await logoutApplicationSession().catch(() => {});
    await signOut(auth).catch(() => {});
    navigate("/login", { replace: true });
  };

  return (
    <nav className="bg-emerald-950 border-b border-emerald-800/80 text-white sticky top-0 z-40 shadow-lg backdrop-blur-md bg-opacity-95">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        {/* Brand Logo & Name */}
        <Link to="/home" className="font-black text-xl tracking-tight flex items-center gap-2.5 group shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-amber-400 flex items-center justify-center text-xl shadow-md group-hover:scale-105 transition">
            🌾
          </div>
          <span className="bg-gradient-to-r from-white via-emerald-100 to-amber-200 bg-clip-text text-transparent font-black tracking-wide text-2xl">
            {t("appName")}
          </span>
        </Link>

        {/* Organized Center Nav Links */}
        <div className="hidden lg:flex items-center gap-1 overflow-x-auto">
          <NavLink to="/home" end className={navLinkClass}>
            <span>🏠</span> {t("nav.home")}
          </NavLink>
          <NavLink to="/farmer" className={navLinkClass}>
            <span>👨‍🌾</span> {t("nav.farmer")}
          </NavLink>
          <NavLink to="/farmer" className={navLinkClass}>
            <span>👤</span> My Profile
          </NavLink>
          <NavLink to="/marketplace" className={navLinkClass}>
            <span>📋</span> My Listings
          </NavLink>
          <NavLink to="/prices" className={navLinkClass}>
            <span>🔔</span> Notifications
          </NavLink>
          <NavLink to="/buyer" className={navLinkClass}>
            <span>🏬</span> {t("nav.buyer")}
          </NavLink>
          <NavLink to="/fpo" className={navLinkClass}>
            <span>🤝</span> {t("nav.fpo")}
          </NavLink>
          <NavLink to="/marketplace" className={navLinkClass}>
            <span>🛒</span> {t("nav.marketplace")}
          </NavLink>
          <NavLink to="/prices" className={navLinkClass}>
            <span>📈</span> {t("nav.prices")}
          </NavLink>
          <NavLink to="/logistics" className={navLinkClass}>
            <span>🏬</span> {t("nav.logistics")}
          </NavLink>
          <NavLink to="/grievances" className={navLinkClass}>
            <span>⚖️</span> {t("nav.grievances")}
          </NavLink>
          <NavLink to="/admin" className={navLinkClass}>
            <span>⚙️</span> {t("nav.admin")}
          </NavLink>
        </div>

        {/* Top Right Language Selector */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 bg-emerald-900/80 border border-emerald-700/80 px-2.5 py-1.5 rounded-xl shadow-inner">
            <span className="text-xs">🌐</span>
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              aria-label="Select language"
              className="bg-transparent text-amber-200 text-xs font-bold focus:outline-none cursor-pointer"
            >
              {languages.map((l) => (
                <option key={l.code} value={l.code} className="bg-emerald-950 text-white">
                  {l.flagLabel}
                </option>
              ))}
            </select>
          </div>
          <button type="button" onClick={handleLogout} className="text-xs font-bold text-emerald-100 hover:text-white">
            Logout
          </button>
          <Link to="/farmer" className="farmer-nav-profile"><span className="farmer-nav-avatar">👨🏽‍🌾</span><span>{farmerName}</span></Link>
        </div>
      </div>

      {/* Mobile / Tablet Horizontal Navigation Bar */}
      <div className="lg:hidden px-4 py-2 border-t border-emerald-900/60 flex gap-1 overflow-x-auto text-xs bg-emerald-950/90">
        <NavLink to="/home" end className={navLinkClass}>
          <span>🏠</span> {t("nav.home")}
        </NavLink>
        <NavLink to="/farmer" className={navLinkClass}>
          <span>👨‍🌾</span> {t("nav.farmer")}
        </NavLink>
        <NavLink to="/buyer" className={navLinkClass}>
          <span>🏬</span> {t("nav.buyer")}
        </NavLink>
        <NavLink to="/fpo" className={navLinkClass}>
          <span>🤝</span> {t("nav.fpo")}
        </NavLink>
        <NavLink to="/marketplace" className={navLinkClass}>
          <span>🛒</span> {t("nav.marketplace")}
        </NavLink>
        <NavLink to="/prices" className={navLinkClass}>
          <span>📈</span> {t("nav.prices")}
        </NavLink>
        <NavLink to="/logistics" className={navLinkClass}>
          <span>🏬</span> {t("nav.logistics")}
        </NavLink>
        <NavLink to="/grievances" className={navLinkClass}>
          <span>⚖️</span> {t("nav.grievances")}
        </NavLink>
        <NavLink to="/admin" className={navLinkClass}>
          <span>⚙️</span> {t("nav.admin")}
        </NavLink>
      </div>
    </nav>
  );
}
