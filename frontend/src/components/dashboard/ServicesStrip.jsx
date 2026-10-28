import { Link } from "react-router-dom";
import { ArrowRightIcon, ShieldIcon, StoreIcon, TrendsIcon, TruckIcon } from "../icons.jsx";
import { useLanguage } from "../../context/LanguageContext.jsx";
import { T } from "../../i18n/mark.js";

const SERVICES = [
  { to: "/prices", title: T("Mandi Trends"), hint: T("Live prices & forecasts"), Icon: TrendsIcon },
  { to: "/logistics", title: T("Storage & Logistics"), hint: T("Safe storage & transport"), Icon: TruckIcon },
  { to: "/marketplace", title: T("Marketplace"), hint: T("Buyers, sellers & bids"), Icon: StoreIcon },
  { to: "/grievances", title: T("Grievance Portal"), hint: T("Raise & track issues"), Icon: ShieldIcon },
];

export default function ServicesStrip() {
  const { t } = useLanguage();
  return (
    <div className="db-bottom">
      <section className="db-card db-services">
        <div className="db-services-art" aria-hidden="true" />
        <div className="db-services-body">
          <h2>{t("Access All KisanSetu Services")}</h2>
          <p>{t("From market insights to storage, logistics and grievance support — everything you need in one place.")}</p>
          <div className="db-services-grid">
            {SERVICES.map(({ to, title, hint, Icon }) => (
              <Link key={to} to={to} className="db-service">
                <span className="db-tile sm green"><Icon size={18} /></span>
                <span className="db-action-text"><strong>{t(title)}</strong><small>{t(hint)}</small></span>
              </Link>
            ))}
          </div>
        </div>
      </section>
      <Link to="/marketplace" className="db-explore">
        {t("Explore All Services")} <ArrowRightIcon size={16} />
      </Link>
    </div>
  );
}
