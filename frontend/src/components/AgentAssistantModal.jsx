import { useEffect, useMemo, useRef, useState } from "react";
import { askAgent, speakText, transcribeVoice } from "../api/client.js";
import { useLanguage } from "../context/LanguageContext.jsx";
import { useAssistant } from "../context/AssistantContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useGeolocation } from "../hooks/useGeolocation.js";
import { base64ToObjectUrl, createPcmRecorder } from "../utils/audioEncoding.js";
import { T } from "../i18n/mark.js";
import { ChatIcon, CloseIcon, MicIcon, SendIcon, SparkleIcon, SpeakerIcon, StopIcon } from "./icons.jsx";
import "../styles/assistant.css";

const micSupported =
  typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia
  && !!(window.AudioContext || window.webkitAudioContext);

// Shown in the chosen language (see `t(prompt)` below); the question sent is that same text.
const PROMPTS = [
  T("🌾 Should I sell wheat today or store it in Ujjain?"),
  T("📍 Compare prices across nearby mandis for Onion"),
  T("🏬 Find WDRA cold storages near Indore"),
  T("💰 How much loan can I get for 50 quintals wheat?"),
  T("🔍 What is Grade A moisture specification?"),
  T("📈 What is the 30-day price trend for Potato?"),
  T("🤝 How to pool produce with an FPO for corporate buyers?"),
];

const GREETING = T("Namaste! I am your KisanSetu market advisor. Ask me anything about crop prices, whether to sell or store, finding nearby cold storage, or connecting with buyers.");

