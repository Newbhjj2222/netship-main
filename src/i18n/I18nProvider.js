// src/i18n/I18nProvider.js
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import Cookies from "js-cookie";
import { DEFAULT_LANG, LANG_COOKIE, LANG_STORAGE_KEY, LANGUAGES, isSupported } from "./config";
import { pickLocalized } from "./localized";
import rw from "./locales/rw.json";
import en from "./locales/en.json";
import sw from "./locales/sw.json";
import fr from "./locales/fr.json";

// Inkoranyamagambo zawe: reba src/i18n/locales/*.json
const dictionaries = { rw, en, sw, fr };

const warned = new Set();

function interpolate(template, vars) {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined && vars[k] !== null ? String(vars[k]) : m));
}

/**
 * t("Soma byinshi")         -> urufunguzo ni inyandiko y'umwimerere (Ikinyarwanda cyangwa icyo wanditse)
 * t("nav.home")             -> urufunguzo rwa kera (dotted) na rwo rurakora
 * t("Muraho {name}", { name })
 * Iyo ubuhinduzi budahari mu rurimi rwahisemo, hagaragara umwimerere (nta kwangirika kw'urubuga).
 */
export function translate(lang, key, vars) {
  const hit = dictionaries[lang]?.[key];
  if (hit === undefined && lang !== DEFAULT_LANG && process.env.NODE_ENV !== "production") {
    const id = `${lang}|${key}`;
    if (!warned.has(id)) {
      warned.add(id);
      console.debug(`[i18n] missing "${lang}" translation:`, key);
    }
  }
  const raw = hit ?? dictionaries[DEFAULT_LANG]?.[key] ?? key;
  return interpolate(raw, vars);
}

const I18nContext = createContext(null);

function readStoredLang() {
  try {
    const fromCookie = Cookies.get(LANG_COOKIE);
    if (isSupported(fromCookie)) return fromCookie;
    const fromStorage = window.localStorage.getItem(LANG_STORAGE_KEY);
    if (isSupported(fromStorage)) return fromStorage;
  } catch {
    /* ignore */
  }
  return null;
}

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(DEFAULT_LANG);

  useEffect(() => {
    const saved = readStoredLang();
    if (saved && saved !== DEFAULT_LANG) setLangState(saved);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === LANG_STORAGE_KEY && isSupported(e.newValue)) setLangState(e.newValue);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setLang = useCallback((next) => {
    if (!isSupported(next)) return;
    setLangState(next);
    try {
      Cookies.set(LANG_COOKIE, next, { expires: 365, sameSite: "lax", path: "/" });
      window.localStorage.setItem(LANG_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const t = useCallback((key, vars) => translate(lang, key, vars), [lang]);
  const l = useCallback((obj, field) => pickLocalized(obj, field, lang), [lang]);

  const value = useMemo(() => ({ lang, setLang, t, l, languages: LANGUAGES }), [lang, setLang, t, l]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    return {
      lang: DEFAULT_LANG,
      setLang: () => {},
      t: (key, vars) => translate(DEFAULT_LANG, key, vars),
      l: (obj, field) => pickLocalized(obj, field, DEFAULT_LANG),
      languages: LANGUAGES,
    };
  }
  return ctx;
}
