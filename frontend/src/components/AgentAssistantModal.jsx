import { useEffect, useMemo, useRef, useState } from "react";
import { askAgent } from "../api/client.js";
import { useLanguage } from "../context/LanguageContext.jsx";
import { useAssistant } from "../context/AssistantContext.jsx";

const SpeechRecognitionAPI =
  typeof window !== "undefined" ? window.SpeechRecognition || window.webkitSpeechRecognition : null;
const speechSynthesisSupported = typeof window !== "undefined" && "speechSynthesis" in window;
const voiceInputSupported = !!SpeechRecognitionAPI;

const ENGLISH_PROMPTS = [
  "🌾 Should I sell wheat today or store it in Ujjain?",
  "📍 Compare prices across nearby mandis for Onion",
  "🏬 Find WDRA cold storages near Indore",
  "💰 How much loan can I get for 50 quintals wheat?",
  "🔍 What is Grade A moisture specification?",
  "📈 What is the 30-day price trend for Potato?",
  "🤝 How to pool produce with an FPO for corporate buyers?",
];

const HINDI_PROMPTS = [
  "🌾 क्या मुझे आज उज्जैन में गेहूं बेचना चाहिए या स्टोर करना चाहिए?",
  "📍 प्याज के लिए नजदीकी मंडियों के भाव की तुलना करें",
  "🏬 इंदौर के पास प्रमाणित कोल्ड स्टोरेज खोजें",
  "💰 50 क्विंटल गेहूं पर मुझे कितना गिरवी ऋण मिल सकता है?",
  "🔍 ग्रेड ए गेहूं के लिए नमी के क्या मानक हैं?",
  "📈 आलू के लिए अगले 30 दिनों का मूल्य पूर्वानुमान क्या है?",
  "🤝 कॉर्पोरेट खरीदारों के लिए एफपीओ पूलिंग कैसे काम करती है?",
];

