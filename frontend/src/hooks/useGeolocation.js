import { useEffect, useState } from "react";

const CACHE_KEY = "kisansetu_location_v1";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 1 day — a farmer's location rarely changes mid-session

function readCache() {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.cachedAt > CACHE_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(data) {
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify({ ...data, cachedAt: Date.now() }));
  } catch {
    // localStorage unavailable — non-fatal, just skip caching
  }
}

async function reverseGeocode(lat, lon) {
  // Nominatim (OpenStreetMap) — free, no API key, matches this app's existing pattern
  // of using no-key data sources (Open-Meteo) wherever possible.
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=10&accept-language=en`;
  const res = await fetch(url, { headers: { "Accept": "application/json" } });
  if (!res.ok) throw new Error("Reverse geocoding failed");
  const data = await res.json();
  const addr = data.address || {};
  return {
    district: addr.county || addr.state_district || addr.city_district || addr.city || addr.town || null,
    state: addr.state || null,
  };
}

/**
 * Captures the browser's real geolocation once per session (cached 24h), reverse-geocodes
 * it to a district/state, and exposes it so location-dependent screens (mandi prices,
 * weather, logistics) can default to where the user actually is instead of a hardcoded
 * district. Never blocks rendering — screens should treat this as progressive enhancement
 * and keep their own fallback default until `loading` turns false.
 */
export function useGeolocation() {
  const [state, setState] = useState(() => {
    const cached = readCache();
    return cached
      ? { loading: false, error: null, ...cached }
      : { loading: true, error: null, lat: null, lon: null, district: null, state: null };
  });

  useEffect(() => {
    if (!state.loading) return;
    if (!("geolocation" in navigator)) {
      setState((s) => ({ ...s, loading: false, error: "Geolocation not supported by this browser." }));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        try {
          const place = await reverseGeocode(lat, lon);
          const result = { lat, lon, district: place.district, state: place.state };
          writeCache(result);
          setState({ loading: false, error: null, ...result });
        } catch {
          const result = { lat, lon, district: null, state: null };
          writeCache(result);
          setState({ loading: false, error: null, ...result });
        }
      },
      (err) => {
        setState((s) => ({ ...s, loading: false, error: err.message || "Location permission denied." }));
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: CACHE_TTL_MS }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return state;
}
