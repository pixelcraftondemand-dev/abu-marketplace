// ─────────────────────────────────────────────────────────────────────────────
// Redis-backed distributed rate limiting (serverless-safe).
//
// Replaces the Postgres-backed rate_limit_entry store with Upstash Redis.
// Redis is ~100x faster for atomic increments and adds zero DB load.
//
// Fixed-window semantics: floor(now / windowMs) * windowMs = bucket key.
// Each check is an atomic INCR + EXPIRE, so concurrent instances (Vercel
// lambdas) never double-count a bucket.
//
// Keys are namespaced per limiter (`rl:{name}:{identifier}`), so all shared
// limiters never collide.
//
// Test isolation: under vitest the limiter runs in-memory so `_clear()` fully
// resets state and the test suite never hits Redis.
//
// Graceful degradation: if Redis is unreachable the check falls back to a
// per-instance in-memory limiter — requests are never hard-failed by the
// limiter itself.
// ─────────────────────────────────────────────────────────────────────────────
import { redis, isRedisAvailable } from "@/lib/redis";

/** In-memory fallback — same fixed-window semantics, single-instance only. */
function createMemoryLimiter({ windowMs, max }: { windowMs: number; max: number }) {
  const hits = new Map();
  return {
    check(key: string) {
      if (!key) return { allowed: true };
      const now = Date.now();
      const entry = hits.get(key);
      if (!entry || now > entry.resetAt) {
        hits.set(key, { count: 1, resetAt: now + windowMs });
        return { allowed: true, remaining: max - 1 };
      }
      entry.count += 1;
      if (entry.count > max) {
        return {
          allowed: false,
          retryAfter: Math.ceil((entry.resetAt - now) / 1000),
        };
      }
      return { allowed: true, remaining: max - entry.count };
    },
    _clear() {
      hits.clear();
    },
  };
}

/**
 * Atomic fixed-window check against Upstash Redis.
 * Uses INCR + EXPIRE for minimal round-trips.
 */
export async function checkRedis(key: string, windowMs: number, max: number) {
  const now = Date.now();
  const windowStart = Math.floor(now / windowMs) * windowMs;
  const bucketKey = `${key}:${windowStart}`;

  // INCR atomically increments the counter. If the key doesn't exist, Redis
  // creates it with value 1. EXPIRE sets a TTL so stale buckets are auto-
  // cleaned — no sweep job needed.
  const count = await redis.incr(bucketKey);
  if (count === 1) {
    // First request in this window — set expiry so the bucket auto-expires
    const ttlSeconds = Math.ceil(windowMs / 1000);
    await redis.expire(bucketKey, ttlSeconds);
  }

  const allowed = count <= max;
  return {
    allowed,
    remaining: allowed ? Math.max(0, max - count) : undefined,
    retryAfter: allowed
      ? undefined
      : Math.ceil((windowStart + windowMs - now) / 1000),
  };
}

/**
 * Distributed rate limiter backed by Redis.
 * Same `check(key)` interface as the old Postgres-backed version.
 *
 * @param {number} windowMs - window size in milliseconds
 * @param {number} max - max requests per window
 * @param {string} name - namespace prefix (e.g. "checkout", "rating")
 */
export function createDistributedRateLimiter({ windowMs, max, name = "rl" }: { windowMs: number; max: number; name?: string }) {
  const memory = createMemoryLimiter({ windowMs, max });
  const keyFor = (key: string) => `rl:${name}:${key}`;
  const isTest =
    process.env.VITEST === "true" || process.env.NODE_ENV === "test";

  if (isTest) {
    return {
      check: (key: string) => (key ? memory.check(keyFor(key)) : { allowed: true }),
      _clear: () => memory._clear(),
    };
  }

  return {
    async check(key: string) {
      if (!key) return { allowed: true };
      if (!isRedisAvailable) {
        // No Redis configured — fall back to Postgres-backed or in-memory
        try {
          const { checkDb } = await import("./rateLimitStore.db");
          return await checkDb(keyFor(key), windowMs, max);
        } catch {
          return memory.check(keyFor(key));
        }
      }
      try {
        return await checkRedis(keyFor(key), windowMs, max);
      } catch (error: unknown) {
        console.error(
          `[rate-limit] Redis unavailable for "${name}", degrading to in-memory:`,
          (error as Error)?.message || error
        );
        return memory.check(keyFor(key));
      }
    },
    _clear() {
      memory._clear();
    },
  };
}

// Re-export the original Postgres check for the Redis fallback
export { checkDb } from "./rateLimitStore.db";
