"""
KisanSetu assistant entry point: answers with one grounded Gemini request (grounded.py) and
falls back to the offline rule-based engine below when no model is available.
"""
from __future__ import annotations

import re

from app.services.decision_engine import recommend_action
from app.services.data_ingestion.agmarknet_client import CROP_PRICE_PROFILES, fetch_mandi_prices
from app.services.weather_service import get_weather_forecast
from app.services.price_forecast_service import forecast_price
from app.agents.grounded import grounded_answer

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


# Word-boundary patterns (not plain substring checks) for each crop this app actually
# tracks prices for — "rice" as a bare substring would otherwise false-match inside
# "price" itself. Used so a free-text question naming a different crop than whatever
# crop_name/context happened to be passed in (e.g. asking about onion while the
# dashboard's crop selector still shows wheat) gets answered about the crop actually
# asked about, instead of the rule-based fallback silently answering about wheat.
_CROP_ALIASES = {
    "wheat": ("wheat", "gehu", "gehun", "गेहूं", "गेहूँ", "गहू", "गहूं"),
    "rice": ("rice", "chawal", "चावल"),
    "paddy": ("paddy", "dhan", "dhaan", "धान"),
    "onion": ("onion", "pyaz", "pyaaz", "प्याज", "कांदा"),
    "potato": ("potato", "aloo", "alu", "आलू", "बटाटा"),
    "tomato": ("tomato", "tamatar", "टमाटर", "टोमॅटो"),
    "cotton": ("cotton", "kapas", "कपास", "कापूस"),
    "soybean": ("soybean", "soya", "सोयाबीन"),
    "maize": ("maize", "corn", "makka", "मक्का", "मका"),
    "groundnut": ("groundnut", "peanut", "moongfali", "मूंगफली", "भुईमूग"),
    "mustard": ("mustard", "sarson", "सरसों", "मोहरी"),
    "gram": ("gram",),
    "chana": ("chana", "चना", "हरभरा"),
    "sugarcane": ("sugarcane", "ganna", "गन्ना", "ऊस"),
}

_TRACKED_CROP_PATTERNS = {
    crop: re.compile("|".join(rf"(?<!\w){re.escape(alias)}(?!\w)" for alias in aliases), re.IGNORECASE)
    for crop, aliases in _CROP_ALIASES.items()
    if crop in CROP_PRICE_PROFILES
}

# Crops the app has no price data for at all. Named explicitly so an honest "we don't
# track that yet" reply is possible instead of quietly substituting whichever crop
# happened to be the default — the visible symptom of the bug this list fixes.
_UNTRACKED_CROP_PATTERNS = {
    crop: re.compile(pattern, re.IGNORECASE)
    for crop, pattern in {
        "lemon": r"(?<!\w)(lemon|nimbu|नींबू)(?!\w)",
        "mango": r"(?<!\w)(mango|aam|आम)(?!\w)",
        "banana": r"(?<!\w)(banana|kela|केला)(?!\w)",
        "grapes": r"(?<!\w)(grapes|angoor|अंगूर)(?!\w)",
        "papaya": r"(?<!\w)(papaya|papita|पपीता)(?!\w)",
        "guava": r"(?<!\w)(guava|amrood|अमरूद)(?!\w)",
        "orange": r"(?<!\w)(orange|santra|संतरा)(?!\w)",
        "apple": r"(?<!\w)(apple|seb|सेब)(?!\w)",
        "garlic": r"(?<!\w)(garlic|lahsun|लहसुन)(?!\w)",
        "ginger": r"(?<!\w)(ginger|adrak|अदरक)(?!\w)",
        "chilli": r"(?<!\w)(chilli|chili|mirchi|मिर्च|मिर्ची)(?!\w)",
        "cauliflower": r"(?<!\w)(cauliflower|gobhi|गोभी)(?!\w)",
        "cabbage": r"(?<!\w)(cabbage|patta gobhi|पत्ता गोभी)(?!\w)",
        "brinjal": r"(?<!\w)(brinjal|eggplant|baingan|बैंगन)(?!\w)",
        "okra": r"(?<!\w)(okra|bhindi|भिंडी)(?!\w)",
        "cucumber": r"(?<!\w)(cucumber|kheera|खीरा)(?!\w)",
        "peas": r"(?<!\w)(peas|matar|मटर)(?!\w)",
        "spinach": r"(?<!\w)(spinach|palak|पालक)(?!\w)",
        "coriander": r"(?<!\w)(coriander|dhaniya|धनिया)(?!\w)",
        "turmeric": r"(?<!\w)(turmeric|haldi|हल्दी)(?!\w)",
    }.items()
}

