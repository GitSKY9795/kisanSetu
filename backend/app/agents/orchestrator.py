"""
Agentic Orchestrator — KisanSetu's AI assistant backed by LangGraph & Gemini API.
"""
from __future__ import annotations

import re

from app.core.config import settings
from app.services.decision_engine import recommend_action

try:
    from langchain_core.messages import HumanMessage, SystemMessage
    from langchain_google_genai import ChatGoogleGenerativeAI
    from langgraph.prebuilt import create_react_agent
    from app.agents.tools import AGENT_TOOLS
    HAS_LANGCHAIN = True
except ImportError:
    HAS_LANGCHAIN = False

SYSTEM_PROMPT = """You are the KisanSetu AI assistant, a senior agricultural market advisor for Indian farmers.
When a farmer asks whether to sell, wait, store, or aggregate produce:
1. Use your tools to check market price, price forecast, demand level, and weather conditions.
2. Give a clear, direct recommendation at the very beginning (SELL NOW, WAIT, STORE, or AGGREGATE).
3. State the expected NET REALIZATION per kg.
4. Explain the key reasons simply in 2-3 short sentences.
5. Offer helpful follow-up steps (e.g. buyer matching, FPO pooling).

Reply in PLAIN TEXT only — this answer is shown in a simple text box and read aloud by
a voice assistant, so never use Markdown. That means: no "**bold**", no "# headings",
no "`code`", no bullet characters like "*" or "-" at the start of a line — write plain
sentences and short paragraphs, and use a real line break between them instead.
"""


_MARKDOWN_PATTERNS = [
    (re.compile(r"^#{1,6}\s*", re.MULTILINE), ""),  # headings
    (re.compile(r"\*\*(.+?)\*\*"), r"\1"),  # **bold**
    (re.compile(r"(?<!\*)\*(?!\*)(.+?)\*(?!\*)"), r"\1"),  # *italic*
    (re.compile(r"__(.+?)__"), r"\1"),  # __bold__
    (re.compile(r"`([^`]+)`"), r"\1"),  # `code`
    (re.compile(r"^[ \t]*[*\-+][ \t]+", re.MULTILINE), "• "),  # bullet markers -> a plain bullet
]


def strip_markdown(text: str) -> str:
    """Defense-in-depth cleanup: LLMs don't always follow "no markdown" instructions
    perfectly, and this text is both displayed as plain text and fed to BHASHINI TTS —
    a stray "**" or "#" reads badly on screen and gets spoken aloud verbatim."""
    if not text:
        return text
    cleaned = text
    for pattern, replacement in _MARKDOWN_PATTERNS:
        cleaned = pattern.sub(replacement, cleaned)
    return cleaned.strip()


def _build_agent():
    if not HAS_LANGCHAIN or not settings.GEMINI_API_KEY:
        return None
    try:
        # gemini-1.5-flash was retired by Google; gemini-3.6-flash confirmed working
        # against the live API as of 2026-09.
        # max_retries=1: the free tier's daily quota (20 requests/day for this model,
        # confirmed via a live 429 RESOURCE_EXHAUSTED response) means a rate-limited
        # call can't succeed no matter how long it waits — the default retry policy
        # honors Google's suggested backoff (seen up to 44s) before giving up, which
        # made a quota-exhausted call look like a hang. Fail fast to the rule-based
        # fallback instead of making the farmer wait through that.
        llm = ChatGoogleGenerativeAI(model="gemini-3.6-flash", api_key=settings.GEMINI_API_KEY, max_retries=1)
        return create_react_agent(llm, AGENT_TOOLS)
    except Exception:
        return None


_agent = None


def get_agent():
    global _agent
    if _agent is None:
        _agent = _build_agent()
    return _agent


def _extract_text(content) -> str:
    """Newer langchain-google-genai versions return message content as a list of
    typed blocks (e.g. [{"type": "text", "text": "...", "extras": {...}}]) instead of
    a plain string — pull just the text back out either way."""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        return "".join(
            block.get("text", "") for block in content if isinstance(block, dict) and block.get("type") == "text"
        )
    return str(content)


async def run_agent_query(query_en: str, crop_name: str = "wheat", quantity_kg: float = 500.0, district: str = "Central") -> dict:
    """Executes the farmer query using Gemini agent or structured deterministic tool execution.

    Must stay async and use the agent's `ainvoke` — the underlying google-generativeai
    gRPC client is bound to the event loop it was created on. Calling the sync
    `agent.invoke()` from a worker thread (e.g. via FastAPI's run_in_threadpool, the
    usual fix for blocking calls in an async route) deadlocks indefinitely instead of
    erroring, which is worse than just blocking the loop — confirmed by testing both
    directly. `ainvoke` runs correctly on the loop the route handler is already on."""
    agent = get_agent()

    if agent is not None:
        try:
            result = await agent.ainvoke(
                {"messages": [SystemMessage(content=SYSTEM_PROMPT), HumanMessage(content=query_en)]}
            )
            final_message = result["messages"][-1]
            return {
                "query": query_en,
                "response": strip_markdown(_extract_text(final_message.content)),
                "engine": "Gemini (LangGraph)",
            }
        except Exception as exc:
            print(f"[KisanSetu] Gemini agent call failed, falling back to rule-based engine: {exc!r}")

    # Deterministic Agent Execution Trace (when API key is not present or offline)
    decision = recommend_action(
        crop_name=crop_name,
        current_price_per_kg=24.50,
        quantity_kg=quantity_kg,
        storage_capacity_kg=600.0,
        district=district,
    )

    response_text = (
        f"RECOMMENDATION: {decision['action']}\n\n"
        f"Expected Net Realization: ₹{decision['net_realization_per_kg']}/kg (Total: ₹{round(decision['net_realization_per_kg'] * quantity_kg, 2)}).\n\n"
        f"Reasons:\n"
        + "\n".join([f"• {r}" for r in decision["reasons"]])
        + f"\n\nMarket Demand is {decision['demand_level']} and Weather is {decision['weather_condition']}."
    )

    return {
        "query": query_en,
        "response": response_text,
        "decision": decision,
        "engine": "KisanSetu Multi-Tool Engine",
    }
