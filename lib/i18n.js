"use client"
import { useCallback } from "react"
import { useSelector } from "react-redux"
import { languageToLangCode, getLocaleForLanguage } from "@/lib/utils/currency"
import en from "@/locales/en/common.json"
import fr from "@/locales/fr/common.json"
import kri from "@/locales/kri/common.json"

export const dictionaries = { en, fr, kri }

// Languages that ship with translations. Any other language falls back to English.
export const translatedLanguages = ["English", "French", "Krio"]

export function getDictionary(language) {
  const code = languageToLangCode[language] || "en"
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
