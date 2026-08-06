import { NextResponse } from "next/server";
import { getExchangeRates } from "@/lib/services/exchangeRateService";
import { isValidCurrency } from "@/lib/utils/currency";

export async function GET(req) {
  try {
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
