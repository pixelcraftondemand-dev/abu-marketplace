import { defaultCurrency } from './currency'

export async function getExchangeRates(base: string = defaultCurrency, symbols: string[] = []): Promise<Record<string, number> | null> {
  try {
    const url = `/api/exchange?base=${encodeURIComponent(base)}${
      symbols.length ? `&symbols=${encodeURIComponent(symbols.join(','))}` : ''
    }`
    const res = await fetch(url)
    if (!res.ok) return null
    const data = await res.json()
    return data.rates || null
  } catch (err) {
    return null
  }
}

export async function getExchangeRate(base: string = defaultCurrency, target?: string): Promise<number | null> {
  if (!target || base === target) return 1
  const rates = await getExchangeRates(base, [target])
  if (!rates) return null
  return rates[target] ?? null
}
