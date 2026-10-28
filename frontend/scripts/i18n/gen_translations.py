"""Translate the app's English UI phrases into the supported languages with BHASHINI NMT.

usage (from the backend dir, with its venv):
    python gen_translations.py <phrases.json> <cache_dir> <lang[,lang...]> [--limit N]

Writes <cache_dir>/nmt_<lang>.json = { sent_text: raw_output } so reruns only ask for what is
missing; post-processing (restoring placeholders etc.) is done in build_locales.py.

Protection applied before sending (and undone in build_locales.py):
  * {placeholders} (with an attached leading rupee sign / trailing percent sign) -> 5-digit numbers,
    which NMT leaves alone, so each language can reorder them freely.
  * brand names and acronyms that should stay in Latin script -> 5-digit numbers too.
  * leading symbols/emoji and trailing arrows/ellipsis are removed and re-attached afterwards.
  * ALL-CAPS phrases are sent in sentence case (NMT mangles shouted text).
"""
import asyncio
import json
import os
import re
import sys

sys.path.insert(0, os.getcwd())
import httpx  # noqa: E402

from app.core.config import settings  # noqa: E402
from app.services.bhashini_service import AUTH_URL, DEFAULT_PIPELINE_ID  # noqa: E402

DNT = [
    "KisanSetu", "AGMARKNET", "AGMARK", "e-Pramaan", "e-NWR", "WDRA", "APMC", "FPO", "UPI", "OTP", "QR", "SHAP",
    "XGBoost", "Prophet", "NABARD", "HDFC", "FSSAI", "CWC", "RBI", "LTV", "CI", "SLA", "B2B", "ML", "AI", "MSP",
    "FastAPI", "OpenRouteService", "Firebase", "BHASHINI", "Gemini", "Google",
]
DNT_RE = re.compile(r"(?<![A-Za-z])(" + "|".join(re.escape(d) for d in sorted(DNT, key=len, reverse=True)) + r")(?![A-Za-z])")
COLON = "90099"
PLACEHOLDER_RE = re.compile(r"₹?\{\w+\}%?")
LEAD_RE = re.compile(r"^[^A-Za-z0-9{₹(ऀ-෿\"']+")
TRAIL_RE = re.compile(r"(?:\s|→|↗|…|\.{2,}|:)+$")


def protect(phrase: str):
    """Returns (text_to_send, lead, trail, mapping{sentinel: original})."""
    lead = LEAD_RE.match(phrase)
    lead = lead.group(0) if lead else ""
    body = phrase[len(lead):]
    trail = TRAIL_RE.search(body)
    trail = trail.group(0) if trail else ""
    if trail:
        body = body[: -len(trail)]
    mapping = {}
    counter = [90000]

    def sentinel(original):
        counter[0] += 1
        s = str(counter[0])
        mapping[s] = original
        return s

    body = PLACEHOLDER_RE.sub(lambda m: sentinel(m.group(0)), body)
    body = DNT_RE.sub(lambda m: sentinel(m.group(0)), body)
    # a colon in the middle becomes a token too: NMT turns ": " into a Devanagari visarga (ः)
    body = re.sub(r":(?=\s)", " " + COLON, body)
    # " • ", " · ", " — ", " – " separators: NMT turns them into a bare hyphen and drops the spacing
    body = re.sub(r"\s[•·—–]\s", lambda m: " " + sentinel(m.group(0)) + " ", body)
    # "..." / "…" inside the text: NMT stretches it into a long row of dots
    body = re.sub(r"\.{3}|…", lambda m: sentinel(m.group(0)), body)
    letters = [c for c in re.sub(r"\d{5}", "", body) if c.isalpha()]
    if len(letters) > 3 and all(c.isupper() for c in letters):
        body = body.capitalize()
    else:
        # a shouted word such as PASS or UNIFORM gets spelled out letter by letter; send it as a normal word
        body = re.sub(r"\b[A-Z]{3,}\b", lambda m: m.group(0).capitalize(), body)
    return body, lead, trail, mapping


async def handshake(client, src, tgt):
    headers = {"userID": settings.BHASHINI_USER_ID, "ulcaApiKey": settings.BHASHINI_ULCA_API_KEY, "Content-Type": "application/json"}
    cfg = {"language": {"sourceLanguage": src, "targetLanguage": tgt}}
    payload = {"pipelineTasks": [{"taskType": "translation", "config": cfg}], "pipelineRequestConfig": {"pipelineId": DEFAULT_PIPELINE_ID}}
    r = await client.post(AUTH_URL, headers=headers, json=payload)
    r.raise_for_status()
    d = r.json()
    ep = d["pipelineInferenceAPIEndPoint"]
    return {
        "url": ep["callbackUrl"],
        "hdr": {ep["inferenceApiKey"]["name"]: ep["inferenceApiKey"]["value"], "Content-Type": "application/json"},
        "service": d["pipelineResponseConfig"][0]["config"][0]["serviceId"],
        "cfg": cfg["language"],
    }


async def translate_batch(client, pipe, texts):
    payload = {
        "pipelineTasks": [{"taskType": "translation", "config": {"language": pipe["cfg"], "serviceId": pipe["service"]}}],
        "inputData": {"input": [{"source": t} for t in texts]},
    }
    for attempt in range(4):
        try:
            r = await client.post(pipe["url"], headers=pipe["hdr"], json=payload)
            r.raise_for_status()
            out = r.json()["pipelineResponse"][0]["output"]
            if len(out) != len(texts):
                raise ValueError(f"expected {len(texts)} outputs, got {len(out)}")
            return [o["target"] for o in out]
        except Exception as exc:  # noqa: BLE001
            print(f"   retry {attempt + 1}: {type(exc).__name__}: {str(exc)[:120]}")
            await asyncio.sleep(2 + attempt * 3)
    return None


async def run(phrases, cache_dir, langs, limit):
    async with httpx.AsyncClient(timeout=40) as client:
        for lang in langs:
            path = os.path.join(cache_dir, f"nmt_{lang}.json")
            cache = json.load(open(path, encoding="utf-8")) if os.path.exists(path) else {}
            todo = []
            for p in phrases[:limit] if limit else phrases:
                sent = protect(p)[0]
                if sent and sent not in cache and sent not in todo:
                    todo.append(sent)
            print(f"[{lang}] {len(todo)} to translate ({len(cache)} cached)")
            if not todo:
                continue
            pipe = await handshake(client, "en", lang)
            for i in range(0, len(todo), 20):
                chunk = todo[i : i + 20]
                res = await translate_batch(client, pipe, chunk)
                if res is None:
                    # fall back to one by one so a single bad phrase does not sink the batch
                    res = []
                    for t in chunk:
                        one = await translate_batch(client, pipe, [t])
                        res.append(one[0] if one else None)
                for src, out in zip(chunk, res):
                    if out is not None:
                        cache[src] = out
                json.dump(cache, open(path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
                print(f"   {lang}: {min(i + 20, len(todo))}/{len(todo)}")
                await asyncio.sleep(0.4)


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    limit = None
    if "--limit" in sys.argv:
        limit = int(sys.argv[sys.argv.index("--limit") + 1])
        args = [a for a in args if a != str(limit)]
    phrases_file, cache_dir, langs = args[0], args[1], args[2].split(",")
    os.makedirs(cache_dir, exist_ok=True)
    asyncio.run(run(json.load(open(phrases_file, encoding="utf-8")), cache_dir, langs, limit))
