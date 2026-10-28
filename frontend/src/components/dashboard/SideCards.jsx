import { Link } from "react-router-dom";
import { useAssistant } from "../../context/AssistantContext.jsx";
import { AlertIcon, ArrowRightIcon, ArrowUpRightIcon, ChevronRightIcon, FilePlusIcon, SparkleIcon, TrendsIcon, TruckIcon } from "../icons.jsx";
import { GrainSackIllustration, RobotIllustration } from "./illustrations.jsx";
import { useLanguage } from "../../context/LanguageContext.jsx";
import { T } from "../../i18n/mark.js";

export function AiPromoCard() {
  const { t } = useLanguage();
  const { openAssistant } = useAssistant();
  return (
    <section className="db-card db-ai">
      <span className="db-ai-tag"><SparkleIcon size={11} /> {t("AI POWERED")}</span>
      <h2>{t("Get the Best Market Price")}</h2>
      <p>{t("Our AI analyzes market trends, demand and nearby mandi rates to help you get the best price for your produce.")}</p>
      <button type="button" className="db-btn db-btn-dark" onClick={() => openAssistant({ mode: "text" })}>
        {t("Try AI Assistant")} <ArrowRightIcon size={15} />
      </button>
      <RobotIllustration className="db-ai-art" />
    </section>
  );
}

/** Message is derived from the selected crop's real data — never a canned "sell now". */
function opportunityCopy(selected, t) {
  if (!selected) return { title: t("Market Opportunity"), body: t("Prices for your crops will appear here once the mandi feed responds.") };
  const crop = t(selected.label);
  const inr = (n) => Number(n).toLocaleString("en-IN");
  if (selected.change != null && selected.change > 0) {
    return { title: t("Good Time to Sell"), body: t("{crop} is up {pct}% on the last recorded day — a favourable movement.", { crop, pct: selected.change.toFixed(1) }) };
  }
  if (selected.change != null && selected.change < 0) {
    return { title: t("Consider Waiting"), body: t("{crop} slipped {pct}% on the last recorded day. Compare mandis before selling.", { crop, pct: Math.abs(selected.change).toFixed(1) }) };
  }
  if (selected.isLive && selected.minPrice && selected.maxPrice) {
    return {
      title: t("Compare Before You Sell"),
      body: t("{crop} is trading between ₹{min} and ₹{max} per quintal today.", { crop, min: inr(selected.minPrice), max: inr(selected.maxPrice) }),
    };
  }
  return { title: t("Check the Market"), body: t("Open the market view to compare {crop} prices across mandis.", { crop }) };
}

export function OpportunityCard({ selected }) {
  const { t } = useLanguage();
  const { title, body } = opportunityCopy(selected, t);
  return (
    <section className="db-card db-opportunity">
      <span className="db-kicker">{t("Market Opportunity")}</span>
      <h2>{title}</h2>
      <p>{body}</p>
      <Link to={selected ? `/prices/${encodeURIComponent(selected.query)}` : "/prices"} className="db-btn db-btn-dark small">
        {t("View Market")} <ArrowRightIcon size={14} />
      </Link>
      <div className="db-opportunity-art">
        <GrainSackIllustration />
        <span className="db-opportunity-badge"><ArrowUpRightIcon size={15} strokeWidth={2.2} /></span>
      </div>
    </section>
  );
}

const ACTIONS = [
  { to: "/prices", title: T("Check Mandi Prices"), hint: T("View live mandi rates"), Icon: TrendsIcon, tone: "green" },
  { to: "/farmer?tab=listings", title: T("Create New Listing"), hint: T("Sell your produce"), Icon: FilePlusIcon, tone: "teal" },
  { to: "/marketplace", title: T("Track Shipment"), hint: T("Logistics & delivery status"), Icon: TruckIcon, tone: "gold" },
  { to: "/grievances", title: T("Raise Grievance"), hint: T("Get help for your issue"), Icon: AlertIcon, tone: "red" },
];

export function QuickActions() {
  const { t } = useLanguage();
  return (
    <section className="db-card">
      <header className="db-card-head"><div><h2>{t("Quick Actions")}</h2></div></header>
      <div className="db-actions">
        {ACTIONS.map(({ to, title, hint, Icon, tone }) => (
          <Link key={to} to={to} className="db-action">
            <span className={`db-tile sm ${tone}`}><Icon size={18} /></span>
            <span className="db-action-text"><strong>{t(title)}</strong><small>{t(hint)}</small></span>
            <ChevronRightIcon size={16} />
          </Link>
        ))}
      </div>
    </section>
  );
}
