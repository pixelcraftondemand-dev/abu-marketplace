// Centralized exchange-rate service (server-side).
//
// Responsibilities:
//  - Fetch live rates from the configured provider
//  - Cache them for CACHE_TTL with timestamps
//  - Fall back to built-in static rates when the API fails (always marked stale)
//  - Expose staleness checks so callers never silently use an outdated rate forever
//
// Rates are keyed by base currency. The canonical base is USD (DEFAULT_CURRENCY),
// matching how the database stores product prices and how Stripe is charged.
//
// The cache stores the FULL supported rate set per base. Requests filter down to
// their target list at return time, so asking for different symbols within the
// TTL never misses a rate.

import { DEFAULT_CURRENCY, FALLBACK_RATES, supportedCurrencies, isValidCurrency } from "@/lib/utils/currency";

const CACHE_TTL = 1000 * 60 * 60; // 1 hour
const FETCH_TIMEOUT_MS = 8000;
const RATE_PROVIDER_HOST_URL = "https://api.exchangerate.host/latest";
const RATE_PROVIDER_OPENEXCHANGE_URL = "https://openexchangerates.org/api/latest.json";

const globalForRates = globalThis;
if (!globalForRates.__exchangeServiceCache) {
  globalForRates.__exchangeServiceCache = new Map();
}

function cacheGet(base) {
  return globalForRates.__exchangeServiceCache.get(base);
}

function cacheSet(base, payload) {
  globalForRates.__exchangeServiceCache.set(base, { ts: Date.now(), data: payload });
}

function getOpenExchangeRatesAppId() {
  return process?.env?.OPEN_EXCHANGE_RATES_APP_ID;
}

function getActiveRateProvider() {
  return getOpenExchangeRatesAppId() ? "openexchangerates" : "exchangerate.host";
}

async function fetchRatesFromExchangeRateHost(base, signal) {
  const response = await fetch(`${RATE_PROVIDER_HOST_URL}?base=${encodeURIComponent(base)}`, {
    signal,
  });
  if (!response.ok) throw new Error(`Exchange API responded with ${response.status}`);
  const data = await response.json();
  if (!data?.rates || typeof data.rates !== "object") {
    throw new Error("Exchange API returned no rates");
  }
  return { provider: "exchangerate.host", rates: data.rates, date: data.date || null };
}

async function fetchRatesFromOpenExchangeRates(base, signal) {
  const appId = getOpenExchangeRatesAppId();
  if (!appId) {
    throw new Error("Open Exchange Rates app ID is not configured");
  }

  const response = await fetch(`${RATE_PROVIDER_OPENEXCHANGE_URL}?app_id=${encodeURIComponent(appId)}`, {
    signal,
  });
  if (!response.ok) {
    throw new Error(`Open Exchange Rates responded with ${response.status}`);
  }

  const data = await response.json();
  if (!data?.rates || typeof data.rates !== "object") {
    throw new Error("Open Exchange Rates returned no rates");
  }

  const usdRates = data.rates;
  if (base === DEFAULT_CURRENCY) {
    return { provider: "openexchangerates", rates: usdRates, date: data.timestamp ? new Date(data.timestamp * 1000).toISOString().slice(0, 10) : null };
  }

  const baseRate = usdRates[base];
  if (typeof baseRate !== "number") {
    throw new Error(`Open Exchange Rates returned no rate for base currency ${base}`);
  }

  const converted = { [DEFAULT_CURRENCY]: 1 / baseRate, [base]: 1 };
  for (const [code, rate] of Object.entries(usdRates)) {
    converted[code] = rate / baseRate;
  }

  return {
    provider: "openexchangerates",
    rates: converted,
    date: data.timestamp ? new Date(data.timestamp * 1000).toISOString().slice(0, 10) : null,
  };
}

// Filter a full rates map down to the requested targets (all supported when
// empty). Unknown or missing codes are simply omitted.
function filterRates(rates, targets) {
  const wanted = targets.length ? targets : supportedCurrencies;
  const out = {};
  for (const code of wanted) {
    if (typeof rates[code] === "number") out[code] = rates[code];
  }
  return out;
}

function buildFallback(targets) {
  const wanted = targets.length ? targets : supportedCurrencies;
  const out = {};
  for (const code of wanted) {
    if (typeof FALLBACK_RATES[code] === "number") out[code] = FALLBACK_RATES[code];
  }
  return out;
}

/**
 * Returns exchange rates for `base` (default USD), optionally filtered to
 * `targets`. Shape: { base, rates, date, source, timestamp, stale? }.
 * Never throws on provider failure — falls back to static rates marked stale.
 */
export async function getExchangeRates(base = DEFAULT_CURRENCY, targets = []) {
  if (!isValidCurrency(base)) {
    throw new Error(`Unsupported base currency: ${base}`);
  }

  const now = Date.now();
  const cached = cacheGet(base);
  if (cached && now - cached.ts < CACHE_TTL) {
    return {
      ...cached.data,
      rates: filterRates(cached.data.rates, targets),
      timestamp: cached.ts,
      source: "cache",
    };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    let responseData;
    try {
      const provider = getActiveRateProvider();
      if (provider === "openexchangerates") {
        responseData = await fetchRatesFromOpenExchangeRates(base, controller.signal);
      } else {
        responseData = await fetchRatesFromExchangeRateHost(base, controller.signal);
      }
    } finally {
      clearTimeout(timeout);
    }

    const fullRates = filterRates(responseData.rates, supportedCurrencies);
    const payload = {
      base,
      rates: fullRates,
      date: responseData.date || null,
      source: responseData.provider,
      stale: false,
    };
    cacheSet(base, payload);
    return { ...payload, rates: filterRates(fullRates, targets), timestamp: now };
  } catch (error) {
    // Provider unreachable — serve static fallback rates, clearly marked stale.
    const fullFallback = buildFallback([]);
    const payload = {
      base,
      rates: fullFallback,
      date: null,
      source: "fallback",
      stale: true,
      error: error?.message || "Exchange API unavailable",
    };
    cacheSet(base, payload);
    return { ...payload, rates: filterRates(fullFallback, targets), timestamp: now };
  }
}

/** Convenience: single rate for base -> target. Returns { rate, stale } or { rate: null }. */
export async function getExchangeRate(base, target) {
  if (!target) return { rate: null, stale: false };
  if (base === target) return { rate: 1, stale: false };
  const { rates, stale } = await getExchangeRates(base, [target]);
  return { rate: rates?.[target] ?? null, stale: Boolean(stale) };
}

/** True when the timestamp is missing or older than the given max age. */
export function isRateStale(timestamp, maxAgeMs = CACHE_TTL) {
  return !timestamp || Date.now() - timestamp > maxAgeMs;
}
