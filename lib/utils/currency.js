// ─── Canonical currency ───────────────────────────────────────────────────────
// The database stores canonical product prices in this base currency. Every
// displayed price is a conversion of the canonical amount for presentation only;
// the backend always recalculates totals from canonical prices.
export const DEFAULT_CURRENCY = "USD";

// Legacy alias kept for backward compatibility.
export const defaultCurrency = DEFAULT_CURRENCY;

export const defaultCountry = "Sierra Leone";
export const defaultLanguage = "English";

// ─── Sierra Leone launch config ──────────────────────────────────────────────
// The marketplace operates in Sierra Leone only for now. Other markets are
// intentionally excluded until the pilot expands.
export const supportedCountries = [
  { country: "Sierra Leone", languages: ["English", "Krio"], currency: "SLL" },
];

// Legacy alias kept for backward compatibility.
export const africanCountries = supportedCountries;

// All currencies the marketplace supports for display and checkout.
// Sierra Leone pilot: prices display in leones, with USD as the canonical base.
export const supportedCurrencies = ["USD", "SLL"];

// Built-in fallback rates (1 unit of base = X units of target). These are only
// used when the exchange-rate API is unreachable and are always surfaced as
// "stale" so no code path treats them as fresh market rates.
export const FALLBACK_RATES = {
  USD: 1,
  SLL: 22500,
};

export function isValidCurrency(code) {
  return typeof code === "string" && supportedCurrencies.includes(code);
}

export function convertAmount(amount, rate = 1) {
  const value = Number(amount) * Number(rate);
  return Number.isFinite(value) ? value : Number(amount);
}

// Options for the currency selector: leones first, USD second.
export const currencyOptions = [
  { code: "SLL", label: "Sierra Leonean Leone (SLL)" },
  { code: "USD", label: "US Dollar (USD)" },
];

// Legacy aliases kept for backward compatibility.
export const africanCurrencyOptions = currencyOptions;
export const westAfricanCurrencyOptions = currencyOptions;

export const currencySymbols = {
  USD: "$",
  SLL: "SLe ",
};

export function getCurrencySymbol(code) {
  return currencySymbols[code] ?? `${code} `;
}

// ─── Locale-aware formatting ──────────────────────────────────────────────────

// Map language names to HTML lang codes for setting document.documentElement.lang
export const languageToLangCode = {
  English: 'en',
  Krio: 'kri',
};

/** Maps a language display name to an Intl locale used for number/currency formatting. */
export function getLocaleForLanguage(language) {
  const code = languageToLangCode[language] || 'en';
  switch (code) {
    case 'kri':
      return 'en-US';
    default:
      return 'en-US';
  }
}

// Currencies whose ICU output shows the ISO code instead of a symbol; we swap in
// the marketplace's brand symbol while keeping locale-aware grouping/positioning.
const BRAND_SYMBOL_BY_CODE = { SLL: "SLe" };

/**
 * Locale-aware currency formatting via Intl.NumberFormat. Never hand-concatenates
 * hardcoded symbols. Falls back to symbol + grouped number if the runtime's ICU
 * does not know the currency.
 */
export function formatPrice(value, currency = DEFAULT_CURRENCY, locale = "en-US") {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "";
  try {
    // Product prices are stored with cents. Preserve them for the redenominated
    // Sierra Leonean leone instead of letting ICU round customer totals to a
    // whole SLe (for example, SLe 1,234.50 must not render as SLe 1,235).
    const fractionDigits = currency === "SLL" ? { minimumFractionDigits: 2, maximumFractionDigits: 2 } : {};
    let formatted = new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      ...fractionDigits,
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

export function formatPriceWithRate(value, currency = DEFAULT_CURRENCY, locale = "en-US", rate = 1) {
  const converted = convertAmount(value, rate);
  return formatPrice(converted, currency, locale);
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