_INTENT_KEYWORDS = {
    "price": ("price", "rate", "bhav", "bhaav", "market price", "भाव", "कीमत", "दाम", "रेट", "बाजार भाव", "मूल्य"),
    "forecast": ("forecast", "trend", "future", "next", "prediction", "predict", "पूर्वानुमान", "रुझान", "अगले", "भविष्य"),
    "weather": ("weather", "rain", "mausam", "barish", "बारिश", "मौसम", "पाऊस"),
    "buyer": ("buyer", "sell to", "customer", "procurement", "खरीदार", "बेच", "विक्रय"),
    "storage": ("store", "storage", "warehouse", "cold storage", "hold", "रख", "भंडारण", "स्टोर", "गोदाम"),
    "decision": ("sell", "wait", "store", "hold", "recommend", "decision", "advice", "बेच", "रख", "सलाह", "विक्री"),
}


_INTENT_KEYWORDS.update({
    "loan": ("loan", "credit", "pledge", "finance", "e-nwr", "enwr", "ऋण", "लोन", "कर्ज", "कर्जा"),
    "warehouse": ("cold storage", "cold-storage", "warehouse", "godown", "silo", "कोल्ड स्टोरेज", "गोदाम", "शीतगृह"),
    "fpo": ("fpo", "pool", "aggregate", "producer organisation", "producer organization", "एफपीओ"),
    "agronomy": ("fertilizer", "fertiliser", "urea", "dap", "pesticide", "pest", "disease", "insect", "irrigation",
                 "irrigate", "seed", "sowing", "sow ", "spray", "fungus", "weed", "खाद", "उर्वरक", "कीट", "बीज", "सिंचाई", "बुवाई", "रोग"),
})


def _contains_intent(text: str, intent: str) -> bool:
    return any(keyword in text for keyword in _INTENT_KEYWORDS[intent])


def _known_places() -> list[str]:
    from app.api.routes_logistics import WAREHOUSES_DIRECTORY
    from app.api.routes_prices import MANDI_NETWORK

    names = {w["district"] for w in WAREHOUSES_DIRECTORY}
    names |= {m["district"] for markets in MANDI_NETWORK.values() for m in markets}
    names |= {"Bhopal", "Jaipur", "Delhi", "Lucknow", "Patna", "Hyderabad", "Chennai", "Kolkata", "Mumbai", "Nagpur", "Ahmedabad", "Ludhiana", "Amritsar"}
    return sorted(names, key=len, reverse=True)


_PLACE_STOPWORDS = {"the", "my", "this", "next", "today", "tomorrow", "week", "days", "market", "mandi", "india", "kg", "quintals"}


def _detect_place(query_en: str) -> str | None:
    """A district or town named in the question ("weather in Indore", "cold storage near Dewas")."""
    for name in _known_places():
        if re.search(rf"(?<!\w){re.escape(name)}(?!\w)", query_en, re.IGNORECASE):
            return name
    match = re.search(r"\b(?:in|near|at|around|from)\s+([A-Z][a-z]{2,}(?:\s[A-Z][a-z]{2,})?)", query_en)
    if match and match.group(1).lower() not in _PLACE_STOPWORDS:
        return match.group(1)
    return None


def _detect_quantity_quintals(query_lower: str) -> float | None:
    """'50 quintals', '2 tonnes', '800 kg' -> quantity in quintals."""
    match = re.search(r"(\d+(?:\.\d+)?)\s*(quintals?|qtl|क्विंटल|tonnes?|tons?|mt|kg|kilo)", query_lower)
    if not match:
        return None
    value, unit = float(match.group(1)), match.group(2)
    if unit.startswith(("ton", "mt")):
        return value * 10
    if unit.startswith(("kg", "kilo")):
        return value / 100
    return value


