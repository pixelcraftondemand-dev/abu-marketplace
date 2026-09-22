import { Redis } from "@upstash/redis";

/**
 * Singleton Upstash Redis client.
 *
 * Uses REST-based Redis (HTTP), so it works on Vercel Edge Runtime, serverless
 * functions, and local dev without persistent connections or connection pooling.
 *
 * Falls back gracefully when env vars are missing (local dev without Redis):
 * all operations become no-ops so the app still boots.
 */

const isConfigured =
  process.env.UPSTASH_REDIS_REST_URL &&
  process.env.UPSTASH_REDIS_REST_TOKEN;

// In-memory no-op fallback — every method returns a sensible default so
// callers never need to check whether Redis is available.
function createNoOpRedis() {
  const noop = () => Promise.resolve(null);
  return new Proxy({} as Redis, {
    get(_target, prop) {
      if (prop === "get") return noop;
      if (prop === "set") return noop;
      if (prop === "del") return noop;
      if (prop === "incr") return () => Promise.resolve(0);
      if (prop === "expire") return noop;
      if (prop === "pipeline") return () => ({ exec: noop });
      if (prop === "eval") return noop;
      if (prop === "hget") return noop;
      if (prop === "hset") return noop;
      if (prop === "hdel") return noop;
      if (prop === "hgetall") return () => Promise.resolve({});
      if (prop === "zadd") return noop;
      if (prop === "zrange") return () => Promise.resolve([]);
      if (prop === "zremrangebyscore") return noop;
      if (prop === "zcard") return () => Promise.resolve(0);
      return noop;
    },
  });
}

const globalForRedis = globalThis as unknown as { __upstashRedis?: Redis };

export const redis: Redis =
  globalForRedis.__upstashRedis ??
  (isConfigured
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
      })
    : (createNoOpRedis() as unknown as Redis));

if (isConfigured) {
  globalForRedis.__upstashRedis = redis;
}

/**
 * Check if Redis is actually configured (vs. no-op fallback).
 * Use this to decide whether to degrade gracefully.
 */
export const isRedisAvailable = Boolean(isConfigured);
