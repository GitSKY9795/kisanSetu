import { useMemo } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { TrendsIcon } from "../icons.jsx";
import { useLanguage } from "../../context/LanguageContext.jsx";

const rupees = (v) => `₹${Number(v).toLocaleString("en-IN")}`;

export default function PriceTrendChart({ selected, detail }) {
  const { t, locale } = useLanguage();
  const series = detail.series;
  const hasData = Boolean(selected && series && series.points.length > 1);
  const live = series?.isLive;

  // Dates on the axis follow the chosen language (the hook supplies real Date objects).
  const points = useMemo(
    () =>
      (series?.points || []).map((p) => ({
        ...p,
        label: p.date ? p.date.toLocaleDateString(locale, { day: "numeric", month: "short" }) : p.label,
      })),
    [series, locale]
  );

  let note = "";
  if (hasData) {
    const crop = t(selected.label);
    if (series.mode === "spread") {
      note = t("Live modal prices across {count} markets reporting {crop} today, lowest to highest (₹/quintal).", { count: series.points.length, crop });
    } else {
      const asOf = series.asOf
        ? series.asOf.toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" })
        : t("recent history");
      note = t("Daily modal price from bundled mandi history; latest record {date}. No live arrival reported for {crop} today.", { date: asOf, crop });
    }
  }

  return (
    <section className="db-card db-chart-card">
      <header className="db-card-head">
        <span className="db-tile sm green"><TrendsIcon size={18} /></span>
        <div>
          <h2>{t("Market Price Trend")}</h2>
          <p>{selected ? t("{crop} (₹/qtl)", { crop: t(selected.label) }) : t("Select a commodity")}</p>
        </div>
        {selected && series && <span className={`db-pill ${live ? "live" : "ref"}`}>{live ? t("● Live") : t("Historical")}</span>}
      </header>

      <div className="db-chart">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={points} margin={{ top: 8, right: 10, left: -8, bottom: 0 }}>
              <defs>
                <linearGradient id="dbTrendFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2f9a55" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="#2f9a55" stopOpacity="0" />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="#e7efe8" />
              <XAxis
                dataKey="label"
                hide={series.mode === "spread"}
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#7b9186", fontSize: 10 }}
                interval="preserveStartEnd"
              />
              <YAxis
                width={52}
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#7b9186", fontSize: 10 }}
                tickFormatter={(v) => Number(v).toLocaleString("en-IN")}
                domain={[(min) => Math.floor((min * 0.97) / 10) * 10, (max) => Math.ceil((max * 1.03) / 10) * 10]}
              />
              <Tooltip
                cursor={{ stroke: "#9cc9a8", strokeDasharray: "3 3" }}
                contentStyle={{ borderRadius: 10, border: "1px solid #dcebdd", boxShadow: "0 8px 22px rgba(20,70,45,.14)", fontSize: 12 }}
                formatter={(value) => [rupees(value), t("Modal price")]}
              />
              <Area
                type="monotone"
                dataKey="price"
                stroke="#1f7a45"
                strokeWidth={2.4}
                fill="url(#dbTrendFill)"
                dot={{ r: 3, fill: "#fff", stroke: "#1f7a45", strokeWidth: 2 }}
                activeDot={{ r: 5, fill: "#1f7a45", stroke: "#fff", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="db-empty">
            {detail.seriesLoading ? t("Loading price trend…") : t("A price trend isn't available for this crop yet.")}
          </div>
        )}
      </div>
      <p className="db-note">{note}</p>
    </section>
  );
}
