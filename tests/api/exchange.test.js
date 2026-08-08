import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/exchange/route";
import { getExchangeRates } from "@/lib/services/exchangeRateService";

vi.mock("@/lib/services/exchangeRateService", () => ({
  getExchangeRates: vi.fn(),
}));

function buildRequest(url) {
  return new Request(`http://localhost:3000/api/exchange${url}`);
}

describe("GET /api/exchange", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns live rates for the default base currency", async () => {
    getExchangeRates.mockResolvedValue({
      base: "USD",
      rates: { EUR: 0.92, SLE: 22.5 },
      date: "2026-01-01",
      source: "openexchangerates",
      stale: false,
    });
    const res = await GET(buildRequest(""));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ base: "USD", source: "openexchangerates", stale: false });
    expect(getExchangeRates).toHaveBeenCalledWith("USD", []);
  });

  it("forwards the base and symbols query parameters", async () => {
    getExchangeRates.mockResolvedValue({ base: "EUR", rates: { USD: 1.09 }, stale: false });
    const res = await GET(buildRequest("?base=EUR&symbols=USD,GBP"));
    expect(res.status).toBe(200);
    expect(getExchangeRates).toHaveBeenCalledWith("EUR", ["USD", "GBP"]);
  });

  it("rejects an unsupported base currency before calling the service", async () => {
    const res = await GET(buildRequest("?base=BTC"));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Unsupported base currency: BTC");
    expect(getExchangeRates).not.toHaveBeenCalled();
  });

  it("maps provider failures to a 500 response", async () => {
    getExchangeRates.mockRejectedValue(new Error("boom"));
    const res = await GET(buildRequest(""));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe("Failed to fetch rates");
  });

  it("serves stale fallback rates through the route when the provider is down", async () => {
    // The route layer passes the service's response through unchanged, so a
    // stale fallback payload (never a hard error) reaches the client intact.
    getExchangeRates.mockResolvedValue({
      base: "USD",
      rates: { EUR: 0.92 },
      source: "fallback",
      stale: true,
      error: "network down",
    });
    const res = await GET(buildRequest("?symbols=EUR"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.source).toBe("fallback");
    expect(body.stale).toBe(true);
  });
});
