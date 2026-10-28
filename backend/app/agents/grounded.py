"""
Grounded single-call answering for the KisanSetu assistant.

Why this exists instead of the LangGraph tool-calling agent:
  * Quota — the tool-calling agent makes one Gemini request per reasoning step (often 3-4 per
    question), and the free tier allows only ~20 requests per model per day. Here the app
    gathers the facts itself and makes exactly ONE model request per question.
  * Wrong answers — several of the agent's tools returned made-up data (fixed buyer names, a
    transaction that was always "COMPLETED", a storage check that assumed +10% prices). Here
    every number comes from the app's real data, and the model is told to use only those facts.
  * Repeats — the same question within 15 minutes is answered from a cache (no request at all).
"""
from __future__ import annotations

import asyncio
import re
import time

import httpx

from app.core.config import settings

# Tried in order; a model that hits its quota or errors is skipped for a while. Gemma models
# have a much larger free quota than Gemini, so they are the last line before the offline engine.
MODEL_CHAIN = [
    "gemini-3.5-flash",
    "gemini-flash-latest",
    "gemini-3-flash-preview",
    "gemini-flash-lite-latest",
    "gemini-3.5-flash-lite",
    "gemini-3.1-flash-lite",
    "gemma-4-31b-it",
    "gemma-4-26b-a4b-it",
]
_cooldown_until: dict[str, float] = {}
_cache: dict[tuple, tuple[float, str, str]] = {}
CACHE_SECONDS = 15 * 60

INSTRUCTIONS = """You are KisanSetu's farming and market advisor for Indian farmers.

Rules:
1. Answer ONLY the farmer's question. Do not add advice on other topics.
2. For prices, forecasts, weather, loans, storages, buyers or FPO pools, use ONLY the numbers and
   names in FACTS. Never invent a price, buyer, warehouse, fee, phone number or date. If a number
   is not written in FACTS, do not state it at all.
3. If FACTS do not contain what is needed, say plainly that the data is not available right now,
   then give whatever general guidance is still useful.
4. Questions about growing crops (fertilizer, pests, disease, irrigation, seeds, sowing) may be
   answered from general agronomy knowledge for Indian conditions; keep doses practical and
   suggest confirming with the local Krishi Vigyan Kendra for exact amounts.
5. If the farmer asks whether to sell, store, wait or pool, start with one clear recommendation
   (SELL NOW, WAIT, STORE or AGGREGATE) taken from FACTS, then give the reasons.
6. Do not assume how much of a crop the farmer has, or work out totals, unless the question gives
   a quantity or asks about their own produce of their usual crop.
7. Reply in simple English in plain text: no Markdown, no bullet symbols, no headings.
   At most 120 words. It will be translated and read aloud.
"""


def _retry_seconds(status: int, body: str) -> float:
    if status == 429:
        match = re.search(r'"retryDelay":\s*"(\d+)s"', body)
        return min(max(float(match.group(1)) if match else 60.0, 30.0), 6 * 3600)
    if status == 404:
        return 24 * 3600
    return 45.0  # 5xx "high demand" / internal errors usually clear quickly


async def _generate(prompt: str) -> tuple[str, str] | None:
    """One request to the first model that answers. Returns (text, model) or None."""
    if not settings.GEMINI_API_KEY:
        return None
    base_config = {"temperature": 0.3, "maxOutputTokens": 2048}
    async with httpx.AsyncClient(timeout=45) as client:
        for model in MODEL_CHAIN:
            if _cooldown_until.get(model, 0) > time.time():
                continue
            config = dict(base_config)
            if model.startswith("gemini"):
                # "Thinking" spends the same output budget and cut answers off mid-sentence;
                # these are short factual replies, so turn it off.
                config["thinkingConfig"] = {"thinkingBudget": 0}
            payload = {"contents": [{"role": "user", "parts": [{"text": prompt}]}], "generationConfig": config}
            try:
                resp = await client.post(
                    f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
                    params={"key": settings.GEMINI_API_KEY},
                    json=payload,
                )
                if resp.status_code == 400 and "thinking" in resp.text.lower():
                    payload["generationConfig"].pop("thinkingConfig", None)
                    resp = await client.post(
                        f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
                        params={"key": settings.GEMINI_API_KEY},
                        json=payload,
                    )
            except httpx.HTTPError as exc:
                _cooldown_until[model] = time.time() + 30
                print(f"[KisanSetu] {model} request failed ({type(exc).__name__}); trying the next model")
                continue
            if resp.status_code != 200:
                wait = _retry_seconds(resp.status_code, resp.text)
                _cooldown_until[model] = time.time() + wait
                print(f"[KisanSetu] {model} returned {resp.status_code}; skipping it for {wait:.0f}s")
                continue
            candidate = (resp.json().get("candidates") or [{}])[0]
            if candidate.get("finishReason") == "MAX_TOKENS":
                print(f"[KisanSetu] {model} answer was cut off; trying the next model")
                continue
            parts = candidate.get("content", {}).get("parts", [])
            # Gemma/"thinking" models may return a reasoning part first; keep the visible answer.
            text = "".join(p.get("text", "") for p in parts if not p.get("thought")).strip()
            if text:
                return text, model
    return None