export default function AgentAssistantModal({ isOpen, onClose }) {
  const { lang, t, currentLanguage } = useLanguage();
  const { initialMode, seedContext } = useAssistant();
  const { profile } = useAuth();
  const geo = useGeolocation();

  const [mode, setMode] = useState("voice"); // "voice" | "text"
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState([{ sender: "agent", i18n: GREETING }]);
  const [loading, setLoading] = useState(false);

  // Voice state
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const pcmRecorderRef = useRef(null);
  const audioElRef = useRef(null);
  const objectUrlRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode === "text" || !micSupported ? "text" : "voice");
      setMessages([{ sender: "agent", i18n: GREETING }]);
    } else {
      audioElRef.current?.pause();
      setIsRecording(false);
      setIsSpeaking(false);
      setLiveTranscript("");
    }
  }, [isOpen]);

  // Keep the microphone "warm" for the whole time voice mode is showing, instead of
  // requesting it fresh on every mic-button press. getUserMedia is async and can take
  // a real moment (permission/device arbitration) — re-requesting it per recording
  // meant a farmer speaking the instant they tapped the button lost everything before
  // the pipeline finished wiring up, often leaving only the last word captured.
  useEffect(() => {
    if (!isOpen || mode !== "voice" || !micSupported) return;
    let cancelled = false;
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        // If the mic button was already pressed before this resolved, startRecording's
        // own fallback already created (and may already be recording on) a recorder —
        // don't clobber it, or a stop() later would land on the wrong instance and
        // silently drop whatever was just captured.
        if (cancelled || pcmRecorderRef.current) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        pcmRecorderRef.current = createPcmRecorder(stream);
      })
      .catch(() => {
        // Permission denied or no device — startRecording's own getUserMedia call
        // will surface the same error to the farmer when they actually press record.
      });
    return () => {
      cancelled = true;
      pcmRecorderRef.current?.close?.();
      pcmRecorderRef.current = null;
    };
  }, [isOpen, mode, micSupported]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, liveTranscript]);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  const context = useMemo(
    () => ({
      crop_name: seedContext?.crop_name || "wheat",
      quantity_kg: seedContext?.quantity_kg || 500,
      district: seedContext?.district || profile?.district || geo.district || "Central",
      state: seedContext?.state || profile?.state || geo.state || "",
    }),
    [seedContext, profile?.district, profile?.state, geo.district, geo.state]
  );

  // Static messages are kept as keys so they follow the language if it changes while open.
  const messageText = (m) => (m?.i18n ? t(m.i18n) : m?.text);

  if (!isOpen) return null;

  const playAudio = (audioBase64) => {
    if (!audioBase64) return;
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const url = base64ToObjectUrl(audioBase64, "audio/wav");
    objectUrlRef.current = url;
    const audio = new Audio(url);
    audioElRef.current = audio;
    audio.onplay = () => setIsSpeaking(true);
    audio.onended = () => setIsSpeaking(false);
    audio.onerror = () => setIsSpeaking(false);
    audio.play().catch(() => setIsSpeaking(false));
  };

  const stopSpeaking = () => {
    audioElRef.current?.pause();
    setIsSpeaking(false);
  };

  /** Speaks already-generated text via real BHASHINI TTS (used for quick-prompt chips,
   * whose reply came from the text endpoint rather than the voice round-trip). */
  const speakViaBhashini = async (text) => {
    try {
      const { audio_base64 } = await speakText({ text, language: lang });
      playAudio(audio_base64);
    } catch (error) {
      console.error("[KisanSetu] BHASHINI speech playback failed:", error);
      setMessages((prev) => [
        ...prev,
        { sender: "agent", i18n: T("The answer is ready, but voice playback is unavailable right now.") },
      ]);
    }
  };

  const sendQuery = async (text, { speakReply = true } = {}) => {
    if (!text.trim()) return;
    setMessages((prev) => [...prev, { sender: "user", text }]);
    setLoading(true);
    try {
      const res = await askAgent({ text, language: lang, ...context });
      const replyText = res.answer || res.response || t("KisanSetu recommendation generated.");
      setMessages((prev) => [...prev, { sender: "agent", text: replyText }]);
      if (speakReply) speakViaBhashini(replyText);
    } catch (err) {
      const fallback = err.response?.data?.detail || t("Could not reach the KisanSetu backend. Ensure FastAPI is running on http://localhost:8000.");
      setMessages((prev) => [...prev, { sender: "agent", text: fallback }]);
      if (speakReply) speakViaBhashini(fallback);
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

  const startRecording = async () => {
    if (!micSupported) return;
    stopSpeaking();
    setLiveTranscript("");
    try {
      if (!pcmRecorderRef.current) {
        // The warm mic from the voice-mode effect isn't ready yet (e.g. the button
        // was pressed the instant voice mode opened) — fall back to acquiring it now.
        // This still has the original startup latency, but only in that edge case.
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        pcmRecorderRef.current = createPcmRecorder(stream);
      }
      pcmRecorderRef.current.startCapture();
      setIsRecording(true);
    } catch {
      setMessages((prev) => [...prev, { sender: "agent", i18n: T("Microphone access was denied. Allow microphone permission to use voice mode.") }]);
    }
  };

  const sendVoiceQuery = async (audio_base64) => {
    setLoading(true);
    setLiveTranscript(t("Interpreting your voice..."));
    try {
      // Keep transcription separate from the slower answer/TTS pipeline so the
      // farmer sees what was understood as soon as BHASHINI finishes ASR.
      const { transcript } = await transcribeVoice({ audio_base64, language: lang, ...context });
      const interpretedText = transcript?.trim();
      if (!interpretedText) throw new Error(t("No speech was detected. Please try again."));

      setLiveTranscript("");
      setMessages((prev) => [...prev, { sender: "user", text: interpretedText }]);

      const res = await askAgent({ text: interpretedText, language: lang, ...context });
      const replyText = res.answer || res.response || t("KisanSetu recommendation generated.");
      setMessages((prev) => [...prev, { sender: "agent", text: replyText }]);

      // Do not hold the visible answer behind Bhashini TTS generation.
      void speakViaBhashini(replyText);
    } catch (err) {
      setLiveTranscript("");
      const fallback = err.response?.data?.detail
        || (err.request && !err.response
          ? t("Cannot reach {url}. Check that FastAPI is running and reload this page.", { url: import.meta.env.VITE_API_BASE_URL || "http://localhost:8000" })
          : t("Voice request failed: {reason}", { reason: err.message || t("Could not reach the KisanSetu backend. Ensure FastAPI is running on http://localhost:8000.") }));
      setMessages((prev) => [...prev, { sender: "agent", text: fallback }]);
    } finally {
      setLoading(false);
    }
  };

  const handleMicPress = () => {
    if (isRecording) {
      setIsRecording(false);
      try {
        const audioBase64 = pcmRecorderRef.current.stopCapture();
        sendVoiceQuery(audioBase64);
      } catch (err) {
        setMessages((prev) => [...prev, { sender: "agent", text: t("Microphone error: {reason}", { reason: err.message }) }]);
        setLoading(false);
      }
      return;
    }
    startRecording();
  };

  const plain = (label) => label.replace(/^[^\p{L}\p{N}]+/u, "");
  const lastReply = messageText(messages[messages.length - 1]);
  const orbState = isRecording ? "listening" : loading ? "thinking" : isSpeaking ? "speaking" : "idle";
  const statusText = isRecording
    ? t("Listening to your voice…")
    : loading
      ? t("Analyzing Agricultural Datasets…")
      : isSpeaking
        ? t("Speaking response…")
        : t("Tap microphone to speak");

  return (
    <div className="va-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="va-panel" role="dialog" aria-modal="true" aria-label={t("KisanSetu Voice & Text Assistant")}>
        <header className="va-header">
          <span className={`va-avatar ${orbState}`} aria-hidden="true"><MicIcon size={18} /></span>
          <div className="va-title">
            <h3>{t("KisanSetu Voice & Text Assistant")}</h3>
            <p><span className="va-live-dot" />{currentLanguage.flagLabel} · {t("Voice Advisor")}</p>
          </div>
          <button type="button" className="va-close" onClick={onClose} aria-label={t("Close")}><CloseIcon size={18} /></button>
        </header>

        <div className="va-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={mode === "voice"} className={mode === "voice" ? "active" : ""} onClick={() => setMode("voice")}>
            <MicIcon size={15} /> {plain(t("🎙️ Voice Assistant"))}
          </button>
          <button type="button" role="tab" aria-selected={mode === "text"} className={mode === "text" ? "active" : ""} onClick={() => setMode("text")}>
            <ChatIcon size={15} /> {plain(t("💬 Text Chat"))}
          </button>
        </div>

        {mode === "voice" && (
          <div className="va-voice">
            <section className="va-answer">
              <span className="va-answer-label"><SparkleIcon size={13} /> {plain(t("Advisory Response:"))}</span>
              <p>{lastReply}</p>
            </section>

            {!micSupported && <div className="va-note">{t("Microphone recording isn't supported in this browser — use the Text tab instead.")}</div>}
            {liveTranscript && <div className="va-note"><MicIcon size={14} /> {liveTranscript}</div>}

            <div className="va-stage">
              <button
                type="button"
                onClick={handleMicPress}
                disabled={!micSupported || loading}
                className={`va-orb ${orbState}`}
                aria-label={statusText}
              >
                <span className="va-ring r1" /><span className="va-ring r2" /><span className="va-ring r3" />
                <span className="va-orb-core">{isRecording ? <StopIcon size={30} /> : <MicIcon size={32} />}</span>
              </button>
              <div className={`va-bars ${orbState}`} aria-hidden="true">
                {Array.from({ length: 13 }, (_, i) => <i key={i} style={{ animationDelay: `${(i % 7) * 0.09}s` }} />)}
              </div>
              <div className="va-status">{statusText}</div>
              {isSpeaking && (
                <button type="button" className="va-stop" onClick={stopSpeaking}><SpeakerIcon size={14} /> {t("Stop Speaking")}</button>
              )}
            </div>

            <div className="va-suggest">
              <span>{plain(t("Suggested Inquiries:"))}</span>
              <div className="va-chips">
                {PROMPTS.slice(0, 4).map((prompt, idx) => (
                  <button type="button" key={idx} onClick={() => sendQuery(t(prompt), { speakReply: true })}>{t(prompt)}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {mode === "text" && (
          <div className="va-chat">
            <div className="va-messages">
              {messages.map((m, idx) => (
                <div key={idx} className={`va-msg ${m.sender === "user" ? "user" : "agent"}`}>
                  {m.sender !== "user" && <span className="va-msg-avatar" aria-hidden="true"><SparkleIcon size={13} /></span>}
                  <div className="va-bubble">{messageText(m)}</div>
                </div>
              ))}
              {loading && (
                <div className="va-msg agent">
                  <span className="va-msg-avatar" aria-hidden="true"><SparkleIcon size={13} /></span>
                  <div className="va-bubble va-typing"><i /><i /><i /><em>{t("Analyzing Agricultural Datasets…")}</em></div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="va-chips scroll">
              {PROMPTS.map((prompt, idx) => (
                <button type="button" key={idx} onClick={() => sendQuery(t(prompt), { speakReply: false })}>{t(prompt)}</button>
              ))}
            </div>

            <form onSubmit={handleTextSend} className="va-compose">
              <input
                type="text"
                placeholder={t("Ask about sell timing, prices, cold storage, or buyers…")}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <button type="submit" disabled={loading || !query.trim()} aria-label={t("Send")}><SendIcon size={18} /></button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
