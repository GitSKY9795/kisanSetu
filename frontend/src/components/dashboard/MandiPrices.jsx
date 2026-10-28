import { useState } from "react";
import { Link } from "react-router-dom";
import ChangeBadge from "./ChangeBadge.jsx";
import { TruckIcon } from "../icons.jsx";
import { useLanguage } from "../../context/LanguageContext.jsx";
import { T } from "../../i18n/mark.js";

const TABS = [
  { id: "gainers", label: T("Top Gainers") },
  { id: "losers", label: T("Top Losers") },
  { id: "all", label: T("All Commodities") },
];

function visibleRows(rows, tab) {
  if (tab === "gainers") return rows.filter((r) => r.change > 0).sort((a, b) => b.change - a.change);
  if (tab === "losers") return rows.filter((r) => r.change < 0).sort((a, b) => a.change - b.change);
  return rows;
}

export default function MandiPrices({ rows, loading, selectedKey, onSelect }) {
  const { t } = useLanguage();
  const [tab, setTab] = useState("all");
  const shown = visibleRows(rows, tab);

  return (
    <section className="db-card">
      <header className="db-card-head">
        <span className="db-tile sm green"><TruckIcon size={18} /></span>
        <div><h2>{t("Today's Mandi Prices")}</h2></div>
        <Link to="/prices" className="db-link">{t("View All →")}</Link>
      </header>

      <div className="db-tabs" role="tablist">
        {TABS.map(({ id, label }) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}>
            {t(label)}
          </button>
        ))}
      </div>

      <div className="db-table" role="table">
        <div className="db-table-head" role="row">
          <span>{t("Commodity")}</span><span>{t("Price (₹/qtl)")}</span><span>{t("Change")}</span>
        </div>

        {loading && Array.from({ length: 5 }).map((_, i) => <div key={i} className="db-row skeleton" aria-hidden="true"><i /><i /><i /></div>)}

        {!loading && shown.map((row) => (
          <button
            key={row.key}
            type="button"
            role="row"
            className={`db-row${row.key === selectedKey ? " active" : ""}`}
            onClick={() => onSelect(row.key)}
            title={t("Show {crop} in the overview and chart", { crop: t(row.label) })}
          >
            <span className="db-crop"><span className="db-crop-icon" aria-hidden="true">{row.icon}</span>{t(row.label)}</span>
            <strong>{row.price.toLocaleString("en-IN")}</strong>
            <ChangeBadge change={row.change} isLive={row.isLive} asOf={row.asOf} />
          </button>
        ))}

        {!loading && shown.length === 0 && (
          <p className="db-empty small">
            {rows.length === 0
              ? t("No mandi prices are available right now.")
              : t("Day-on-day changes aren't published for today's live prices. Switch to All Commodities.")}
          </p>
        )}
      </div>
    </section>
  );
}
