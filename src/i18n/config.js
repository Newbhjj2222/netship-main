// src/i18n/config.js
// Indimi zishyigikiwe n'igenamiterere rusange (bikoreshwa kuri client no kuri server).

export const LANGUAGES = [
  { code: "rw", native: "Ikinyarwanda", english: "Kinyarwanda", nllb: "kin_Latn", ogLocale: "rw_RW" },
  { code: "en", native: "English", english: "English", nllb: "eng_Latn", ogLocale: "en_US" },
  { code: "sw", native: "Kiswahili", english: "Swahili", nllb: "swh_Latn", ogLocale: "sw_KE" },
  { code: "fr", native: "Français", english: "French", nllb: "fra_Latn", ogLocale: "fr_FR" },
];

export const DEFAULT_LANG = "rw";
export const LANG_COOKIE = "lang";
export const LANG_STORAGE_KEY = "nt_lang";

export const SUPPORTED_CODES = LANGUAGES.map((l) => l.code);

export function isSupported(code) {
  return SUPPORTED_CODES.includes(code);
}

export function getLanguage(code) {
  return LANGUAGES.find((l) => l.code === code) || LANGUAGES[0];
}
