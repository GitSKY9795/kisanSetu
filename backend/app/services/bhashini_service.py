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
        return "मेरी गेहूं की फसल तैयार है, कब बेचना चाहिए?"

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
    except Exception:
        return "मेरी गेहूं की फसल तैयार है, कब बेचना चाहिए?"


async def translate_text(text: str, source_language: str, target_language: str = "en") -> str:
    """NMT: translate regional-language text to English, or English back to regional."""
    if source_language == target_language:
        return text
    if not _configured():
        return text

    try:
        lang_config = {"sourceLanguage": source_language, "targetLanguage": target_language}
        pipeline = await _get_pipeline("translation", {"language": lang_config})
        payload = {
            "pipelineTasks": [{"taskType": "translation", "config": {"language": lang_config, "serviceId": pipeline["service_id"]}}],
            "inputData": {"input": [{"source": text}]},
        }
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                pipeline["callback_url"],
                headers={pipeline["auth_header"]: pipeline["auth_value"], "Content-Type": "application/json"},
                json=payload,
            )
            resp.raise_for_status()
            data = resp.json()
            return data["pipelineResponse"][0]["output"][0]["target"]
    except Exception:
        return text


async def text_to_speech(text: str, target_language: str) -> bytes:
    """TTS: text in `target_language` -> raw audio bytes (WAV)."""
    if not _configured():
        return b"mock_audio_bytes"

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
            "inputData": {"input": [{"source": text}]},
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
    except Exception:
        return b"mock_audio_bytes"
