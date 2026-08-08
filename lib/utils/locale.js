export const supportedLocales = [
  "en",
  "fr",
  "pt",
  "kri",
  "ha",
  "yo",
  "ig",
  "wo",
  "ff",
  "ak",
];

export const defaultLocale = "en";

export const localeToLanguage = {
  en: "English",
  fr: "French",
  pt: "Portuguese",
  kri: "Krio",
  ha: "Hausa",
  yo: "Yoruba",
  ig: "Igbo",
  wo: "Wolof",
  ff: "Fula",
  ak: "Twi",
};

export const languageToLocale = Object.fromEntries(
  Object.entries(localeToLanguage).map(([locale, language]) => [language, locale])
);

const knownBrowserLanguageMap = {
  en: "en",
  fr: "fr",
  pt: "pt",
  kri: "kri",
  ha: "ha",
  yo: "yo",
  ig: "ig",
  wo: "wo",
  ff: "ff",
  ak: "ak",
};

export function stripLocaleFromPath(pathname) {
  const segments = pathname.split("/").filter(Boolean);
  if (!segments.length) return "/";
  if (supportedLocales.includes(segments[0])) {
    const stripped = segments.slice(1).join("/");
    return `/${stripped}`.replace(/\/\/$/, "") || "/";
  }
  return pathname;
}

export function getLocaleFromPath(pathname) {
  const segments = pathname.split("/").filter(Boolean);
  if (!segments.length) return null;
  return supportedLocales.includes(segments[0]) ? segments[0] : null;
}

export function getPreferredLocaleFromAcceptLanguage(header) {
  if (!header) return defaultLocale;

  const accepted = header
    .split(",")
    .map((item) => item.split(";")[0].trim().toLowerCase())
    .filter(Boolean);

  for (const item of accepted) {
    const code = item.split("-")[0];
    if (supportedLocales.includes(item)) return item;
    if (supportedLocales.includes(code)) return code;
    if (knownBrowserLanguageMap[code]) return knownBrowserLanguageMap[code];
  }

  return defaultLocale;
}

export function buildLocalizedPath(pathname, locale) {
  const normalized = stripLocaleFromPath(pathname);
  return normalized === "/" ? `/${locale}` : `/${locale}${normalized}`;
}

export function getLocaleForLanguage(language) {
  return languageToLocale[language] || defaultLocale;
}

export function getLanguageForLocale(locale) {
  return localeToLanguage[locale] || "English";
}

export function buildLocaleOptions() {
  return supportedLocales.map((locale) => ({
    code: locale,
    label: localeToLanguage[locale],
  }));
}
