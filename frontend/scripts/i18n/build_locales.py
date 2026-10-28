"""Turns the raw NMT cache into the app's locale tables.

usage (from the backend dir, with its venv):
    python build_locales.py <scratch_dir> <frontend_locales_dir> [--lang hi,mr,...]

For every English phrase:  hand-written glossary entry  >  Hindi seed from the old dictionary
(Hindi only)  >  NMT output with the protected tokens put back.  Anything that can't be restored
cleanly (a missing {placeholder}, etc.) is left out so the app falls back to English for it, and is
listed in <scratch_dir>/build_report.txt.
"""
import importlib.util
import json
import os
import re
import sys

scratch, out_dir = sys.argv[1], sys.argv[2]
sys.path.insert(0, scratch)
sys.path.insert(0, os.getcwd())
from gen_translations import COLON, protect  # noqa: E402

LANGS = ["hi", "mr", "gu", "pa", "te", "ta", "bn"]
if "--lang" in sys.argv:
    LANGS = sys.argv[sys.argv.index("--lang") + 1].split(",")

phrases = json.load(open(os.path.join(scratch, "phrases.json"), encoding="utf-8"))

# --- hand-written glossary (dict phrase -> {lang: text}) ---------------------------------------
glossary = {}
gpath = os.path.join(scratch, "glossary.py")
if os.path.exists(gpath):
    spec = importlib.util.spec_from_file_location("glossary", gpath)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    glossary = mod.GLOSSARY
    REPLACE = getattr(mod, "REPLACE", {})
else:
    REPLACE = {}

_known = set(json.load(open(os.path.join(scratch, "phrases.json"), encoding="utf-8")))
_unknown = [k for k in glossary if k not in _known]
if _unknown:
    print("WARNING: glossary entries that match no phrase in the app:", _unknown)


def tidy(lang, text):
    for pattern, repl in REPLACE.get(lang, []):
        text = re.sub(pattern, repl, text)
    return text


# --- Hindi seed from the old dictionary (only exact English matches) ---------------------------
hi_seed = {}
seed_path = os.path.join(scratch, "hi_seed.json")
if os.path.exists(seed_path):
    hi_seed = json.load(open(seed_path, encoding="utf-8"))

DIGIT_BLOCKS = [0x0966, 0x09E6, 0x0A66, 0x0AE6, 0x0B66, 0x0BE6, 0x0C66, 0x0CE6, 0x0D66]
DIGIT_MAP = {chr(base + i): str(i) for base in DIGIT_BLOCKS for i in range(10)}


def ascii_digits(s):
    return "".join(DIGIT_MAP.get(c, c) for c in s)


PH = re.compile(r"\{\w+\}")
report = []


def from_nmt(lang, phrase, cache):
    sent, lead, trail, mapping = protect(phrase)
    raw = cache.get(sent)
    if raw is None:
        return None, "not translated"
    out = ascii_digits(raw)
    # Indian digit grouping can turn 90001 into "9, 0001"
    out = re.sub(r"(?<!\d)9\s*,\s*(0\d{3})(?!\d)", r"9\1", out)
    for token, original in mapping.items():
        if out.count(token) < 1:
            if re.search(r"[A-Za-z0-9{]", original):
                return None, f"lost token {original!r} in {raw!r}"
            continue  # a dropped separator (dash, bullet) is harmless
        out = out.replace(token, original)
    out = re.sub(r"\s*" + COLON, ":", out)
    out = re.sub(r"\s{2,}", " ", out).strip()
    # "Raised by: X" becomes "X ... raised" in these languages: the colon then ends up first, so drop it
    out = out.lstrip(":").strip()
    out = lead + out + trail
    return out, None


for lang in LANGS:
    cache_path = os.path.join(scratch, "nmt", f"nmt_{lang}.json")
    cache = json.load(open(cache_path, encoding="utf-8")) if os.path.exists(cache_path) else {}
    table, used = {}, {"glossary": 0, "seed": 0, "nmt": 0, "missing": 0}
    for phrase in phrases:
        g = glossary.get(phrase, {}).get(lang)
        if g:
            table[phrase] = g
            used["glossary"] += 1
            continue
        if lang == "hi" and phrase in hi_seed and not PH.search(phrase):
            table[phrase] = tidy(lang, hi_seed[phrase])
            used["seed"] += 1
            continue
        out, err = from_nmt(lang, phrase, cache)
        if out is None or set(PH.findall(phrase)) != set(PH.findall(out)):
            used["missing"] += 1
            report.append(f"{lang}: {phrase!r}: {err or 'placeholder mismatch -> ' + repr(out)}")
            continue
        table[phrase] = tidy(lang, out)
        used["nmt"] += 1
    body = ",\n".join(f"  {json.dumps(k, ensure_ascii=False)}: {json.dumps(v, ensure_ascii=False)}" for k, v in table.items())
    with open(os.path.join(out_dir, f"{lang}.js"), "w", encoding="utf-8", newline="\n") as f:
        f.write(f"// {lang}: English phrase -> translation. Generated; hand-written entries take priority.\nexport default {{\n{body},\n}};\n")
    print(lang, used)

open(os.path.join(scratch, "build_report.txt"), "w", encoding="utf-8").write("\n".join(report))
print(f"{len(report)} entries left to English -> build_report.txt")
