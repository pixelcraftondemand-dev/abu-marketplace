// Sierra Leone pilot: English plus Krio only.
export const supportedLocales = [
  "en",
  "kri",
] as const;

export type Locale = (typeof supportedLocales)[number];

export const defaultLocale: Locale = "en";

export const localeToLanguage: Record<Locale, string> = {
  en: "English",
  kri: "Krio",
};

export const languageToLocale: Record<string, Locale> = Object.fromEntries(
  Object.entries(localeToLanguage).map(([locale, language]) => [language, locale])
) as Record<string, Locale>;

const knownBrowserLanguageMap: Record<string, Locale> = {
  en: "en",
  kri: "kri",
};

export function stripLocaleFromPath(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  if (!segments.length) return "/";
  if ((supportedLocales as readonly string[]).includes(segments[0])) {
    const stripped = segments.slice(1).join("/");
    return `/${stripped}`.replace(/\/\/$/, "") || "/";
  }
  return pathname;
}

export function getLocaleFromPath(pathname: string): Locale | null {
  const segments = pathname.split("/").filter(Boolean);
  if (!segments.length) return null;
  return (supportedLocales as readonly string[]).includes(segments[0]) ? (segments[0] as Locale) : null;
}

export function getPreferredLocaleFromAcceptLanguage(header: string | null): Locale {
  if (!header) return defaultLocale;

  const accepted = header
    .split(",")
    .map((item) => item.split(";")[0].trim().toLowerCase())
    .filter(Boolean);

  for (const item of accepted) {
    const code = item.split("-")[0];
    if ((supportedLocales as readonly string[]).includes(item)) return item as Locale;
    if ((supportedLocales as readonly string[]).includes(code)) return code as Locale;
    if (knownBrowserLanguageMap[code]) return knownBrowserLanguageMap[code];
  }

  return defaultLocale;
}

export function buildLocalizedPath(pathname: string, locale: Locale): string {
  const normalized = stripLocaleFromPath(pathname);
  return normalized === "/" ? `/${locale}` : `/${locale}${normalized}`;
}

export function getLocaleForLanguage(language: string): Locale {
  return languageToLocale[language] || defaultLocale;
}

export function getLanguageForLocale(locale: string): string {
  return localeToLanguage[locale as Locale] || "English";
}

export function buildLocaleOptions(): Array<{ code: Locale; label: string }> {
  return supportedLocales.map((locale) => ({
    code: locale,
    label: localeToLanguage[locale],
  }));
}
