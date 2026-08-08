import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getExchangeRate, getExchangeRates, isRateStale } from "@/lib/services/exchangeRateService";
import { FALLBACK_RATES } from "@/lib/utils/currency";

describe("exchange rate service", () => {
  beforeEach(() => {
    globalThis.__exchangeServiceCache?.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("fetches live rates from exchangerate.host by default", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ base: "USD", date: "2026-01-01", rates: { EUR: 0.92, SLE: 22.5 } }),
      }),
    );
    const data = await getExchangeRates("USD", ["EUR", "SLE"]);
    expect(data.source).toBe("exchangerate.host");
    expect(data.stale).toBe(false);
    expect(data.rates.EUR).toBe(0.92);
    expect(data.rates.SLE).toBe(22.5);
    expect(data.timestamp).toBeGreaterThan(0);
  });

  it("fetches from Open Exchange Rates when the app id is configured", async () => {
    vi.stubEnv("OPEN_EXCHANGE_RATES_APP_ID", "oer_test");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        timestamp: 1767225600,
        base: "USD",
        rates: { EUR: 0.92, GBP: 0.79, SLE: 22.5 },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const data = await getExchangeRates("USD", ["EUR", "SLE"]);
    expect(data.source).toBe("openexchangerates");
    expect(data.stale).toBe(false);
    expect(data.rates.EUR).toBe(0.92);
    expect(data.rates.SLE).toBe(22.5);
    expect(data.date).toBe("2026-01-01");
    expect(fetchMock.mock.calls[0][0]).toContain("openexchangerates.org/api/latest.json");
    expect(fetchMock.mock.calls[0][0]).toContain("app_id=oer_test");
  });

  it("rebases Open Exchange Rates to a non-USD base", async () => {
    vi.stubEnv("OPEN_EXCHANGE_RATES_APP_ID", "oer_test");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          timestamp: 1767225600,
          base: "USD",
          rates: { EUR: 0.92, GBP: 0.79, SLE: 22.5 },
        }),
      }),
    );
    const data = await getExchangeRates("EUR", ["USD", "EUR", "GBP", "SLE"]);
    expect(data.source).toBe("openexchangerates");
    expect(data.rates.EUR).toBe(1);
    expect(data.rates.USD).toBeCloseTo(1 / 0.92, 5);
    expect(data.rates.GBP).toBeCloseTo(0.79 / 0.92, 5);
    expect(data.rates.SLE).toBeCloseTo(22.5 / 0.92, 5);
  });

  it("falls back to static stale rates when Open Exchange Rates lacks the base", async () => {
    vi.stubEnv("OPEN_EXCHANGE_RATES_APP_ID", "oer_test");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ base: "USD", rates: { EUR: 0.92 } }),
      }),
    );
    const data = await getExchangeRates("SLE", ["EUR"]);
    expect(data.source).toBe("fallback");
    expect(data.stale).toBe(true);
    expect(data.rates.EUR).toBe(FALLBACK_RATES.EUR);
  });

  it("serves cached rates without refetching within the TTL", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ base: "USD", date: "2026-01-01", rates: { EUR: 0.92 } }),
    });
    vi.stubGlobal("fetch", fetchMock);
    await getExchangeRates("USD", ["EUR"]);
    await getExchangeRates("USD", ["EUR"]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("serves different target sets from the same cached payload", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        base: "USD",
        date: "2026-01-01",
        rates: { EUR: 0.92, GBP: 0.79, SLE: 22.5 },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const first = await getExchangeRates("USD", ["EUR"]);
    const second = await getExchangeRates("USD", ["GBP"]);
    expect(first.rates.EUR).toBe(0.92);
    expect(second.rates.GBP).toBe(0.79);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("falls back to static stale rates when the provider is unreachable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    const data = await getExchangeRates("USD", ["EUR"]);
    expect(data.source).toBe("fallback");
    expect(data.stale).toBe(true);
    expect(data.rates.EUR).toBe(FALLBACK_RATES.EUR);
    expect(data.error).toBeTruthy();
  });

  it("falls back to static stale rates when the provider returns no rates", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }));
    const data = await getExchangeRates("USD", ["SLE"]);
    expect(data.source).toBe("fallback");
    expect(data.stale).toBe(true);
    expect(data.rates.SLE).toBe(FALLBACK_RATES.SLE);
  });

  it("throws for an unsupported base currency", async () => {
    await expect(getExchangeRates("BTC")).rejects.toThrow("Unsupported base currency");
  });

  it("returns 1 when base and target are the same currency", async () => {
    const { rate } = await getExchangeRate("USD", "USD");
    expect(rate).toBe(1);
  });

  it("reports a missing rate as null", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ rates: {} }) }));
    const { rate } = await getExchangeRate("USD", "EUR");
    expect(rate).toBe(null);
  });

  it("detects stale timestamps", () => {
    expect(isRateStale(null)).toBe(true);
    expect(isRateStale(Date.now())).toBe(false);
    expect(isRateStale(Date.now() - 1000 * 60 * 60 * 2)).toBe(true);
  });
});
