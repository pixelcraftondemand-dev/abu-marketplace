import { describe, expect, it } from "vitest";

import { isExpectedRateLimitP2002 } from "@/lib/prismaLogFilter";

describe("isExpectedRateLimitP2002", () => {
  it("matches the rate_limit_entry.create unique-constraint race", () => {
    const event = {
      target: "rateLimitEntry.create",
      message:
        "\nInvalid `prisma.rateLimitEntry.create()` invocation in\n/var/task/.next/server/app.js:1:1\nUnique constraint failed on the fields: (`key`)",
      timestamp: "2026-08-10T12:00:00.000Z",
    };
    expect(isExpectedRateLimitP2002(event)).toBe(true);
  });

  it("does not match other query targets", () => {
    expect(
      isExpectedRateLimitP2002({
        target: "coupon.create",
        message: "Unique constraint failed on the fields: (`code`)",
      })
    ).toBe(false);
  });

  it("does not match the same target with a different error", () => {
    expect(
      isExpectedRateLimitP2002({
        target: "rateLimitEntry.create",
        message: "Timed out during query execution",
      })
    ).toBe(false);
  });

  it("is defensive against malformed events", () => {
    expect(isExpectedRateLimitP2002(undefined)).toBe(false);
    expect(isExpectedRateLimitP2002(null)).toBe(false);
    expect(isExpectedRateLimitP2002({})).toBe(false);
    expect(isExpectedRateLimitP2002({ target: "rateLimitEntry.create" })).toBe(false);
  });
});
