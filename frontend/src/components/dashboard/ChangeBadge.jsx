import { ArrowDownIcon, ArrowUpIcon } from "../icons.jsx";
import { useLanguage } from "../../context/LanguageContext.jsx";

/**
 * A price's change indicator. `change` is a real day-over-day % where the data has a
 * genuine daily series; otherwise it's null and the badge says where the number came
 * from ("Live" snapshot vs bundled "Reference" history) rather than inventing a delta.
 */
export default function ChangeBadge({ change, isLive, asOf }) {
  const { t, locale } = useLanguage();
  if (change == null) {
    return isLive
      ? <span className="db-badge live" title={t("Live mandi price reported today")}>{t("Live")}</span>
      : <span className="db-badge ref" title={t("From bundled mandi history — no live arrival today")}>{t("Ref.")}</span>;
  }
  const up = change >= 0;
  const Icon = up ? ArrowUpIcon : ArrowDownIcon;
  const title = asOf
    ? t("Day-on-day, as of {date}", { date: asOf.toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" }) })
    : undefined;
  return (
    <span className={`db-change ${up ? "up" : "down"}`} title={title}>
      <Icon size={12} strokeWidth={2.4} />{Math.abs(change).toFixed(1)}%
    </span>
  );
}