def _detect_mentioned_crop(query_lower: str) -> tuple[str | None, bool]:
    """Returns (crop_name, is_tracked) for the first crop explicitly named in the
    query, scanning left to right so the earliest-mentioned crop wins when more than
    one appears. (None, False) means no crop was named at all."""
    best_crop, best_pos, best_tracked = None, None, False
    for crop, pattern in _TRACKED_CROP_PATTERNS.items():
        match = pattern.search(query_lower)
        if match and (best_pos is None or match.start() < best_pos):
            best_crop, best_pos, best_tracked = crop, match.start(), True
    for crop, pattern in _UNTRACKED_CROP_PATTERNS.items():
        match = pattern.search(query_lower)
        if match and (best_pos is None or match.start() < best_pos):
            best_crop, best_pos, best_tracked = crop, match.start(), False
    return best_crop, best_tracked


async def run_agent_query(
    query_en: str,
    crop_name: str = "wheat",
    quantity_kg: float = 500.0,
    district: str = "Central",
    state: str = "",
    original_query: str | None = None,
) -> dict:
    """Answers a farmer's question: grounded Gemini answer first, offline rule engine if no model is available."""
    # One model request per question, grounded in the app's own data (see grounded.py).
    answer = await grounded_answer(query_en, original_query, crop_name, quantity_kg, district, state)
    if answer is not None:
        return answer
    print("[KisanSetu] every Gemini model is unavailable right now — using the offline engine")

    query_lower = " ".join(part.lower() for part in (query_en, original_query or "") if part)
    mentioned_crop, mentioned_crop_tracked = _detect_mentioned_crop(query_lower)
    if mentioned_crop and mentioned_crop != crop_name.strip().lower():
        crop_name = mentioned_crop

    place = _detect_place(query_en) or district
    if place.lower() != (district or "").lower():
        state = ""  # profile state doesn't apply to another place named in the question
    quantity_q = _detect_quantity_quintals(query_lower)

    if _contains_intent(query_lower, "loan"):
        records = await fetch_mandi_prices(crop_name, state=state or None, district=place, limit=1)
        price_q = float(records[0]["modal_price"]) if records else None
        qty = quantity_q or quantity_kg / 100
        if price_q is None:
            return {"query": query_en, "engine": "KisanSetu pledge-loan calculator",
                    "response": f"An e-NWR pledge loan gives 70% of the stored produce's value at about 7% yearly interest, but I could not get today's {crop_name} price to work out the amount. Please try again shortly."}
        value = qty * price_q
        loan = value * 0.70
        return {
            "query": query_en,
            "engine": "KisanSetu pledge-loan calculator",
            "response": (
                f"For {qty:g} quintals of {crop_name} at today's mandi price of ₹{price_q:,.0f} per quintal, the produce is worth about ₹{value:,.0f}. "
                f"After depositing it in a WDRA warehouse you can get an e-NWR pledge loan of about ₹{loan:,.0f} (70% of the value) "
                f"at roughly 7% yearly interest, which is about ₹{loan * 0.07 / 12:,.0f} per month."
            ),
        }

    if _contains_intent(query_lower, "warehouse"):
        from app.api.routes_logistics import WAREHOUSES_DIRECTORY

        rows = sorted(WAREHOUSES_DIRECTORY, key=lambda w: (w["district"].lower() != place.lower(), w["distance_km"]))[:3]
        listing = " ".join(
            f"{w['name']} in {w['district']} ({w['type']}, {w['available_capacity_mt']} tonnes free, ₹{w['daily_rate_per_quintal_inr']} per quintal per day, phone {w['contact_phone']})."
            for w in rows
        )
        return {"query": query_en, "engine": "KisanSetu warehouse directory",
                "response": f"Verified cold storages and warehouses near {place}: {listing}"}

    if _contains_intent(query_lower, "weather"):
        weather = get_weather_forecast(district=place)
        week = weather.get("rain_probability_next_7_days_max_pct")
        week_text = f" Over the next 7 days the highest rain chance is {week} percent." if week is not None else ""
        return {
            "query": query_en,
            "engine": "KisanSetu weather tool",
            "response": (
                f"Weather for {place}: {weather.get('weather_condition', 'unavailable')}, "
                f"up to {weather.get('temperature_max_c', '?')}°C today, rain chance {weather.get('rain_probability_pct', '?')} percent.{week_text} "
                f"Harvest risk is {str(weather.get('harvest_risk', 'unknown')).lower()}."
            ),
        }

    if _contains_intent(query_lower, "agronomy"):
        return {
            "query": query_en,
            "engine": "KisanSetu assistant guidance",
            "response": (
                "The AI crop advisor is busy right now, so I can't give crop-care advice on this at the moment. "
                "Please ask again in a minute, or call the Kisan Call Centre on 1800-180-1551 for free expert advice on fertilizer, pests and irrigation."
            ),
        }

    records = await fetch_mandi_prices(crop_name, state=state or None, district=place, limit=1)
    if not records:
        return {
            "query": query_en,
            "response": f"I could not retrieve a live mandi price for {crop_name} in {place}. Please try again shortly.",
            "engine": "Live market feed unavailable",
        }
    data_source = "AGMARKNET live feed" if records[0].get("is_live", True) else "KisanSetu local historical reference"
    spoken_source = "live mandi" if records[0].get("is_live", True) else "recent mandi history"
    current_price_per_kg = float(records[0]["modal_price"]) / 100
    market = records[0].get("market", "the live mandi feed")
    arrival_date = records[0].get("arrival_date", "today")

    if _contains_intent(query_lower, "forecast"):
        predicted = forecast_price(crop_name, current_price_per_kg, horizon_days=7)
        direction = "up" if predicted > current_price_per_kg else "down" if predicted < current_price_per_kg else "stable"
        return {
            "query": query_en,
            "response": (
                f"The {spoken_source} {crop_name} price is ₹{round(current_price_per_kg, 2)} per kg. "
                f"The 7-day forecast is ₹{round(predicted, 2)} per kg, so the trend is {direction}."
            ),
            "engine": data_source,
        }

    if _contains_intent(query_lower, "decision"):
        qty_kg = quantity_q * 100 if quantity_q else quantity_kg
        decision = recommend_action(
            crop_name=crop_name,
            current_price_per_kg=current_price_per_kg,
            quantity_kg=qty_kg,
            storage_capacity_kg=600.0,
            district=place,
        )
        response_text = (
            f"RECOMMENDATION: {decision['action'].replace('_', ' ')}\n\n"
            f"{spoken_source.capitalize()} price of {crop_name}: ₹{round(current_price_per_kg, 2)}/kg. Expected net realization: ₹{decision['net_realization_per_kg']}/kg "
            f"(about ₹{round(decision['net_realization_per_kg'] * qty_kg):,} for {qty_kg:g} kg).\n\n"
            + "\n".join(f"• {r}" for r in decision["reasons"])
        )
        return {"query": query_en, "response": response_text, "decision": decision, "engine": "KisanSetu Multi-Tool Engine"}

    if _contains_intent(query_lower, "price"):
        return {
            "query": query_en,
            "response": (
                f"The {spoken_source} {crop_name} modal price is ₹{round(current_price_per_kg * 100, 2)} per quintal "
                f"(₹{round(current_price_per_kg, 2)} per kg) at {market}, recorded on {arrival_date}."
            ),
            "engine": data_source,
        }

    if _contains_intent(query_lower, "buyer"):
        return {
            "query": query_en,
            "response": (
                f"For {quantity_kg:g} kg of {crop_name}, start with verified buyers offering pickup near {place} in the Marketplace. "
                f"The current {spoken_source} benchmark is ₹{round(current_price_per_kg, 2)} per kg; compare every buyer offer against it."
            ),
            "engine": "KisanSetu buyer guidance engine",
        }

    if _contains_intent(query_lower, "fpo"):
        return {
            "query": query_en,
            "response": (
                f"Pooling {crop_name} with a local Farmer Producer Organisation lets you share transport (about 35% cheaper) and sell in bulk lots to corporate buyers at a premium. "
                f"Today's {spoken_source} benchmark is ₹{round(current_price_per_kg, 2)} per kg. Ask your FPO to add your lot to an open pool in the FPO hub."
            ),
            "engine": "KisanSetu FPO guidance",
        }

    if _contains_intent(query_lower, "storage"):
        return {
            "query": query_en,
            "response": (
                f"For storing {crop_name}, keep the produce dry, ventilated, and protected from pests. "
                f"Compare the storage cost with today's {spoken_source} price of ₹{round(current_price_per_kg, 2)} per kg before deciding to wait."
            ),
            "engine": data_source,
        }

    return {
        "query": query_en,
        "response": (
            "The AI advisor is busy right now, so I can only answer questions about mandi prices, price forecasts, "
            "whether to sell or store, weather, cold storage, pledge loans, buyers and FPO pooling. Please ask one of those, or try again in a minute."
        ),
        "engine": "KisanSetu assistant guidance",
    }
