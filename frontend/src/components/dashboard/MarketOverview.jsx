import ChangeBadge from "./ChangeBadge.jsx";
import { CloudIcon, RupeeIcon, TrendsIcon, TruckIcon, UsersIcon } from "../icons.jsx";
import { useLanguage } from "../../context/LanguageContext.jsx";
import { T } from "../../i18n/mark.js";

const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s);

// Levels as the backend reports them (HIGH / MEDIUM / ...), shown in the farmer's language.
const LEVELS = { high: T("High"), medium: T("Medium"), moderate: T("Moderate"), low: T("Low") };
const levelLabel = (level) => LEVELS[String(level).toLowerCase()] || capitalize(String(level));

function rainRisk(rainPct) {
  if (rainPct == null) return null;
  if (rainPct >= 60) return { level: T("High"), tone: "bad" };
  if (rainPct >= 30) return { level: T("Medium"), tone: "warn" };
  return { level: T("Low"), tone: "good" };
}

function Stat({ Icon, tone, label, value, unit, sub, extra }) {
  return (
    <div className="db-stat">
      <div className="db-stat-top">
        <span className={`db-tile sm ${tone}`}><Icon size={17} /></span>
        <span className="db-stat-label">{label}</span>
      </div>
      <strong className="db-stat-value">{value}{unit && <small>{unit}</small>}</strong>
      <span className="db-stat-sub">{sub}{extra}</span>
    </div>
  );
}

export default function MarketOverview({ selected, detail, weather, loading }) {
  const { t } = useLanguage();
  const risk = rainRisk(weather?.rainPct);
  const freight = detail.freight;
  const cropName = selected ? t(selected.label) : "";
  const freightNote = freight
    ? freight.data_source === "OpenRouteService live route"
      ? t("To nearest mandi · {km} km", { km: Math.round(freight.distance_km) })
      : t("To nearest mandi · est.")
    : t("No nearby mandi today");

  return (
    <section className="db-card">
      <header className="db-card-head">
        <span className="db-tile sm green"><TrendsIcon size={18} /></span>
        <div>
          <h2>{t("Market Overview")}</h2>
          <p>{t("Live market prices and demand for your crops")}</p>
        </div>
      </header>

      <div className="db-stats">
        <Stat
          Icon={RupeeIcon}
          tone="green"
          label={t("Current Market Price")}
          value={selected ? `₹${selected.price.toLocaleString("en-IN")}` : loading ? "…" : "—"}
          unit={selected ? ` ${t("/qtl")}` : ""}
          sub={selected ? `${cropName} ` : t("No price available")}
          extra={selected && <ChangeBadge change={selected.change} isLive={selected.isLive} asOf={selected.asOf} />}
        />
        <Stat
          Icon={UsersIcon}
          tone="teal"
          label={t("Buyer Demand")}
          value={detail.demand ? t(levelLabel(detail.demand)) : detail.demandLoading ? "…" : "—"}
          sub={cropName}
        />
        <Stat
          Icon={CloudIcon}
          tone={risk ? (risk.tone === "good" ? "green" : risk.tone === "warn" ? "gold" : "red") : "green"}
          label={t("Weather Risk")}
          value={risk ? t(risk.level) : weather ? "—" : "…"}
          sub={weather ? t("Rain chance {pct}% today", { pct: Math.round(weather.rainPct) }) : t("Checking forecast")}
        />
        <Stat
          Icon={TruckIcon}
          tone="gold"
          label={t("Avg Freight Cost")}
          value={freight ? `₹${Number(freight.transport_cost_per_kg).toFixed(2)}` : detail.freightLoading ? "…" : "—"}
          unit={freight ? ` ${t("/kg")}` : ""}
          sub={freightNote}
        />
      </div>
    </section>
  );
}
