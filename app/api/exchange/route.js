import { NextResponse } from "next/server";
import { exchangeRateLimiter } from "@/lib/security";
import { hashIp } from "@/lib/paymentLog";
import { getExchangeRates } from "@/lib/services/exchangeRateService";
import { isValidCurrency } from "@/lib/utils/currency";

export async function GET(req) {
  try {
    // Each lookup can hit the external OER API — bound per IP.
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rl = await exchangeRateLimiter.check(hashIp(ip));
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429, headers: { "Retry-After": String(rl.retryAfter || 600) } });
    }

    const { searchParams } = new URL(req.url);
    const base = searchParams.get("base") || "USD";
    const symbols = (searchParams.get("symbols") || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (!isValidCurrency(base)) {
      return NextResponse.json({ error: `Unsupported base currency: ${base}` }, { status: 400 });
    }

    const data = await getExchangeRates(base, symbols);
    return NextResponse.json(data);
  } catch (err) {
    console.error("[GET /api/exchange]", err?.message || err);
    return NextResponse.json({ error: "Failed to fetch rates" }, { status: 500 });
  }
}
