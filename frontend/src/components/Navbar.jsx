import { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { listMarketplaceOffers } from "../api/client.js";
import { ROLE_HOME } from "./ProtectedRoute.jsx";
import { T } from "../i18n/mark.js";
import { englishCropName } from "../i18n/crops.js";
import {
  BellIcon,
  ChevronDownIcon,
  GlobeIcon,
  HomeIcon,
  LogoutIcon,
  SearchIcon,
  ShieldIcon,
  StoreIcon,
  TrendsIcon,
  TruckIcon,
  UserIcon,
} from "./icons.jsx";

const ROLE_LABEL = { FARMER: T("Farmer"), BUYER: T("Buyer"), FPO: T("FPO"), ADMIN: T("Admin") };

function linksForRole(role, t) {
  // The farmer's home covers the dashboard and the sell-decision workspace behind it.
  const home = {
    to: ROLE_HOME[role] || "/home",
    Icon: HomeIcon,
    label: t("Home"),
    isActive: role === "FARMER" ? (path) => path === "/farmer/profile" || path === "/farmer" : undefined,
  };
  const common = [
    { to: "/marketplace", Icon: StoreIcon, label: t("Marketplace") },
    { to: "/grievances", Icon: ShieldIcon, label: t("Grievance Portal") },
  ];
  if (role === "ADMIN") return [home, ...common];
  return [
    home,
    { to: "/profile", Icon: UserIcon, label: t("My Profile") },
    { to: "/prices", Icon: TrendsIcon, label: t("Mandi Trends") },
    { to: "/logistics", Icon: TruckIcon, label: t("Storage & Logistics") },
    ...common,
  ];
}

/** Turns whatever was typed — in any supported language — into the nearest place in the
 * app. A known crop name opens its price page; unknown words are tried as a crop name too,
 * since the price page can look up any commodity. */
function resolveSearch(raw, t) {
  const q = raw.trim();
  if (!q) return null;
  const lower = q.toLowerCase();
  const says = (phrase) => lower.includes(t(phrase).toLowerCase());
  if (/storage|cold|warehouse|logistic|freight|transport|pledge|loan/i.test(q) || says("Storage & Logistics")) return "/logistics";
  if (/grievance|complaint|dispute/i.test(q) || says("Grievance Portal")) return "/grievances";
  if (/marketplace|buyer|listing|offer|bid|order/i.test(q) || says("Marketplace")) return "/marketplace";
  if (/^(mandi|price|prices|rate|rates|trend|trends)$/i.test(q) || says("Mandi Trends")) return "/prices";
  const crop = englishCropName(q, t);
  return `/prices/${encodeURIComponent(crop || q)}`;
}

function LogoMark() {
  return (
    <svg className="sidebar-brand-mark" viewBox="0 0 40 40" aria-hidden="true">
      <defs>
        <linearGradient id="ksLogo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#d4e84a" />
          <stop offset="100%" stopColor="#3f9a3a" />
        </linearGradient>
      </defs>
      <circle cx="20" cy="20" r="19" fill="url(#ksLogo)" />
      <path d="M12 28c0-9 6-15 17-16-.4 11-6 17-14 17" fill="#fff" fillOpacity=".95" />
      <path d="M12.5 27.5c4-6 8-9.5 13-12" stroke="#2b7a3a" strokeWidth="1.6" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export default function Navbar() {
  const { lang, setLang, t, languages } = useLanguage();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { role, account, profile, logout } = useAuth();
  const [query, setQuery] = useState("");
  const [pendingOffers, setPendingOffers] = useState(0);

  const links = role ? linksForRole(role, t) : [];
  const displayName = profile?.name || account?.full_name || account?.username || account?.email || t("Account");

  // The bell reflects something real: buyer offers on this farmer's listings that are
  // still waiting for a response.
  useEffect(() => {
    if (role !== "FARMER") {
      setPendingOffers(0);
      return undefined;
    }
    let active = true;
    listMarketplaceOffers()
      .then((offers) => {
        if (active) setPendingOffers((offers || []).filter((o) => o.status === "OFFER_SUBMITTED").length);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [role, pathname]);

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const handleSearch = (event) => {
    event.preventDefault();
    const target = resolveSearch(query, t);
    if (target) {
      navigate(target);
      setQuery("");
    }
  };

  const offersLabel =
    pendingOffers === 1 ? t("1 buyer offer waiting for you") : pendingOffers > 1 ? t("{count} buyer offers waiting for you", { count: pendingOffers }) : "";
  const bellTarget = role === "FARMER" ? "/farmer?tab=offers" : "/marketplace";
  const profileTarget = role && role !== "ADMIN" ? "/profile" : ROLE_HOME[role] || "/login";

  return (
    <>
      <aside className="app-sidebar">
        <Link to={ROLE_HOME[role] || "/login"} className="sidebar-brand">
          <LogoMark />
          <span><strong>{t("KisanSetu")}</strong><small>{t("Farmers · Markets · Growth")}</small></span>
        </Link>

        <nav className="sidebar-links" aria-label={t("Main")}>
          {links.map(({ to, Icon, label, isActive }) => (
            <NavLink
              key={to}
              to={to}
              end
              className={({ isActive: routerActive }) => `sidebar-link${(isActive ? isActive(pathname) : routerActive) ? " active" : ""}`}
            >
              <Icon size={19} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-spacer" />
        <div className="sidebar-divider" />

        <label className="sidebar-language">
          <GlobeIcon size={18} />
          <select value={lang} onChange={(e) => setLang(e.target.value)} aria-label={t("Select language")}>
            {languages.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
          </select>
          <ChevronDownIcon size={15} />
        </label>
        <button type="button" onClick={handleLogout} className="sidebar-logout">
          <LogoutIcon size={18} /> <span>{t("Logout")}</span>
        </button>
      </aside>

      <header className="app-topbar">
        <form className="topbar-search" onSubmit={handleSearch} role="search">
          <SearchIcon size={18} />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("Search anything... (crop, mandi, price, etc.)")}
            aria-label={t("Search crops, mandi prices and more")}
          />
        </form>
        <div className="topbar-actions">
          <Link
            to={bellTarget}
            className="topbar-icon"
            aria-label={offersLabel || t("Notifications")}
            title={offersLabel || t("No new notifications")}
          >
            <BellIcon size={22} />
            {pendingOffers > 0 && <i aria-hidden="true" />}
          </Link>
          <Link to={profileTarget} className="topbar-profile">
            <span className="topbar-avatar">{displayName.charAt(0).toUpperCase()}</span>
            <span className="topbar-profile-text"><strong>{displayName}</strong><small>{ROLE_LABEL[role] ? t(ROLE_LABEL[role]) : t("User")}</small></span>
            <ChevronDownIcon size={16} />
          </Link>
        </div>
      </header>
    </>
  );
}