# ---------------------------------------------------------------- facts
async def _gather_facts(query_en: str, original: str, crop: str, quantity_kg: float, district: str, state: str) -> list[str]:
    from app.agents import orchestrator as o
    from app.services.data_ingestion.agmarknet_client import fetch_mandi_prices
    from app.services.decision_engine import recommend_action
    from app.services.price_forecast_service import forecast_price
    from app.services.weather_service import get_weather_forecast

    profile_crop, profile_qty, profile_state = crop, quantity_kg, state
    text = " ".join(x.lower() for x in (query_en, original or "") if x)
    mentioned, _ = o._detect_mentioned_crop(text)
    if mentioned:
        crop = mentioned
    place = o._detect_place(query_en) or district
    if place.lower() != (district or "").lower():
        state = ""  # the profile's state doesn't apply to a different place named in the question
    qty_q = o._detect_quantity_quintals(text)
    if qty_q:
        quantity_kg = qty_q * 100
    has = lambda intent: o._contains_intent(text, intent)  # noqa: E731

    facts = [
        f"Farmer's profile: usual crop {profile_crop} ({profile_qty:g} kg of it), district {district or 'not set'}, state {profile_state or 'not set'}.",
        f"Crop the question is about: {crop}. Place the question is about: {place}.",
    ]

    market_topic = any(has(i) for i in ("price", "forecast", "decision", "loan", "buyer", "fpo", "storage"))
    price_q = None
    if market_topic:
        records = await fetch_mandi_prices(crop, state=state or None, district=place, limit=1)
        if records:
            r = records[0]
            price_q = float(r["modal_price"])
            source = "live AGMARKNET mandi feed" if r.get("is_live", True) else "recent mandi history (no live arrival today)"
            facts.append(
                f"Mandi price of {crop}: ₹{price_q:,.0f} per quintal (₹{price_q / 100:.2f} per kg) at {r.get('market', 'a nearby mandi')}, "
                f"recorded {r.get('arrival_date', 'today')}, from the {source}."
            )
        else:
            facts.append(f"No mandi price is available for {crop} right now.")

    if price_q and any(has(i) for i in ("forecast", "decision", "storage")):
        f7 = forecast_price(crop, price_q, horizon_days=7)
        f30 = forecast_price(crop, price_q, horizon_days=30)
        if f7 == price_q and f30 == price_q:
            facts.append(f"No price-trend history is available for {crop}, so no forecast can be given.")
        else:
            facts.append(f"Price forecast for {crop} (from its recent price trend): ₹{f7:,.0f} per quintal in 7 days, ₹{f30:,.0f} in 30 days.")

    if has("weather") or has("decision"):
        w = await asyncio.to_thread(get_weather_forecast, None, None, place)
        if w.get("source") == "Open-Meteo API":
            facts.append(
                f"Weather for {place}: {w['weather_condition']}, max {w['temperature_max_c']}°C, min {w.get('temperature_min_c', '?')}°C today, "
                f"rain chance today {w['rain_probability_pct']}%, highest rain chance in the next 7 days {w.get('rain_probability_next_7_days_max_pct', '?')}%, "
                f"harvest risk {w['harvest_risk']}."
            )
        else:
            facts.append(f"Live weather for {place} is not available right now.")

    if price_q and has("decision"):
        d = await asyncio.to_thread(
            recommend_action, crop_name=crop, current_price_per_kg=price_q / 100,
            quantity_kg=quantity_kg, storage_capacity_kg=600.0, district=place,
        )
        facts.append(
            f"KisanSetu decision engine: {d['action'].replace('_', ' ')}; expected net in hand ₹{d['net_realization_per_kg']} per kg; "
            f"demand {d['demand_level']}; reasons: " + " ".join(d["reasons"])
        )
        if d.get("demand_forecast", {}).get("engine", "").startswith("XGBoost"):
            facts.append("Demand model (trained on AGMARKNET mandi prices): " + d["demand_forecast"]["summary"])

    if has("warehouse") or has("storage"):
        from app.api.routes_logistics import WAREHOUSES_DIRECTORY

        rows = sorted(WAREHOUSES_DIRECTORY, key=lambda w: (w["district"].lower() != place.lower(), w["distance_km"]))[:3]
        for w in rows:
            facts.append(
                f"Verified storage: {w['name']}, {w['district']} — {w['type']}, {w['available_capacity_mt']} tonnes free, "
                f"₹{w['daily_rate_per_quintal_inr']} per quintal per day, {w['temperature_celsius']}, suits {', '.join(w['suitable_crops'])}, phone {w['contact_phone']}."
            )

    if has("loan"):
        qty = qty_q or quantity_kg / 100
        if price_q:
            value = qty * price_q
            loan = value * 0.70
            facts.append(
                f"e-NWR pledge loan for {qty:g} quintals of {crop}: produce value ₹{value:,.0f}, loan up to ₹{loan:,.0f} (70% of value), "
                f"about 7% interest a year = ₹{loan * 0.07 / 12:,.0f} per month. Requires depositing the produce in a WDRA-registered warehouse."
            )
        else:
            facts.append("e-NWR pledge loans give up to 70% of the stored produce value at about 7% yearly interest, but today's price is needed to calculate the amount.")

    if has("buyer") or has("fpo"):
        facts.extend(await asyncio.to_thread(_marketplace_facts, crop, place, has("buyer"), has("fpo")))

    return facts


