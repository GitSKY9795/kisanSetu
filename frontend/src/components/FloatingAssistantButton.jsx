import { useAssistant } from "../context/AssistantContext.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";

export default function FloatingAssistantButton() {
  const { openAssistant } = useAssistant();
  const { t } = useLanguage();

  return (
    <div className="fixed bottom-6 right-6 z-50 group">
      <button
        onClick={() => openAssistant({ mode: "voice" })}
        aria-label="Open AI Voice Assistant"
        className="relative flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-tr from-emerald-600 via-teal-600 to-amber-400 text-white shadow-2xl transition-all duration-300 transform hover:scale-110 hover:shadow-emerald-500/40 border-2 border-white/80 cursor-pointer"
      >
        <span className="text-2xl animate-pulse">🎙️</span>
        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-400 rounded-full border-2 border-white animate-ping"></span>
        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-400 rounded-full border-2 border-white"></span>
      </button>

      {/* Hover tooltip */}
      <div className="absolute right-16 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-1.5 bg-slate-900 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-xl whitespace-nowrap border border-slate-700 pointer-events-none transition-all">
        <span>🤖</span>
        <span>{t("nav.aiAssistant")}</span>
      </div>
    </div>
  );
}
