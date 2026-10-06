/**
 * Redis-backed caching layer for read-heavy data.
 *
 * Pattern: write-through with TTL. Set + forget — Redis auto-expires stale
 * entries. No manual cache invalidation needed for product listings, exchange
 * rates, or other eventually-consistent data.
 *
 * Falls back gracefully when Redis is not configured (local dev): all cache
 * reads return null (cache miss) and all writes are no-ops.
 */
import { redis, isRedisAvailable } from "@/lib/redis";

const CACHE_PREFIX = "cache:";

// ─── Generic cache helpers ───────────────────────────────────────────────────

/**
 * Get a cached value by key. Returns parsed object or null (cache miss).
 */
export async function cacheGet<T = string>(key: string): Promise<T | null> {
  if (!isRedisAvailable) return null;
  try {
    const raw = await (redis as any).get(`${CACHE_PREFIX}${key}`);
    if (raw === null || raw === undefined) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return raw as unknown as T;
    }
  } catch {
    return null;
  }
}

/**
 * Set a cache value with TTL. `ttlSeconds` defaults to 60.
 */
export async function cacheSet(key: string, value: unknown, ttlSeconds = 60): Promise<void> {
  if (!isRedisAvailable) return;
  try {
    await (redis as any).set(`${CACHE_PREFIX}${key}`, JSON.stringify(value), {
      ex: ttlSeconds,
    });
  } catch {
    // Cache write failure is non-fatal — log and continue
    console.warn(`[cache] Failed to set key "${key}"`);
  }
}

/**
 * Delete a cached value by key.
 */
export async function cacheDel(key: string): Promise<void> {
  if (!isRedisAvailable) return;
  try {
    await redis.del(`${CACHE_PREFIX}${key}`);
  } catch {
    // non-fatal
  }
}

/**
 * Delete all keys matching a prefix (e.g. "product:*").
 */
export async function cacheDelPrefix(prefix: string): Promise<void> {
  if (!isRedisAvailable) return;
  try {
    // SCAN is not available in Upstash REST — use a pattern-aware approach
    // For now, we rely on TTL-based expiry. Full invalidation is rare.
  } catch {
    // non-fatal
  }
}

// ─── Domain-specific cache helpers ───────────────────────────────────────────

/** Cache product listing for 60s (read-heavy, eventually-consistent) */
export async function cacheProductList<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const cached = await cacheGet<T>(`products:${key}`);
  if (cached !== null) return cached;

  const data = await fetcher();
  await cacheSet(`products:${key}`, data, 60);
  return data;
}

/** Cache exchange rates for 5 minutes (paid API, expensive to fetch) */
export async function cacheExchangeRates<T>(baseCurrency: string, fetcher: () => Promise<T>): Promise<T> {
  const cached = await cacheGet<T>(`rates:${baseCurrency}`);
  if (cached !== null) return cached;

  const data = await fetcher();
  await cacheSet(`rates:${baseCurrency}`, data, 300);
  return data;
}

/** Cache a single product page for 30s */
export async function cacheProductPage<T>(productId: string, fetcher: () => Promise<T>): Promise<T> {
  const cached = await cacheGet<T>(`product:${productId}`);
  if (cached !== null) return cached;

  const data = await fetcher();
  await cacheSet(`product:${productId}`, data, 30);
  return data;
}

/** Cache store profile for 60s */
export async function cacheStoreProfile<T>(storeId: string, fetcher: () => Promise<T>): Promise<T> {
  const cached = await cacheGet<T>(`store:${storeId}`);
  if (cached !== null) return cached;

  const data = await fetcher();
  await cacheSet(`store:${storeId}`, data, 60);
  return data;
}

/** Cache user session data for the session duration */
export async function cacheSession<T>(userId: string, fetcher: () => Promise<T>, ttlSeconds = 3600): Promise<T> {
  const cached = await cacheGet<T>(`session:${userId}`);
  if (cached !== null) return cached;

  const data = await fetcher();
  await cacheSet(`session:${userId}`, data, ttlSeconds);
  return data;
}

/** Invalidate product cache on update */
export async function invalidateProduct(productId: string): Promise<void> {
  await cacheDel(`product:${productId}`);
}

/** Invalidate store cache on update */
export async function invalidateStore(storeId: string): Promise<void> {
  await cacheDel(`store:${storeId}`);
}
