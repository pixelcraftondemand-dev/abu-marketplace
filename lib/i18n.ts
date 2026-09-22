"use client"
import { useCallback } from "react"
import { useSelector } from "react-redux"
import { languageToLocale } from "@/lib/utils/locale"
import { getLocaleForLanguage } from "@/lib/utils/currency"
import en from "@/locales/en/common.json"
import kri from "@/locales/kri/common.json"

export const dictionaries = { en, kri }

// Languages that ship with translations. Any other language falls back to English.
// Sierra Leone pilot: English plus Krio only.
export const translatedLanguages = [
  "English",
  "Krio",
]

type Dictionary = Record<string, unknown>;

export function getDictionary(language: string): Dictionary {
  const code = languageToLocale[language] || "en"
  return (dictionaries as Record<string, Dictionary>)[code] || dictionaries.en
}

function lookupValue(dictionary: Dictionary, key: string): unknown {
  return key.split(".").reduce((acc: unknown, part: string) => (acc == null ? undefined : (acc as Record<string, unknown>)[part]), dictionary)
}

/**
 * Translate a dot-path key into `language`, falling back to English and finally
 * to the raw key. Supports {param} interpolation.
 */
export function translate(key: string, language: string = "English", params: Record<string, unknown> = {}): string {
  let value = lookupValue(getDictionary(language), key) as string | undefined
  if (value == null) value = lookupValue(dictionaries.en, key) as string | undefined
  if (value == null) return key
  if (params) {
    value = String(value).replace(/\{(\w+)\}/g, (match, name) =>
      params[name] != null ? String(params[name]) : match
    )
  }
  return value
}

interface TranslationResult {
  t: (key: string, params?: Record<string, unknown>) => string;
  language: string;
  locale: string;
}

/**
 * React hook: reads the active language from the Redux preferences store and
 * returns a `t(key, params)` translator bound to it.
 */
export function useTranslation(): TranslationResult {
  const language = useSelector((state: { preferences: { selectedLanguage: string } }) => state.preferences.selectedLanguage)
  const t = useCallback((key: string, params?: Record<string, unknown>) => translate(key, language, params), [language])
  return { t, language, locale: getLocaleForLanguage(language) }
}