export default function AgentAssistantModal({ isOpen, onClose }) {
  const { lang, t, currentLanguage } = useLanguage();
  const { initialMode, seedContext } = useAssistant();

  const [mode, setMode] = useState("voice"); // "voice" | "text"
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState([{ sender: "agent", text: t("assistant.greeting") }]);
  const [loading, setLoading] = useState(false);

  // Voice state
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const recognitionRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode === "text" || !voiceInputSupported ? "text" : "voice");
      setMessages([{ sender: "agent", text: t("assistant.greeting") }]);
    } else {
      recognitionRef.current?.abort?.();
      window.speechSynthesis?.cancel?.();
      setIsListening(false);
      setIsSpeaking(false);
      setLiveTranscript("");
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, liveTranscript]);

  const context = useMemo(
    () => ({
      crop_name: seedContext?.crop_name || "wheat",
      quantity_kg: seedContext?.quantity_kg || 500,
      district: seedContext?.district || "Ujjain",
    }),
    [seedContext]
  );

  const activePrompts = lang === "hi" || lang === "mr" || lang === "gu" || lang === "pa" || lang === "bn"
    ? HINDI_PROMPTS
    : ENGLISH_PROMPTS;

  if (!isOpen) return null;

  const speak = (text) => {
    if (!speechSynthesisSupported || !text) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = currentLanguage.speechLang;
    utterance.rate = 1.0;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const sendQuery = async (text, { speakReply = true } = {}) => {
    if (!text.trim()) return;
    setMessages((prev) => [...prev, { sender: "user", text }]);
    setLoading(true);
    try {
      const res = await askAgent({ text, language: lang, ...context });
      const replyText = res.answer || res.response || "KisanSetu recommendation generated.";
      setMessages((prev) => [...prev, { sender: "agent", text: replyText }]);
      if (speakReply) speak(replyText);
    } catch (err) {
      const fallback = err.response?.data?.detail || t("common.backendError");
      setMessages((prev) => [...prev, { sender: "agent", text: fallback }]);
      if (speakReply) speak(fallback);
    } finally {
      setLoading(false);
    }
  };

  const handleTextSend = (e) => {
    e.preventDefault();
    const text = query;
    setQuery("");
    sendQuery(text, { speakReply: false });
  };

  const handleMicPress = () => {
    if (!voiceInputSupported) return;
    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }

    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
    setLiveTranscript("");

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = currentLanguage.speechLang;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setLiveTranscript(transcript);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => {
      setIsListening(false);
      setLiveTranscript((finalText) => {
        if (finalText.trim()) sendQuery(finalText, { speakReply: true });
        return "";
      });
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopSpeaking = () => {
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-emerald-500/40 flex flex-col h-[600px] overflow-hidden">
        {/* Clean Header */}
        <div className="bg-gradient-to-r from-emerald-950 to-teal-900 text-white p-4 flex items-center justify-between shadow shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center text-xl font-black shadow">
              🎙️
            </div>
            <div>
              <h3 className="font-black text-base leading-tight">{t("assistant.title")}</h3>
              <p className="text-[11px] text-emerald-200">
                {currentLanguage.flagLabel} Voice Advisor
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white text-2xl font-bold w-8 h-8 rounded-full flex items-center justify-center hover:bg-emerald-800 transition cursor-pointer"
          >
            ×
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-emerald-50/70 border-b p-1 gap-1 shrink-0">
          <button
            onClick={() => setMode("voice")}
            className={`flex-1 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
              mode === "voice" ? "bg-emerald-600 text-white shadow" : "text-gray-600 hover:bg-emerald-100"
            }`}
          >
            {t("assistant.voiceTab")}
          </button>
          <button
            onClick={() => setMode("text")}
            className={`flex-1 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
              mode === "text" ? "bg-emerald-600 text-white shadow" : "text-gray-600 hover:bg-emerald-100"
            }`}
          >
            {t("assistant.textTab")}
          </button>
        </div>

        {/* Voice Mode View */}
        {mode === "voice" && (
          <div className="flex-1 flex flex-col justify-between p-5 bg-gradient-to-b from-white to-emerald-50/40 overflow-y-auto">
            <div className="space-y-3">
              <div className="bg-white p-4 rounded-2xl border border-emerald-200/80 shadow-sm text-xs space-y-2">
                <div className="text-[10px] font-black text-gray-500 uppercase">Advisory Response:</div>
                <div className="text-gray-900 font-semibold leading-relaxed whitespace-pre-line">
                  {messages[messages.length - 1]?.text}
                </div>
              </div>

              {isSpeaking && (
                <div className="flex justify-between items-center bg-emerald-100 text-emerald-900 p-2.5 rounded-xl border border-emerald-300 text-xs">
                  <div className="flex items-center gap-2 font-bold">
                    <span className="animate-spin">🔊</span>
                    <span>{t("assistant.speaking")}</span>
                  </div>
                  <button
                    onClick={stopSpeaking}
                    className="bg-emerald-700 hover:bg-emerald-600 text-white text-[10px] font-black px-2.5 py-1 rounded-lg cursor-pointer"
                  >
                    {t("assistant.stopSpeaking")}
                  </button>
                </div>
              )}

              {liveTranscript && (
                <div className="bg-amber-50 border border-amber-300 text-amber-900 p-2.5 rounded-xl text-xs font-semibold">
                  🎙️ {t("assistant.transcript")}: "{liveTranscript}"
                </div>
              )}
            </div>

            {/* Pulsating Center Mic Button */}
            <div className="flex flex-col items-center justify-center my-4 space-y-2">
              <button
                onClick={handleMicPress}
                className={`relative w-20 h-20 rounded-full flex items-center justify-center text-3xl shadow-2xl transition transform hover:scale-105 cursor-pointer ${
                  isListening
                    ? "bg-rose-500 text-white animate-pulse ring-8 ring-rose-200"
                    : "bg-emerald-600 text-white hover:bg-emerald-500 ring-8 ring-emerald-100"
                }`}
              >
                {isListening ? "🛑" : "🎙️"}
              </button>
              <div className="text-xs font-black text-gray-700">
                {isListening ? t("assistant.listening") : loading ? t("assistant.thinking") : t("assistant.tapToSpeak")}
              </div>
            </div>

            {/* Quick Prompt Chips */}
            <div className="space-y-1.5 pt-2 border-t border-emerald-100">
              <div className="text-[10px] font-bold text-gray-500 uppercase">Suggested Inquiries:</div>
              <div className="flex gap-1.5 flex-wrap max-h-24 overflow-y-auto">
                {activePrompts.slice(0, 4).map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => sendQuery(prompt, { speakReply: true })}
                    className="text-[11px] bg-white border border-emerald-300 text-emerald-900 hover:bg-emerald-50 px-2.5 py-1 rounded-xl font-semibold transition cursor-pointer shadow-xs"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Text Mode View */}
        {mode === "text" && (
          <div className="flex-1 flex flex-col justify-between overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs">
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] p-3.5 rounded-2xl leading-relaxed whitespace-pre-line ${
                      m.sender === "user"
                        ? "bg-emerald-600 text-white font-semibold rounded-br-none shadow"
                        : "bg-gray-100 text-gray-900 rounded-bl-none border border-gray-200"
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="text-xs text-gray-400 italic flex items-center gap-1.5">
                  <span className="animate-spin">⏳</span> {t("assistant.thinking")}
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Prompt Chips */}
            <div className="px-3 py-2 border-t bg-gray-50 flex gap-1.5 overflow-x-auto text-[11px]">
              {activePrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => sendQuery(prompt, { speakReply: false })}
                  className="bg-white border border-gray-300 hover:bg-gray-100 text-gray-800 px-2.5 py-1 rounded-xl whitespace-nowrap font-medium cursor-pointer"
                >
                  {prompt}
                </button>
              ))}
            </div>

            {/* Text Input Footer */}
            <form onSubmit={handleTextSend} className="p-3 border-t bg-white flex gap-2">
              <input
                type="text"
                placeholder={t("assistant.typePlaceholder")}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1 border border-gray-300 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="submit"
                disabled={loading || !query.trim()}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-4 py-2 rounded-xl text-xs shadow transition disabled:opacity-60 cursor-pointer"
              >
                {t("assistant.send")}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
