import { Link } from "react-router-dom";
import { AwardIcon, ClipboardIcon, PinIcon, SparkleIcon, TagIcon } from "../icons.jsx";
import { useLanguage } from "../../context/LanguageContext.jsx";
import { T } from "../../i18n/mark.js";

// Each card opens the matching tab of the farmer's sell-decision workspace.
const FEATURES = [
  { to: "/farmer?tab=decision", title: T("AI Sell Recommendation"), hint: T("Get best market price"), Icon: SparkleIcon, tone: "green" },
  { to: "/farmer?tab=arbitrage", title: T("Nearby Mandi Arbitrage"), hint: T("Find better rates"), Icon: PinIcon, tone: "teal" },
  { to: "/farmer?tab=quality", title: T("Quality & e-Certificate"), hint: T("Verify and sell with trust"), Icon: AwardIcon, tone: "gold" },
  { to: "/farmer?tab=listings", title: T("My Listings"), hint: T("Manage your produce"), Icon: ClipboardIcon, tone: "green" },
  { to: "/farmer?tab=offers", title: T("Buyer Offers & Bids"), hint: T("Get the best deals"), Icon: TagIcon, tone: "lime" },
];

export default function FeatureCards() {
  const { t } = useLanguage();
  return (
    <nav className="db-features" aria-label={t("Farmer tools")}>
      {FEATURES.map(({ to, title, hint, Icon, tone }) => (
        <Link key={to} to={to} className="db-feature">
          <span className={`db-tile ${tone}`}><Icon size={20} /></span>
          <span className="db-feature-text"><strong>{t(title)}</strong><small>{t(hint)}</small></span>
        </Link>
      ))}
    </nav>
  );
}
