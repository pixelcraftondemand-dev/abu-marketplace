// ─── Canonical currency ───────────────────────────────────────────────────────
// The database stores canonical product prices in this base currency. Every
// displayed price is a conversion of the canonical amount for presentation only;
// the backend always recalculates totals from canonical prices.
export const DEFAULT_CURRENCY = "USD";

// Legacy alias kept for backward compatibility.
export const defaultCurrency = DEFAULT_CURRENCY;

export const defaultCountry = "Sierra Leone";
export const defaultLanguage = "English";

// All currencies the marketplace supports for display and checkout.
export const supportedCurrencies = [
  "USD", "SLE", "EUR", "GBP", "SLL", "XOF", "NGN", "GHS", "LRD", "GMD",
  "GNF", "CVE", "MRU", "ZAR", "KES", "EGP",
];

// Built-in fallback rates (1 unit of base = X units of target). These are only
// used when the exchange-rate API is unreachable and are always surfaced as
// "stale" so no code path treats them as fresh market rates.
export const FALLBACK_RATES = {
  USD: 1,
  SLE: 22.5,
  SLL: 22500,
  EUR: 0.92,
  GBP: 0.79,
  XOF: 600,
  NGN: 1600,
  GHS: 15.5,
  LRD: 193,
  GMD: 69,
  GNF: 8600,
  CVE: 103,
  MRU: 39.5,
  ZAR: 18,
  KES: 130,
  EGP: 48,
};

export function isValidCurrency(code) {
  return typeof code === "string" && supportedCurrencies.includes(code);
}

export function convertAmount(amount, rate = 1) {
  const value = Number(amount) * Number(rate);
  return Number.isFinite(value) ? value : Number(amount);
}

