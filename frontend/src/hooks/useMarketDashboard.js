import { useEffect, useMemo, useRef, useState } from "react";
import { calculateTransport, getDecision, getPriceHistory, getPriceSummary } from "../api/client.js";
import { T } from "../i18n/mark.js";

// What the farmer sees (label/icon) vs. what the price API is asked for (query).
// AGMARKNET files paddy under "Paddy(Common)", so a plain "Paddy" lookup never matches.
const CROP_CATALOG = {
  wheat: { label: T("Wheat"), query: "Wheat", icon: "🌾" },
  paddy: { label: T("Paddy (Dhan)"), query: "Paddy(Common)", icon: "🌾" },
  rice: { label: T("Rice"), query: "Rice", icon: "🍚" },
  maize: { label: T("Maize"), query: "Maize", icon: "🌽" },
  soybean: { label: T("Soybean"), query: "Soybean", icon: "🫘" },
  mustard: { label: T("Mustard"), query: "Mustard", icon: "🌼" },
  onion: { label: T("Onion"), query: "Onion", icon: "🧅" },
  potato: { label: T("Potato"), query: "Potato", icon: "🥔" },
  tomato: { label: T("Tomato"), query: "Tomato", icon: "🍅" },
  cotton: { label: T("Cotton"), query: "Cotton", icon: "🪴" },
};
const DEFAULT_ORDER = ["wheat", "paddy", "maize", "soybean", "mustard", "onion", "potato", "tomato", "cotton"];
const MAX_CANDIDATES = 9;
const MAX_ROWS = 5;
const EMPTY_DETAIL = { forKey: null, series: null, demand: null, freight: null, seriesLoading: false, demandLoading: false, freightLoading: false };

const titleCase = (s) => s.replace(/\b\w/g, (c) => c.toUpperCase());

/** The farmer's own crops first (profile `main_crops`), then the usual mandi staples. */
function candidateCrops(mainCrops) {
  const own = String(mainCrops || "")
    .split(/,|\/|&|\band\b/i)
    .map((c) => c.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 3);
  const keys = [...new Set([...own, ...DEFAULT_ORDER])].slice(0, MAX_CANDIDATES);
  return keys.map((key) => ({
    key,
    ...(CROP_CATALOG[key] || { label: titleCase(key), query: titleCase(key), icon: "🌱" }),
  }));
}

function parseDate(str) {
  if (!str) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return new Date(str);
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(str);
  return m ? new Date(`${m[3]}-${m[2]}-${m[1]}`) : null;
}

const formatDay = (d) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });

/** Real daily series (bundled history) or, for live crops, today's price across markets. */
function buildSeries(history) {
  const records = history?.records ?? [];
  if (history && history.is_live === false) {
    const points = records
      .map((r) => ({ date: parseDate(r.arrival_date), price: Number(r.modal_price) }))
      .filter((p) => p.date && Number.isFinite(p.price))
      .sort((a, b) => a.date - b.date)
      .slice(-6);
    return {
      mode: "series",
      isLive: false,
      asOf: points.length ? points[points.length - 1].date : null,
      points: points.map((p) => ({ label: formatDay(p.date), date: p.date, price: p.price })),
    };
  }
  const points = records
    .map((r) => ({ market: r.market, price: Number(r.modal_price) }))
    .filter((p) => Number.isFinite(p.price))
    .sort((a, b) => a.price - b.price)
    .slice(0, 24);
  return { mode: "spread", isLive: true, asOf: null, points: points.map((p) => ({ label: p.market, price: p.price })) };
}

function dayOverDay(points) {
  if (points.length < 2) return null;
  const prev = points[points.length - 2].price;
  const last = points[points.length - 1].price;
  return prev ? Number((((last - prev) / prev) * 100).toFixed(1)) : null;
}

/**
 * Data for the farmer home dashboard: a row of current prices for the farmer's crops
 * (plus the usual staples), and — for whichever crop is selected — its price chart,
 * buyer demand and freight cost to the nearest reporting mandi. Everything is real
 * backend data; anything the feed doesn't have comes back as null so the UI can say
 * so instead of inventing a number.
 */
