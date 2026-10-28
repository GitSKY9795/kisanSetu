# Translation tooling

The app shows English text from `t("English phrase")` calls and looks it up in
`src/i18n/locales/<lang>.js` (hi, mr, gu, pa, te, ta, bn). An English phrase that has no
entry simply stays in English, so nothing breaks when a new string is added — it just isn't
translated until the steps below are run.

## Adding or changing text

1. Write the new text in the code as `t("Your phrase")` (or `tn(...)` when a React node such
   as `<strong>` must sit inside the sentence). Put every value in a `{placeholder}`:
   `t("Welcome, {name}", { name })` — never glue a sentence together from pieces, because
   the word order differs between languages.
2. Text that lives in a constant or comes from the backend is marked with `T("...")`
   (`src/i18n/mark.js`) and translated where it is shown, with `t(item)`.
   Backend sentences that contain a number go in `src/i18n/serverText.js` as templates.
3. Regenerate the tables (run from `backend/` with its virtualenv, BHASHINI credentials in `.env`):

   ```bash
   S=../frontend/scripts/i18n
   node $S/extract_phrases.mjs ../frontend/src $S/phrases.json
   ./venv/Scripts/python.exe $S/gen_translations.py $S/phrases.json $S/nmt hi,mr,gu,pa,te,ta,bn
   ./venv/Scripts/python.exe $S/build_locales.py $S ../frontend/src/i18n/locales
   ```

   `gen_translations.py` only asks BHASHINI for phrases it has not translated before
   (results are kept in `nmt/`). `build_locales.py` writes the seven locale files.

## Where the human review goes

`glossary.py` holds hand-written translations that always win over the machine output, plus
word-level clean-ups (`REPLACE`). The machine translation (BHASHINI) is good for sentences
but gets short words wrong without context ("Store" came back as "shop", "Net in hand" as
"fishing net in hand", one language returned "ginger" for "onion"). Fix such things in
`glossary.py`, not in the generated `locales/*.js`, or the next build will overwrite them.

Hindi was reviewed most closely. The other six languages were machine-translated and then
corrected where an obvious error showed up; they should still be read through by a native
speaker before being shown to farmers.

## Files

| File | Purpose |
| --- | --- |
| `extract_phrases.mjs` | Collects every `t()/tn()/T()` phrase in `src/` into `phrases.json`. |
| `gen_translations.py` | Sends phrases to BHASHINI. Protects `{placeholders}`, brand names and acronyms, bullets and colons so they survive translation. |
| `build_locales.py` | Restores the protected parts, applies `glossary.py`, writes `src/i18n/locales/*.js`. |
| `glossary.py` | Hand-written translations and clean-up rules. |
| `hi_seed.json` | Hindi wording from the project's earlier dictionary, reused for phrases that match exactly. |
| `nmt/` | Cache of raw BHASHINI output so a build is reproducible. |
