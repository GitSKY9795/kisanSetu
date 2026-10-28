import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import locales from "../i18n/locales.js";

const LanguageContext = createContext(null);

export const LANGUAGES = [
  { code: "en", label: "English", flagLabel: "🇬🇧 English", speechLang: "en-IN" },
  { code: "hi", label: "हिन्दी", flagLabel: "🇮🇳 हिन्दी (Hindi)", speechLang: "hi-IN" },
  { code: "mr", label: "मराठी", flagLabel: "🇮🇳 मराठी (Marathi)", speechLang: "mr-IN" },
  { code: "gu", label: "ગુજરાતી", flagLabel: "🇮🇳 ગુજરાતી (Gujarati)", speechLang: "gu-IN" },
  { code: "pa", label: "ਪੰਜਾਬੀ", flagLabel: "🇮🇳 ਪੰਜਾਬੀ (Punjabi)", speechLang: "pa-IN" },
  { code: "te", label: "తెలుగు", flagLabel: "🇮🇳 తెలుగు (Telugu)", speechLang: "te-IN" },
  { code: "ta", label: "தமிழ்", flagLabel: "🇮🇳 தமிழ் (Tamil)", speechLang: "ta-IN" },
  { code: "bn", label: "বাংলা", flagLabel: "🇮🇳 বাংলা (Bengali)", speechLang: "bn-IN" },
];

// In development, remember every phrase that was asked for in a non-English language but
// has no translation, so gaps can be found by browsing the app (`window.__i18nMissing`).
const missing = new Set();
if (import.meta.env.DEV && typeof window !== "undefined") window.__i18nMissing = missing;

function fill(text, vars) {
  return vars ? text.replace(/\{(\w+)\}/g, (match, name) => (vars[name] !== undefined ? String(vars[name]) : match)) : text;
}

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => {
    const saved = localStorage.getItem("kisansetu_lang");
    return LANGUAGES.some((l) => l.code === saved) ? saved : "en";
  });

  useEffect(() => {
    localStorage.setItem("kisansetu_lang", lang);
    document.documentElement.setAttribute("lang", lang);
    document.body.classList.toggle("font-hindi", ["hi", "mr"].includes(lang));
  }, [lang]);

  // `t("English text", { name: value })` — the English wording is the key, and
  // `{name}` marks where a value goes (so each language can place it wherever its own
  // grammar needs it). English, and any phrase not yet translated, falls back to the key.
  const { t, tn } = useMemo(() => {
    const table = locales[lang];
    const lookup = (key) => {
      if (lang === "en") return key;
      const hit = table && table[key];
      if (hit !== undefined) return hit;
      if (import.meta.env.DEV) missing.add(`${lang}: ${key}`);
      return key;
    };
    return {
      t: (key, vars) => fill(lookup(key), vars),
      // Like `t`, but the values may be React elements (e.g. a <strong> name), so a
      // translated sentence can still emphasise part of itself.
      tn: (key, vars = {}) =>
        lookup(key)
          .split(/(\{\w+\})/g)
          .map((part, i) => {
            const name = /^\{(\w+)\}$/.exec(part)?.[1];
            return name && vars[name] !== undefined ? <React.Fragment key={i}>{vars[name]}</React.Fragment> : part;
          }),
    };
  }, [lang]);

  useEffect(() => {
    document.title = t("KisanSetu — Market Linkages & Price Discovery for Farmers");
  }, [t]);

  const currentLanguage = LANGUAGES.find((l) => l.code === lang) || LANGUAGES[0];

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, tn, currentLanguage, languages: LANGUAGES, locale: currentLanguage.speechLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within a LanguageProvider");
  return ctx;
}
