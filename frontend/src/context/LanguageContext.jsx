import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import translations from "../i18n/translations.js";

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

function getByPath(obj, path) {
  return path.split(".").reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj);
}

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem("kisansetu_lang") || "en");

  useEffect(() => {
    localStorage.setItem("kisansetu_lang", lang);
    document.documentElement.setAttribute("lang", lang);
    document.body.classList.toggle("font-hindi", ["hi", "mr"].includes(lang));
  }, [lang]);

  const t = useMemo(() => {
    return (key) => {
      const currentDict = translations[lang] || translations.en;
      const value = getByPath(currentDict, key);
      if (value !== undefined) return value;
      const fallback = getByPath(translations.en, key);
      return fallback !== undefined ? fallback : key;
    };
  }, [lang]);

  const currentLanguage = LANGUAGES.find((l) => l.code === lang) || LANGUAGES[0];

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, currentLanguage, languages: LANGUAGES }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within a LanguageProvider");
  return ctx;
}