// A broader list of African countries with common official and regional languages
export const africanCountries = [
  { country: "Algeria", languages: ["Arabic", "French", "Berber"], currency: "DZD" },
  { country: "Angola", languages: ["Portuguese"], currency: "AOA" },
  { country: "Benin", languages: ["French", "Fon", "Yoruba"], currency: "XOF" },
  { country: "Botswana", languages: ["English", "Tswana"], currency: "BWP" },
  { country: "Burkina Faso", languages: ["French", "Moore"], currency: "XOF" },
  { country: "Burundi", languages: ["Kirundi", "French"], currency: "BIF" },
  { country: "Cabo Verde", languages: ["Portuguese", "Crioulo"], currency: "CVE" },
  { country: "Cameroon", languages: ["French", "English", "Fula"], currency: "XAF" },
  { country: "Central African Republic", languages: ["French", "Sango"], currency: "XAF" },
  { country: "Chad", languages: ["French", "Arabic"], currency: "XAF" },
  { country: "Comoros", languages: ["Comorian", "Arabic", "French"], currency: "KMF" },
  { country: "Congo", languages: ["French", "Lingala"], currency: "XAF" },
  { country: "Côte d’Ivoire", languages: ["French", "Dioula"], currency: "XOF" },
  { country: "Djibouti", languages: ["French", "Arabic", "Afar"], currency: "DJF" },
  { country: "Egypt", languages: ["Arabic"], currency: "EGP" },
  { country: "Equatorial Guinea", languages: ["Spanish", "French", "Portuguese"], currency: "XAF" },
  { country: "Eritrea", languages: ["Tigrinya", "Arabic", "English"], currency: "ERN" },
  { country: "Eswatini", languages: ["English", "Swazi"], currency: "SZL" },
  { country: "Ethiopia", languages: ["Amharic", "Oromo", "Tigrinya"], currency: "ETB" },
  { country: "Gabon", languages: ["French"], currency: "XAF" },
  { country: "Gambia", languages: ["English", "Mandinka", "Wolof"], currency: "GMD" },
  { country: "Ghana", languages: ["English", "Twi", "Ga"], currency: "GHS" },
  { country: "Guinea", languages: ["French", "Fula", "Susu"], currency: "GNF" },
  { country: "Guinea-Bissau", languages: ["Portuguese", "Crioulo"], currency: "XOF" },
  { country: "Kenya", languages: ["English", "Swahili"], currency: "KES" },
  { country: "Lesotho", languages: ["English", "Sesotho"], currency: "LSL" },
  { country: "Liberia", languages: ["English", "Kpelle"], currency: "LRD" },
  { country: "Libya", languages: ["Arabic"], currency: "LYD" },
  { country: "Madagascar", languages: ["Malagasy", "French"], currency: "MGA" },
  { country: "Malawi", languages: ["English", "Chichewa"], currency: "MWK" },
  { country: "Mali", languages: ["French", "Bambara"], currency: "XOF" },
  { country: "Mauritania", languages: ["Arabic", "French"], currency: "MRU" },
  { country: "Mauritius", languages: ["English", "French"], currency: "MUR" },
  { country: "Morocco", languages: ["Arabic", "Berber", "French"], currency: "MAD" },
  { country: "Mozambique", languages: ["Portuguese"], currency: "MZN" },
  { country: "Namibia", languages: ["English", "Afrikaans"], currency: "NAD" },
  { country: "Niger", languages: ["French", "Hausa"], currency: "XOF" },
  { country: "Nigeria", languages: ["English", "Hausa", "Yoruba", "Igbo"], currency: "NGN" },
  { country: "Rwanda", languages: ["Kinyarwanda", "French", "English"], currency: "RWF" },
  { country: "Sao Tome and Principe", languages: ["Portuguese"], currency: "STN" },
  { country: "Senegal", languages: ["French", "Wolof"], currency: "XOF" },
  { country: "Seychelles", languages: ["French", "English"], currency: "SCR" },
  { country: "Sierra Leone", languages: ["English", "Krio"], currency: "SLL" },
  { country: "Somalia", languages: ["Somali", "Arabic"], currency: "SOS" },
  { country: "South Africa", languages: ["English", "Afrikaans", "Zulu", "Xhosa"], currency: "ZAR" },
  { country: "South Sudan", languages: ["English", "Arabic"], currency: "SSP" },
  { country: "Sudan", languages: ["Arabic", "English"], currency: "SDG" },
  { country: "Tanzania", languages: ["Swahili", "English"], currency: "TZS" },
  { country: "Togo", languages: ["French", "Ewe"], currency: "XOF" },
  { country: "Tunisia", languages: ["Arabic", "French"], currency: "TND" },
  { country: "Uganda", languages: ["English", "Swahili"], currency: "UGX" },
  { country: "Zambia", languages: ["English", "Bemba"], currency: "ZMW" },
  { country: "Zimbabwe", languages: ["English", "Shona", "Ndebele"], currency: "ZWL" },
];

// Options for the currency selector. The four primary marketplace currencies
// come first, followed by the regional African currencies.
export const africanCurrencyOptions = [
  { code: "USD", label: "US Dollar (USD)" },
  { code: "SLE", label: "Sierra Leonean Leone (SLE)" },
  { code: "EUR", label: "Euro (EUR)" },
  { code: "GBP", label: "British Pound (GBP)" },
  { code: "XOF", label: "CFA Franc (XOF)" },
  { code: "NGN", label: "Nigerian Naira (NGN)" },
  { code: "GHS", label: "Ghanaian Cedi (GHS)" },
  { code: "SLL", label: "Sierra Leonean Leone (SLL)" },
  { code: "LRD", label: "Liberian Dollar (LRD)" },
  { code: "GMD", label: "Gambian Dalasi (GMD)" },
  { code: "GNF", label: "Guinean Franc (GNF)" },
  { code: "CVE", label: "Cape Verde Escudo (CVE)" },
  { code: "MRU", label: "Mauritanian Ouguiya (MRU)" },
  { code: "ZAR", label: "South African Rand (ZAR)" },
  { code: "KES", label: "Kenyan Shilling (KES)" },
  { code: "EGP", label: "Egyptian Pound (EGP)" },
];

