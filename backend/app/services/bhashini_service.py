"""
BHASHINI integration — Govt of India's National Language Translation Mission API wrapper.

BHASHINI's real API is a two-step handshake, not a single call:
  1. POST userID/ulcaApiKey + the task you want to `getModelsPipeline` — this resolves
     which model serves that task/language pair and returns a callback URL plus a
     short-lived inference auth token.
  2. POST the actual input to that callback URL with that token.
Step 1's result only depends on (taskType, languages), so it's cached in memory per
process — repeating step 1 on every request would double every call's latency for no
reason (the mapping doesn't change between requests).
"""
from __future__ import annotations

import base64
import re
import struct

import httpx

from app.core.config import settings

AUTH_URL = "https://meity-auth.ulcacontrib.org/ulca/apis/v0/model/getModelsPipeline"
DEFAULT_PIPELINE_ID = "64392f96daac500b55c543cd"  # public combined ASR+NMT+TTS pipeline

_pipeline_cache: dict[tuple, dict] = {}


def _wav_sample_rate(audio_base64: str, default: int = 16000) -> int:
    """Reads the real sample rate out of a base64 WAV's header. Declaring the wrong
    rate to BHASHINI's ASR (e.g. always claiming 16000 regardless of the actual audio)
    makes it try to interpret the samples at the wrong speed, which can come back
    badly wrong or take far longer than a matching declaration would."""
    try:
        header = base64.b64decode(audio_base64[:64])  # sample rate lives at byte 24-27
        return struct.unpack("<I", header[24:28])[0]
    except Exception:
        return default


def _configured() -> bool:
    return bool(settings.BHASHINI_USER_ID and settings.BHASHINI_ULCA_API_KEY)


async def _get_pipeline(task_type: str, config: dict) -> dict | None:
    cache_key = (task_type, tuple(sorted(config.get("language", {}).items())))
    if cache_key in _pipeline_cache:
        return _pipeline_cache[cache_key]

    headers = {
        "userID": settings.BHASHINI_USER_ID,
        "ulcaApiKey": settings.BHASHINI_ULCA_API_KEY,
        "Content-Type": "application/json",
    }
    payload = {
        "pipelineTasks": [{"taskType": task_type, "config": config}],
        "pipelineRequestConfig": {"pipelineId": DEFAULT_PIPELINE_ID},
    }
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(AUTH_URL, headers=headers, json=payload)
        resp.raise_for_status()
        data = resp.json()

    endpoint = data["pipelineInferenceAPIEndPoint"]
    resolved = {
        "callback_url": endpoint["callbackUrl"],
        "auth_header": endpoint["inferenceApiKey"]["name"],
        "auth_value": endpoint["inferenceApiKey"]["value"],
        "service_id": data["pipelineResponseConfig"][0]["config"][0]["serviceId"],
    }
    _pipeline_cache[cache_key] = resolved
    return resolved


async def speech_to_text(audio_base64: str, source_language: str) -> str:
    """ASR: base64-encoded audio -> transcribed text in `source_language`."""
    if not _configured():
        raise RuntimeError("BHASHINI credentials are not configured")

    try:
        pipeline = await _get_pipeline("asr", {"language": {"sourceLanguage": source_language}})
        payload = {
            "pipelineTasks": [
                {
                    "taskType": "asr",
                    "config": {
                        "language": {"sourceLanguage": source_language},
                        "serviceId": pipeline["service_id"],
                        "audioFormat": "wav",
                        "samplingRate": _wav_sample_rate(audio_base64),
                    },
                }
            ],
            "inputData": {"audio": [{"audioContent": audio_base64}]},
        }
        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.post(
                pipeline["callback_url"],
                headers={pipeline["auth_header"]: pipeline["auth_value"], "Content-Type": "application/json"},
                json=payload,
            )
            resp.raise_for_status()
            data = resp.json()
            return data["pipelineResponse"][0]["output"][0]["source"]
    except Exception as exc:
        raise RuntimeError("BHASHINI speech recognition failed") from exc


# Acronyms real AGMARKNET mandi names commonly carry (e.g. "Ahmedgarh APMC"), which
# have no real translation — confirmed live: the NMT model falls back to spelling
# "APMC" out letter-by-letter in Devanagari ("ए. पी. एम. सी."), which a TTS voice
# then reads as disconnected single letters instead of a word. Expanded before
# translation so the translator (and the voice reading the result) never sees them.
_ACRONYM_EXPANSIONS = {
    "AGMARKNET": "government",
    "e-NWR pledge loan": "loan against stored produce",
    "e-NWR": "electronic warehouse receipt",
    "pledge loans": "loans against stored produce",
    "pledge loan": "loan against stored produce",
    "APMC": "Market",
    "FPO": "Farmer Producer Organisation",
    "WDRA": "Warehousing Development Authority",
}


def _expand_acronyms(text: str) -> str:
    for acronym, expansion in _ACRONYM_EXPANSIONS.items():
        text = re.sub(rf"\b{acronym}\b", expansion, text)
    return text


