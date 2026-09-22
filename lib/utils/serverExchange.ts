// Server-side exchange rate helper (thin wrapper over the centralized service).
import { getExchangeRate } from "@/lib/services/exchangeRateService";

export async function getServerExchangeRate(base: string = "USD", target: string = "USD"): Promise<number> {
  const { rate } = await getExchangeRate(base, target);
  return rate ?? 1;
}
