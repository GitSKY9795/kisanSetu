"""
KisanSetu Assistant API Routes — BHASHINI + LangGraph Agent.
"""
import base64

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.agents.orchestrator import run_agent_query
from app.services.bhashini_service import speech_to_text, text_to_speech, translate_text

router = APIRouter(prefix="/agent", tags=["agent"])


class TextQueryRequest(BaseModel):
    text: str
    language: str = "en"  # hi, en, mr, ta, te
    crop_name: str = "wheat"
    quantity_kg: float = 500.0
    district: str = "Central"
    state: str = ""


class VoiceQueryRequest(BaseModel):
    audio_base64: str  # WAV, 16kHz mono PCM
    language: str = "hi"
    crop_name: str = "wheat"
    quantity_kg: float = 500.0
    district: str = "Central"
    state: str = ""


class SpeakRequest(BaseModel):
    text: str
    language: str = "hi"


@router.post("/query")
async def agent_text_query(payload: TextQueryRequest):
    """Text-in / text-out agent query with BHASHINI multi-lingual support."""
    query_en = payload.text
    if payload.language != "en":
        query_en = await translate_text(payload.text, payload.language, "en")

    agent_result = await run_agent_query(
        query_en,
        crop_name=payload.crop_name,
        quantity_kg=payload.quantity_kg,
        district=payload.district,
        state=payload.state,
        original_query=payload.text,
    )

    answer_en = agent_result.get("response", "")
    answer_local = answer_en
    if payload.language != "en":
        answer_local = await translate_text(answer_en, "en", payload.language)

    return {
        "query": payload.text,
        "query_en": query_en,
        "answer": answer_local,
        "answer_language": payload.language,
        "engine": agent_result.get("engine", "KisanSetu Engine"),
        "decision": agent_result.get("decision", None),
    }


@router.post("/voice-query")
async def agent_voice_query(payload: VoiceQueryRequest):
    """Full voice pipeline: audio -> BHASHINI STT -> Translate -> Agent -> Translate -> BHASHINI TTS."""
    try:
        transcript_local = await speech_to_text(payload.audio_base64, payload.language)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    query_en = transcript_local
    if payload.language != "en":
        query_en = await translate_text(transcript_local, payload.language, "en")

    agent_result = await run_agent_query(
        query_en,
        crop_name=payload.crop_name,
        quantity_kg=payload.quantity_kg,
        district=payload.district,
        state=payload.state,
        original_query=transcript_local,
    )
    answer_en = agent_result.get("response", "")

    answer_local = answer_en
    if payload.language != "en":
        answer_local = await translate_text(answer_en, "en", payload.language)
    try:
        audio_bytes = await text_to_speech(answer_local, payload.language)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    return {
        "transcript": transcript_local,
        "answer_text": answer_local,
        "answer_audio_base64": base64.b64encode(audio_bytes).decode("ascii"),
        "language": payload.language,
        "engine": agent_result.get("engine", "KisanSetu Engine"),
    }


@router.post("/transcribe")
async def agent_transcribe(payload: VoiceQueryRequest):
    """Fast first stage of the voice flow: audio -> local-language transcript."""
    try:
        transcript = await speech_to_text(payload.audio_base64, payload.language)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return {"transcript": transcript, "language": payload.language}


@router.post("/speak")
async def agent_speak(payload: SpeakRequest):
    """Standalone BHASHINI TTS — used to read an already-generated text reply aloud
    (e.g. a quick-prompt-chip answer that came back from the text endpoint)."""
    try:
        audio_bytes = await text_to_speech(payload.text, payload.language)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return {"audio_base64": base64.b64encode(audio_bytes).decode("ascii")}