export function useMarketDashboard({ district, state, mainCrops, ready }) {
  const candidates = useMemo(() => candidateCrops(mainCrops), [mainCrops]);
  const cropSignature = candidates.map((c) => c.key).join("|");
  const params = useMemo(() => (district ? { district, state } : {}), [district, state]);
  const historyCache = useRef(new Map());

  const [rows, setRows] = useState([]);
  const [rowsLoading, setRowsLoading] = useState(true);
  const [selectedKey, setSelectedKey] = useState(null);
  const [detail, setDetail] = useState({ ...EMPTY_DETAIL, seriesLoading: true, demandLoading: true, freightLoading: true });

  const loadHistory = (crop) => {
    const cacheKey = `${crop.query}|${district || ""}|${state || ""}`;
    if (!historyCache.current.has(cacheKey)) {
      historyCache.current.set(
        cacheKey,
        getPriceHistory(encodeURIComponent(crop.query), params).catch((error) => {
          historyCache.current.delete(cacheKey);
          throw error;
        })
      );
    }
    return historyCache.current.get(cacheKey);
  };

  // 1) Current price for every candidate crop; keep the first few that have data.
  useEffect(() => {
    if (!ready) return undefined;
    let active = true;
    setRowsLoading(true);

    (async () => {
      // One request for every candidate; crops with no data simply aren't in the reply.
      let summary = { prices: [] };
      try {
        summary = await getPriceSummary(candidates.map((crop) => crop.query), params);
      } catch {
        // Backend unreachable: show the empty state rather than throwing.
      }
      const byQuery = new Map(summary.prices.map((price) => [price.crop, price]));
      const found = candidates
        .filter((crop) => byQuery.has(crop.query))
        .map((crop) => {
          const price = byQuery.get(crop.query);
          return {
            ...crop,
            price: Number(price.current_price_per_quintal),
            market: price.market,
            isLive: price.is_live !== false,
            locationMatch: price.location_match !== false,
            minPrice: price.min_price,
            maxPrice: price.max_price,
            arrivalDate: price.arrival_date,
            change: null,
          };
        })
        .slice(0, MAX_ROWS);
      if (!active) return;
      setRows(found);
      setRowsLoading(false);
      setSelectedKey((current) => (found.some((r) => r.key === current) ? current : found[0]?.key ?? null));

      // Day-over-day change only exists where there is a genuine daily series (the
      // bundled history); live rows are a one-day snapshot and carry no change.
      const withChange = await Promise.all(
        found.map(async (row) => {
          if (row.isLive) return row;
          try {
            const series = buildSeries(await loadHistory(row));
            return { ...row, change: dayOverDay(series.points), asOf: series.asOf };
          } catch {
            return row;
          }
        })
      );
      if (active) setRows(withChange);
    })();

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, cropSignature, params]);

  const selected = rows.find((r) => r.key === selectedKey) || null;

  // 2) Chart, buyer demand and freight for the selected crop. Each lands as soon as it
  // is ready (with its own loading flag) so the chart never waits on the slowest call.
  useEffect(() => {
    if (!selected) {
      setDetail({ ...EMPTY_DETAIL, seriesLoading: rowsLoading, demandLoading: rowsLoading, freightLoading: rowsLoading });
      return undefined;
    }
    let active = true;
    setDetail({ ...EMPTY_DETAIL, forKey: selected.key, seriesLoading: true, demandLoading: true, freightLoading: true });
    const patch = (fields) => active && setDetail((d) => ({ ...d, ...fields }));

    const decisionCall = getDecision({
      crop_name: selected.label.replace(/\s*\(.*\)/, ""),
      current_price_per_kg: Number((selected.price / 100).toFixed(2)),
      quantity_kg: 1000,
      storage_capacity_kg: 600,
      district: district || "Central",
      transport_cost_per_kg: 1.0,
      storage_cost_per_kg: 0.5,
    });
    // Freight is only meaningful to a mandi that is actually near the farmer.
    const freightCall =
      selected.isLive && selected.locationMatch && selected.market && district
        ? calculateTransport({
            origin_district: [district, state].filter(Boolean).join(", "),
            destination_district: [selected.market, district, state].filter(Boolean).join(", "),
            quantity_kg: 1000,
            is_fpo_pooled: false,
          })
        : Promise.resolve(null);

    loadHistory(selected)
      .then((history) => patch({ series: buildSeries(history), seriesLoading: false }))
      .catch(() => patch({ seriesLoading: false }));
    decisionCall
      .then((result) => patch({ demand: result.demand_level, demandLoading: false }))
      .catch(() => patch({ demandLoading: false }));
    freightCall
      .then((result) => patch({ freight: result, freightLoading: false }))
      .catch(() => patch({ freightLoading: false }));

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedKey, rows.length, district, state]);

  // A refresh can change or drop the selected crop a render before the effect above
  // replaces its detail; never show one crop's chart/demand/freight under another crop.
  const currentDetail =
    detail.forKey === (selected?.key ?? null)
      ? detail
      : { ...EMPTY_DETAIL, seriesLoading: true, demandLoading: true, freightLoading: true };

  return { rows, rowsLoading, selected, selectCrop: setSelectedKey, detail: currentDetail };
}
