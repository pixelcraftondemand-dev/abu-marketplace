// Distributed rate limiting (Postgres-backed, serverless-safe).

import prisma from "@/lib/prisma";

interface MemoryLimiter {
  check(key: string): { allowed: boolean; remaining?: number; retryAfter?: number };
  _clear(): void;
}

function createMemoryLimiter({ windowMs, max }: { windowMs: number; max: number }): MemoryLimiter {
  const hits = new Map<string, { count: number; resetAt: number }>();
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
        return { allowed: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
      }
      return { allowed: true, remaining: max - entry.count };
    },
    _clear() {
      hits.clear();
    },
  };
}

interface CheckResult {
  allowed: boolean;
  remaining?: number;
  retryAfter?: number;
}

/**
 * Atomic fixed-window check against the shared Postgres store.
 */
export async function checkDb(key: string, windowMs: number, max: number): Promise<CheckResult> {
  const now = Date.now();
  const windowStart = Math.floor(now / windowMs) * windowMs;
  const windowDate = new Date(windowStart);

  const updated = await prisma.rateLimitEntry.updateMany({
    where: { key, windowStart: windowDate },
    data: { count: { increment: 1 } },
  });

  let count: number;
  if (updated.count === 1) {
    const row = await prisma.rateLimitEntry.findUnique({
      where: { key },
      select: { count: true },
    });
    count = row?.count ?? 1;
  } else {
    const reset = await prisma.rateLimitEntry.updateMany({
      where: { key, windowStart: { lt: windowDate } },
      data: { windowStart: windowDate, count: 1 },
    });
    if (reset.count === 1) {
      count = 1;
    } else {
      try {
        await prisma.rateLimitEntry.create({
          data: { key, windowStart: windowDate, count: 1 },
        });
        count = 1;
      } catch (error: unknown) {
        if ((error as { code?: string })?.code !== "P2002") throw error;
        await prisma.rateLimitEntry.updateMany({
          where: { key, windowStart: windowDate },
          data: { count: { increment: 1 } },
        });
        const row = await prisma.rateLimitEntry.findUnique({
          where: { key },
          select: { count: true },
        });
        count = row?.count ?? 1;
      }
    }
  }

  const allowed = count <= max;
  return {
    allowed,
    remaining: allowed ? Math.max(0, max - count) : undefined,
    retryAfter: allowed ? undefined : Math.ceil((windowStart + windowMs - now) / 1000),
  };
}

interface DistributedLimiter {
  check(key: string): Promise<CheckResult> | { allowed: boolean };
  _clear(): void;
}

/**
 * Distributed limiter backed by Postgres.
 */
export function createDistributedRateLimiter({
  windowMs,
  max,
  name = "rl",
}: {
  windowMs: number;
  max: number;
  name?: string;
}): DistributedLimiter {
  const memory = createMemoryLimiter({ windowMs, max });
  const keyFor = (key: string) => `${name}:${key}`;
  const isTest = process.env.VITEST === "true" || process.env.NODE_ENV === "test";

  if (isTest) {
    return {
      check: (key: string) => (key ? memory.check(keyFor(key)) : { allowed: true }),
      _clear: () => memory._clear(),
    };
  }

  return {
    async check(key: string) {
      if (!key) return { allowed: true };
      try {
        return await checkDb(keyFor(key), windowMs, max);
      } catch (error: unknown) {
        console.error(
          `[rate-limit] Postgres store unavailable for "${name}", degrading to in-memory limiting:`,
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
