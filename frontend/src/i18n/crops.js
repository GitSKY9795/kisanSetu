import { T } from "./mark.js";

// Crop names shown anywhere in the app. Always display with `t(name)`; the English
// string is also what the price API is asked for, so use `englishCropName()` to go back.
export const CROP_NAMES = [
  T("Wheat"), T("Rice"), T("Paddy (Dhan)"), T("Maize"), T("Soybean"), T("Mustard"),
  T("Onion"), T("Potato"), T("Tomato"), T("Cotton"), T("Groundnut"), T("Gram"),
  T("Chana"), T("Sugarcane"), T("Turmeric"), T("Banana"), T("Garlic"), T("Ginger"),
  T("Chilli"), T("Cauliflower"), T("Cabbage"), T("Brinjal"), T("Okra"), T("Peas"),
  T("Mango"), T("Lemon"), T("Apple"), T("Grapes"), T("Pomegranate"), T("Coriander"),
  T("Barley"), T("Jowar"), T("Bajra"), T("Tur / Arhar"), T("Moong"), T("Urad"),
  T("Lentil (Masur)"), T("Paddy / Rice"), T("Paddy"),
];

/** Maps something typed in any supported language (or English) to the English crop name,
 * or null if it isn't a known crop. */
export function englishCropName(typed, t) {
  const q = String(typed || "").trim().toLowerCase();
  if (!q) return null;
  return (
    CROP_NAMES.find((name) => name.toLowerCase() === q || t(name).toLowerCase() === q) ||
    CROP_NAMES.find((name) => t(name).toLowerCase().includes(q) && q.length >= 2) ||
    null
  );
}

/** The crop's name in the current language when it is a known one, otherwise as given with a capital letter. */
export function cropLabel(t, name) {
  const q = String(name || "").trim().toLowerCase();
  const known = CROP_NAMES.find((n) => n.toLowerCase() === q);
  if (known) return t(known);
  return q.replace(/(^|\s)\S/g, (c) => c.toUpperCase());
}
