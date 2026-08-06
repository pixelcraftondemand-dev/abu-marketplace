import { describe, expect, it, vi } from "vitest";
import { createRateLimiter } from "@/lib/security";

describe("createRateLimiter", () => {
  it("allows requests up to the limit", () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 3 });
    expect(limiter.check("user_1").allowed).toBe(true);
    expect(limiter.check("user_1").allowed).toBe(true);
    expect(limiter.check("user_1").allowed).toBe(true);
  });

  it("blocks requests over the limit and reports retryAfter", () => {
    vi.useFakeTimers();
    try {
      const limiter = createRateLimiter({ windowMs: 60_000, max: 2 });
      limiter.check("user_1");
      limiter.check("user_1");
      const blocked = limiter.check("user_1");
      expect(blocked.allowed).toBe(false);
      expect(blocked.retryAfter).toBeGreaterThan(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it("tracks keys independently", () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 1 });
    expect(limiter.check("user_a").allowed).toBe(true);
    expect(limiter.check("user_a").allowed).toBe(false);
    expect(limiter.check("user_b").allowed).toBe(true);
  });

  it("resets the window after expiry", () => {
    vi.useFakeTimers();
    try {
      const limiter = createRateLimiter({ windowMs: 60_000, max: 1 });
      limiter.check("user_1");
      expect(limiter.check("user_1").allowed).toBe(false);
      vi.advanceTimersByTime(60_001);
      expect(limiter.check("user_1").allowed).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it("allows when no key is provided", () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 1 });
    expect(limiter.check(null).allowed).toBe(true);
  });
});