export const westAfricanCurrencyOptions = [
  { code: "USD", label: "US Dollar (USD)" },
  { code: "SLE", label: "Sierra Leonean Leone (SLE)" },
  { code: "EUR", label: "Euro (EUR)" },
  { code: "GBP", label: "British Pound (GBP)" },
  { code: "XOF", label: "CFA Franc (XOF)" },
  { code: "NGN", label: "Nigerian Naira (NGN)" },
  { code: "GHS", label: "Ghanaian Cedi (GHS)" },
  { code: "SLL", label: "Sierra Leonean Leone (SLL)" },
  { code: "LRD", label: "Liberian Dollar (LRD)" },
  { code: "GMD", label: "Gambian Dalasi (GMD)" },
  { code: "GNF", label: "Guinean Franc (GNF)" },
  { code: "CVE", label: "Cape Verde Escudo (CVE)" },
  { code: "MRU", label: "Mauritanian Ouguiya (MRU)" },
];

export const currencySymbols = {
  USD: "$",
  SLE: "SLe ",
  SLL: "SLe ",
  EUR: "€",
  GBP: "£",
  XOF: "CFA ",
  NGN: "₦",
  GHS: "₵",
  LRD: "L$ ",
  GMD: "D ",
  GNF: "FG ",
  CVE: "CVE ",
  MRU: "UM ",
  ZAR: "R ",
  KES: "KSh ",
  EGP: "E£ ",
};

export function getCurrencySymbol(code) {
  return currencySymbols[code] ?? `${code} `;
}

// ─── Locale-aware formatting ──────────────────────────────────────────────────

// Map common language names to HTML lang codes for setting document.documentElement.lang
export const languageToLangCode = {
  English: 'en',
  French: 'fr',
  Arabic: 'ar',
  Portuguese: 'pt',
  Spanish: 'es',
  Swahili: 'sw',
  Kiswahili: 'sw',
  Amharic: 'am',
  Somali: 'so',
  Afrikaans: 'af',
  Zulu: 'zu',
  Xhosa: 'xh',
  Yoruba: 'yo',
  Igbo: 'ig',
  Hausa: 'ha',
  Krio: 'kri',
  Twi: 'ak',
  Wolof: 'wo',
  Bambara: 'bm',
  Kinyarwanda: 'rw',
  Kirundi: 'rn',
  Malagasy: 'mg',
  Shona: 'sn',
  Ndebele: 'nd',
  Lingala: 'ln',
  Fula: 'ff',
  Pulaar: 'ff',
};

/** Maps a language display name to an Intl locale used for number/currency formatting. */
export function getLocaleForLanguage(language) {
  const code = languageToLangCode[language] || 'en';
  return code === 'fr' ? 'fr-FR' : 'en-US';
}

// Currencies whose ICU output shows the ISO code instead of a symbol; we swap in
// the marketplace's brand symbol while keeping locale-aware grouping/positioning.
const BRAND_SYMBOL_BY_CODE = { SLE: "SLe", SLL: "SLe" };

/**
 * Locale-aware currency formatting via Intl.NumberFormat. Never hand-concatenates
 * hardcoded symbols. Falls back to symbol + grouped number if the runtime's ICU
 * does not know the currency.
 */
export function formatPrice(value, currency = DEFAULT_CURRENCY, locale = "en-US") {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "";
  try {
    let formatted = new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
    }).format(amount);
    const brandSymbol = BRAND_SYMBOL_BY_CODE[currency];
    if (brandSymbol && formatted.includes(currency)) {
      formatted = formatted.split(currency).join(brandSymbol);
    }
    return formatted;
  } catch {
    return `${getCurrencySymbol(currency)}${amount.toLocaleString(locale)}`;
  }
}

/** Backward-compatible formatter (symbol + locale grouping). */
export function formatCurrency(value, code = defaultCurrency) {
  return formatPrice(value, code, "en-US");
}

/**
 * Compact currency formatting for charts and axes (e.g. "$1.2K", "SLe 25.3K").
 * Reuses the same brand-symbol handling as formatPrice so charts stay in sync
 * with the regular formatter.
 */
export function formatPriceCompact(value, currency = DEFAULT_CURRENCY, locale = "en-US") {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "";
  try {
    let formatted = new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(amount);
    const brandSymbol = BRAND_SYMBOL_BY_CODE[currency];
    if (brandSymbol && formatted.includes(currency)) {
      formatted = formatted.split(currency).join(brandSymbol);
    }
    return formatted;
  } catch {
    return formatPrice(amount, currency, locale);
  }
}