# Numbers, money and dates. Confirmed live: in a multi-sentence answer the NMT model moves and
# rewrites figures ("3,850 rupees per quintal, 38.50 per kg" came back as "1 rupee per quintal,
# 2 per kg"), so every figure is swapped for a placeholder number before translating and put back after.
_FIGURE_RE = re.compile(r"\d{1,2}/\d{1,2}/\d{2,4}|₹\s?\d[\d,]*(?:\.\d+)?|\d[\d,]*(?:\.\d+)?\s?%|\d[\d,]*(?:\.\d+)?")
_SENTENCE_RE = re.compile(r"(?<=[.!?।])\s+|\n+")
_NATIVE_DIGITS = {chr(base + i): str(i) for base in (0x0966, 0x09E6, 0x0A66, 0x0AE6, 0x0B66, 0x0BE6, 0x0C66, 0x0CE6, 0x0D66) for i in range(10)}


def _protect_figures(sentence: str) -> tuple[str, dict[str, str]]:
    figures: dict[str, str] = {}

    def swap(match: re.Match) -> str:
        token = str(90001 + len(figures))
        figures[token] = match.group(0)
        return token

    return _FIGURE_RE.sub(swap, sentence), figures


def _restore_figures(translated: str, figures: dict[str, str]) -> str | None:
    """Puts the original figures back; None if the translator lost one (caller keeps English)."""
    out = "".join(_NATIVE_DIGITS.get(c, c) for c in translated)
    out = re.sub(r"(?<!\d)9\s*,\s*(0\d{3})(?!\d)", r"9\1", out)  # Indian grouping: "9,0001"
    for token, original in figures.items():
        if token not in out:
            return None
        out = out.replace(token, original)
    return out


async def translate_text(text: str, source_language: str, target_language: str = "en") -> str:
    """NMT: translate regional-language text to English, or English back to regional."""
    if source_language == target_language:
        return text
    if not _configured():
        return text

    if source_language == "en":
        text = _expand_acronyms(text)

    # Translate sentence by sentence (one request) — long inputs drift — with figures protected.
    sentences = [s for s in _SENTENCE_RE.split(text.strip()) if s.strip()] or [text]
    protected = [_protect_figures(s) for s in sentences]

    try:
        lang_config = {"sourceLanguage": source_language, "targetLanguage": target_language}
        pipeline = await _get_pipeline("translation", {"language": lang_config})
        payload = {
            "pipelineTasks": [{"taskType": "translation", "config": {"language": lang_config, "serviceId": pipeline["service_id"]}}],
            "inputData": {"input": [{"source": p} for p, _ in protected]},
        }
        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.post(
                pipeline["callback_url"],
                headers={pipeline["auth_header"]: pipeline["auth_value"], "Content-Type": "application/json"},
                json=payload,
            )
            resp.raise_for_status()
            outputs = resp.json()["pipelineResponse"][0]["output"]
        pieces = []
        for (original, (_, figures)), item in zip(zip(sentences, protected), outputs):
            restored = _restore_figures(item["target"], figures)
            # If a figure went missing, showing that sentence untranslated beats showing a wrong number.
            pieces.append(restored if restored is not None else original)
        return " ".join(pieces)
    except Exception:
        return text


def _sanitize_for_speech(text: str) -> str:
    """Strips symbols the TTS voice reads badly or skips outright, without touching
    the text shown on screen (callers keep the original for display and pass this
    cleaned copy only to synthesis). Confirmed live: "₹" survives translation
    untouched and sits in the middle of an otherwise-Hindi sentence, and a literal
    bullet character ("•", used to list reasons) has no natural spoken form either."""
    return (
        text.replace("₹", "Rs. ")
        .replace("•", "")
        .replace("  ", " ")
        .strip()
    )


async def text_to_speech(text: str, target_language: str) -> bytes:
    """TTS: text in `target_language` -> raw audio bytes (WAV)."""
    if not _configured():
        raise RuntimeError("BHASHINI credentials are not configured")

    try:
        pipeline = await _get_pipeline("tts", {"language": {"sourceLanguage": target_language}})
        payload = {
            "pipelineTasks": [
                {
                    "taskType": "tts",
                    "config": {
                        "language": {"sourceLanguage": target_language},
                        "serviceId": pipeline["service_id"],
                        "gender": "female",
                    },
                }
            ],
            "inputData": {"input": [{"source": _sanitize_for_speech(text)}]},
        }
        async with httpx.AsyncClient(timeout=25) as client:
            resp = await client.post(
                pipeline["callback_url"],
                headers={pipeline["auth_header"]: pipeline["auth_value"], "Content-Type": "application/json"},
                json=payload,
            )
            resp.raise_for_status()
            data = resp.json()
            audio_b64 = data["pipelineResponse"][0]["audio"][0]["audioContent"]
            return base64.b64decode(audio_b64)
    except Exception as exc:
        raise RuntimeError("BHASHINI speech synthesis failed") from exc