def _marketplace_facts(crop: str, place: str, buyers: bool, pools: bool) -> list[str]:
    """Real buyer requirements and FPO pools from the KisanSetu database."""
    from app.core.database import SessionLocal
    from app.models.fpo import FPO, FPOPool
    from app.models.marketplace import BuyerRequirement

    out = []
    db = SessionLocal()
    try:
        if buyers:
            reqs = (
                db.query(BuyerRequirement)
                .filter(BuyerRequirement.status == "ACTIVE", BuyerRequirement.crop_name.ilike(crop))
                .order_by(BuyerRequirement.target_price_per_kg.desc())
                .limit(3)
                .all()
            )
            for r in reqs:
                name = (r.buyer.organization or r.buyer.name) if r.buyer else "A buyer"
                out.append(f"Buyer on KisanSetu: {name} wants {r.quantity_kg:,.0f} kg of {r.crop_name} ({r.quality_grade}) in {r.district} at up to ₹{r.target_price_per_kg} per kg.")
            if not reqs:
                out.append(f"No buyer on KisanSetu has an open requirement for {crop} right now; the farmer can list the crop in the Marketplace.")
        if pools:
            rows = (
                db.query(FPOPool, FPO)
                .join(FPO, FPOPool.fpo_id == FPO.id)
                .filter(FPOPool.status == "OPEN", FPOPool.crop_name.ilike(crop))
                .limit(3)
                .all()
            )
            for pool, fpo in rows:
                out.append(f"Open FPO pool: {fpo.name} ({pool.district or fpo.district}) is pooling {pool.crop_name}, {pool.total_quantity_kg:,.0f} of {pool.target_quantity_kg:,.0f} kg collected, target ₹{pool.target_price_per_kg} per kg.")
            if not rows:
                out.append(f"No FPO on KisanSetu has an open pool for {crop} right now.")
    except Exception as exc:  # the assistant must still answer if the database query fails
        print(f"[KisanSetu] marketplace facts unavailable: {exc!r}")
    finally:
        db.close()
    return out


async def grounded_answer(query_en: str, original: str | None, crop: str, quantity_kg: float, district: str, state: str) -> dict | None:
    """Answer with one model request grounded in the app's data, or None if no model answered."""
    heard = " ".join(x for x in (query_en, original or "") if x)
    if len(re.findall(r"\w", heard)) < 3:
        # Nothing usable was heard/typed (empty speech, a lost translation). Asking the model to
        # answer "?" made it invent a question and numbers — ask the farmer again instead.
        return {
            "query": query_en,
            "response": "Sorry, I could not understand the question. Please ask again, for example: what is the price of onion today?",
            "engine": "KisanSetu assistant guidance",
        }
    key = (re.sub(r"\W+", " ", query_en.lower()).strip(), crop.lower(), (district or "").lower())
    cached = _cache.get(key)
    if cached and time.time() - cached[0] < CACHE_SECONDS:
        return {"query": query_en, "response": cached[1], "engine": f"{cached[2]} (cached)"}

    facts = await _gather_facts(query_en, original or "", crop, quantity_kg, district, state)
    prompt = (
        INSTRUCTIONS
        + "\nFACTS:\n" + "\n".join(f"- {f}" for f in facts)
        + f"\n\nFARMER'S QUESTION: {query_en}"
        + (f"\n(Farmer's own words before translation: {original})" if original and original.strip() != query_en.strip() else "")
        + "\n\nANSWER:"
    )
    result = await _generate(prompt)
    if result is None:
        return None
    text, model = result
    from app.agents.orchestrator import strip_markdown

    text = strip_markdown(text)
    if len(_cache) > 500:
        _cache.clear()
    _cache[key] = (time.time(), text, model)
    return {"query": query_en, "response": text, "engine": f"Gemini · {model}"}
