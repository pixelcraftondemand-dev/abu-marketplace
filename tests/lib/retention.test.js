import { afterEach, describe, expect, it, vi } from "vitest";

import { getDataRetentionUntil, getRetentionYears } from "@/lib/retention";

describe("retention policy (AML / financial record-keeping)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("defaults to 5 years", () => {
    vi.stubEnv("DATA_RETENTION_YEARS", "");
    expect(getRetentionYears()).toBe(5);
  });

  it("honors the DATA_RETENTION_YEARS override", () => {
    vi.stubEnv("DATA_RETENTION_YEARS", "7");
    expect(getRetentionYears()).toBe(7);
  });

  it("ignores invalid overrides (zero, negative, non-numeric)", () => {
    vi.stubEnv("DATA_RETENTION_YEARS", "0");
    expect(getRetentionYears()).toBe(5);

    vi.stubEnv("DATA_RETENTION_YEARS", "-2");
    expect(getRetentionYears()).toBe(5);

    vi.stubEnv("DATA_RETENTION_YEARS", "abc");
    expect(getRetentionYears()).toBe(5);
  });

  it("computes the retention deadline as deletedAt + 5 years", () => {
    vi.stubEnv("DATA_RETENTION_YEARS", "");
    const deletedAt = new Date("2026-08-06T10:00:00.000Z");
    const until = getDataRetentionUntil(deletedAt);
    expect(until.toISOString()).toBe("2031-08-06T10:00:00.000Z");
  });

  it("accepts a string date and honors the years override", () => {
    vi.stubEnv("DATA_RETENTION_YEARS", "3");
    const until = getDataRetentionUntil("2026-01-01T00:00:00.000Z");
    expect(until.toISOString()).toBe("2029-01-01T00:00:00.000Z");
  });

  it("returns null for an invalid date", () => {
    expect(getDataRetentionUntil("not-a-date")).toBeNull();
    expect(getDataRetentionUntil(null)).toBeNull();
  });
});
