import { useAssistant } from "../context/AssistantContext.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";
import { MicIcon } from "./icons.jsx";
import "../styles/assistant.css";

export default function FloatingAssistantButton() {
  const { openAssistant } = useAssistant();
  const { t } = useLanguage();

  return (
    <div className="va-fab">
      <button type="button" onClick={() => openAssistant({ mode: "voice" })} aria-label={t("Open AI Voice Assistant")}>
        <MicIcon size={26} />
      </button>
      <span className="va-fab-tip">{t("AI Assistant")}</span>
    </div>
  );
}
