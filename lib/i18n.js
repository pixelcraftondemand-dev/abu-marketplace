"use client"
import { useCallback } from "react"
import { useSelector } from "react-redux"
import { languageToLocale } from "@/lib/utils/locale"
import { getLocaleForLanguage } from "@/lib/utils/currency"
import en from "@/locales/en/common.json"
import fr from "@/locales/fr/common.json"
import kri from "@/locales/kri/common.json"
import pt from "@/locales/pt/common.json"
import ha from "@/locales/ha/common.json"
import yo from "@/locales/yo/common.json"
import ig from "@/locales/ig/common.json"
import wo from "@/locales/wo/common.json"
import ff from "@/locales/ff/common.json"
import ak from "@/locales/ak/common.json"

export const dictionaries = { en, fr, kri, pt, ha, yo, ig, wo, ff, ak }

// Languages that ship with translations. Any other language falls back to English.
export const translatedLanguages = [
  "English",
  "French",
  "Portuguese",
  "Krio",
  "Hausa",
  "Yoruba",
  "Igbo",
  "Wolof",
  "Fula",
  "Twi",
]

export function getDictionary(language) {
  const code = languageToLocale[language] || "en"
  return dictionaries[code] || dictionaries.en
}

function lookupValue(dictionary, key) {
  return key.split(".").reduce((acc, part) => (acc == null ? undefined : acc[part]), dictionary)
}

/**
 * Translate a dot-path key into `language`, falling back to English and finally
 * to the raw key. Supports {param} interpolation.
 */
export function translate(key, language = "English", params = {}) {
  let value = lookupValue(getDictionary(language), key)
  if (value == null) value = lookupValue(dictionaries.en, key)
  if (value == null) return key
  if (params) {
    value = String(value).replace(/\{(\w+)\}/g, (match, name) =>
      params[name] != null ? String(params[name]) : match
    )
  }
  return value
}

/**
 * React hook: reads the active language from the Redux preferences store and
 * returns a `t(key, params)` translator bound to it.
 */
export function useTranslation() {
  const language = useSelector((state) => state.preferences.selectedLanguage)
  const t = useCallback((key, params) => translate(key, language, params), [language])
  return { t, language, locale: getLocaleForLanguage(language) }
}
