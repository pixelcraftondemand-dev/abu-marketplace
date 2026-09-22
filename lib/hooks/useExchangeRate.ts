'use client'
import { useEffect, useState } from 'react'
import { DEFAULT_CURRENCY, FALLBACK_RATES } from '@/lib/utils/currency'

interface CacheEntry {
  rate: number;
  ts: number;
  stale: boolean;
}

// Module-level cache shared across components: key -> { rate, ts, stale }
const cache = new Map<string, CacheEntry>()

function readCache(key: string): { rate: number; stale: boolean } | null {
  const entry = cache.get(key)
  return entry ? { rate: entry.rate, stale: entry.stale } : null
}

function writeCache(key: string, rate: number, stale: boolean): void {
  cache.set(key, { rate, ts: Date.now(), stale })
}

interface ExchangeRateResponse {
  rates?: Record<string, number>;
  stale?: boolean;
}

export default function useExchangeRate(base: string = DEFAULT_CURRENCY, target: string = DEFAULT_CURRENCY) {
  const [rate, setRate] = useState<number | null>(() => {
    if (base === target) return 1
    const cached = readCache(`${base}_${target}`)
    return cached ? cached.rate : null
  })
  const [loading, setLoading] = useState(() => base !== target && readCache(`${base}_${target}`) == null)
  const [stale, setStale] = useState(() => {
    if (base === target) return false
    return readCache(`${base}_${target}`)?.stale || false
  })

  useEffect(() => {
    if (!base || !target) return
    if (base === target) {
      setRate(1)
      setStale(false)
      setLoading(false)
      return
    }

    const key = `${base}_${target}`
    const cached = readCache(key)
    if (cached) {
      setRate(cached.rate)
      setStale(cached.stale)
      setLoading(false)
      return
    }

    let mounted = true
    const applyFallback = () => {
      if (typeof FALLBACK_RATES[target as keyof typeof FALLBACK_RATES] === 'number') {
        const fallbackRate = FALLBACK_RATES[target as keyof typeof FALLBACK_RATES]
        writeCache(key, fallbackRate, true)
        if (mounted) {
          setRate(fallbackRate)
          setStale(true)
        }
      }
    }

    setLoading(true)
    fetch(`/api/exchange?base=${encodeURIComponent(base)}&symbols=${encodeURIComponent(target)}`)
      .then((res) => res.json())
      .then((data: ExchangeRateResponse) => {
        if (!mounted) return
        const r = data?.rates?.[target] ?? null
        if (r != null) {
          writeCache(key, r, Boolean(data?.stale))
          setRate(r)
          setStale(Boolean(data?.stale))
        } else {
          applyFallback()
        }
      })
      .catch(() => {
        if (mounted) applyFallback()
      })
      .finally(() => mounted && setLoading(false))

    return () => {
      mounted = false
    }
  }, [base, target])

  return { rate, loading, stale }
}
