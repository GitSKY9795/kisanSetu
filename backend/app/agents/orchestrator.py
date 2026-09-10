"""
Agentic Orchestrator — KisanSetu's AI assistant backed by LangGraph & Gemini API.
"""
from __future__ import annotations

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
"""


def _build_agent():
    if not HAS_LANGCHAIN or not settings.GEMINI_API_KEY:
        return None
    try:
        llm = ChatGoogleGenerativeAI(model="gemini-1.5-flash", api_key=settings.GEMINI_API_KEY)
        return create_react_agent(llm, AGENT_TOOLS)
    except Exception:
        return None


_agent = None


def get_agent():
    global _agent
    if _agent is None:
        _agent = _build_agent()
    return _agent


def run_agent_query(query_en: str, crop_name: str = "wheat", quantity_kg: float = 500.0, district: str = "Central") -> dict:
    """Executes the farmer query using Gemini agent or structured deterministic tool execution."""
    agent = get_agent()

    if agent is not None:
        try:
            result = agent.invoke(
                {"messages": [SystemMessage(content=SYSTEM_PROMPT), HumanMessage(content=query_en)]}
            )
            final_message = result["messages"][-1]
            return {
                "query": query_en,
                "response": final_message.content,
                "engine": "Gemini-1.5-Flash (LangGraph)",
            }
        except Exception:
            pass

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
