import { useEffect, useState } from "react";
import { T } from "../i18n/mark.js";

// WMO weather codes -> label + which icon the weather card should show.
function describe(code) {
  if (code === 0) return { label: T("Clear sky"), kind: "sun" };
  if (code === 1) return { label: T("Mostly clear"), kind: "sun" };
  if (code === 2) return { label: T("Partly cloudy"), kind: "partly" };
  if (code === 3) return { label: T("Overcast"), kind: "cloud" };
  if (code === 45 || code === 48) return { label: T("Foggy"), kind: "cloud" };
  if (code >= 51 && code <= 57) return { label: T("Drizzle"), kind: "rain" };
  if (code >= 61 && code <= 67) return { label: T("Rain"), kind: "rain" };
  if (code >= 80 && code <= 82) return { label: T("Rain showers"), kind: "rain" };
  if (code >= 95) return { label: T("Thunderstorm"), kind: "rain" };
  return { label: T("Cloudy"), kind: "cloud" };
}

function farmingAdvice(rainPct, tempC) {
  if (rainPct >= 60) return T("Heavy rain likely — protect harvested produce");
  if (rainPct >= 30) return T("Showers possible — plan transport early");
  if (tempC >= 40) return T("Very hot — irrigate early morning or evening");
  return T("Good weather for farming");
}

async function geocode(place) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(place)}&count=1&country_code=IN&language=en`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("geocoding failed");
  const hit = (await res.json()).results?.[0];
  if (!hit) throw new Error("place not found");
  return { lat: hit.latitude, lon: hit.longitude };
}

/**
 * Current conditions for the farmer's location from Open-Meteo (free, no key — the
 * same provider the backend's weather service uses). Coordinates come from the live
 * geolocation when the location shown is the detected one; when it's the district on
 * the farmer's profile, that name is geocoded instead so the card always describes
 * the place it's labelled with. Returns `{ loading, data }`; `data` is null if the
 * provider can't be reached, so the card can degrade quietly rather than error.
 */
export function useWeather({ lat, lon, district }) {
  const [state, setState] = useState({ loading: true, data: null });

  useEffect(() => {
    let active = true;
    setState((s) => ({ ...s, loading: true }));

    (async () => {
      try {
        const point = lat != null && lon != null ? { lat, lon } : district ? await geocode(district) : null;
        if (!point) throw new Error("no location");
        const url =
          `https://api.open-meteo.com/v1/forecast?latitude=${point.lat}&longitude=${point.lon}` +
          "&current=temperature_2m,weather_code&daily=precipitation_probability_max&timezone=auto";
        const res = await fetch(url);
        if (!res.ok) throw new Error("forecast failed");
        const json = await res.json();
        const temp = Math.round(json.current.temperature_2m);
        const rainPct = Number(json.daily?.precipitation_probability_max?.[0] ?? 0);
        const { label, kind } = describe(json.current.weather_code);
        if (active) {
          setState({
            loading: false,
            data: { temp, label, kind, rainPct, advice: farmingAdvice(rainPct, temp) },
          });
        }
      } catch {
        if (active) setState({ loading: false, data: null });
      }
    })();

    return () => {
      active = false;
    };
  }, [lat, lon, district]);

  return state;
}
