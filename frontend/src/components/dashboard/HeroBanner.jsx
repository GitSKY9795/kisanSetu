import { Link } from "react-router-dom";
import { ArrowRightIcon, CloudIcon, PartlyCloudyIcon, PinIcon, RainIcon, SunIcon } from "../icons.jsx";
import { useLanguage } from "../../context/LanguageContext.jsx";
import { T } from "../../i18n/mark.js";

function greeting(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return T("Good Morning");
  if (hour < 17) return T("Good Afternoon");
  return T("Good Evening");
}

const WEATHER_ICONS = { sun: SunIcon, partly: PartlyCloudyIcon, cloud: CloudIcon, rain: RainIcon };

function WeatherCard({ weather, location }) {
  const { t } = useLanguage();
  const { loading, data } = weather;
  const Icon = data ? WEATHER_ICONS[data.kind] || SunIcon : SunIcon;

  return (
    <aside className="db-weather" aria-label={t("Local weather")}>
      <div className="db-weather-main">
        <span className={`db-weather-icon ${data?.kind || ""}`}><Icon size={34} strokeWidth={1.6} /></span>
        <div>
          <strong className="db-weather-temp">{data ? `${data.temp}°C` : loading ? "…" : "—"}</strong>
          <span className="db-weather-label">{data ? t(data.label) : loading ? t("Checking weather") : t("Weather unavailable")}</span>
        </div>
      </div>
      <p className="db-weather-place"><PinIcon size={14} /> <span>{location || t("Location not set")}</span></p>
      <p className="db-weather-advice"><SunIcon size={13} /> {data ? t(data.advice) : t("Live weather appears here once available")}</p>
    </aside>
  );
}

export default function HeroBanner({ name, location, weather }) {
  const { t } = useLanguage();
  return (
    <section className="db-hero">
      <div className="db-hero-copy">
        <p className="db-hero-greeting">{t(greeting())}, <span aria-hidden="true">🌿</span> {name}!</p>
        <h1>{t("Welcome to KisanSetu")}</h1>
        <p className="db-hero-sub">{t("Your smart farming companion for better prices, informed decisions and a stronger tomorrow.")}</p>
        <div className="db-hero-actions">
          <Link to="/prices" className="db-btn db-btn-dark">{t("Explore Market Trends")} <ArrowRightIcon size={15} /></Link>
          <Link to="/profile" className="db-btn db-btn-light">{t("View My Profile")}</Link>
        </div>
      </div>
      <WeatherCard weather={weather} location={location} />
    </section>
  );
}
