import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";

import {
  getDeviceFingerprint,
  getDeviceInfo,
  getOrComputeFingerprint,
} from "@/lib/deviceFingerprint";

// ─── Helpers ───

/** Set up a fake `window` and `localStorage` global for the duration of a test. */
function mockWindow(overrides = {}) {
  const localStorageMock = (() => {
    const store = {};
    return {
      getItem: vi.fn((k) => store[k] ?? null),
      setItem: vi.fn((k, v) => { store[k] = v; }),
      removeItem: vi.fn((k) => { delete store[k]; }),
    };
  })();

  const fake = {
    navigator: {
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) TestBrowser/1.0",
      platform: "Win32",
      language: "en-US",
      hardwareConcurrency: 8,
      deviceMemory: 16,
      maxTouchPoints: 0,
    },
    screen: {
      width: 1920,
      height: 1080,
      colorDepth: 24,
    },
    matchMedia: vi.fn().mockReturnValue({ matches: false }),
    localStorage: localStorageMock,
    ...overrides,
  };

  // Stub out global navigator, screen, and matchMedia so collectSignals()
  // can read them the same way it would in a real browser.
  vi.stubGlobal("window", fake);
  vi.stubGlobal("navigator", fake.navigator);
  vi.stubGlobal("screen", fake.screen);

  // getOrComputeFingerprint accesses `localStorage` as a bare global
  // (not window.localStorage), so we must stub it at the top level too.
  vi.stubGlobal("localStorage", localStorageMock);

  return fake;
}

// ─── getDeviceFingerprint ───

describe("getDeviceFingerprint", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns a deterministic 16-char hex string in SSR (no window)", async () => {
    // In the Node test environment `window` is undefined by default.
    // collectSignals() returns "server" and the result is salted + hashed.
    const fp = await getDeviceFingerprint();
    expect(fp).toMatch(/^[0-9a-f]{16}$/);
  });

  it("returns exactly 16 hex characters in browser mode", async () => {
    mockWindow();
    const fp = await getDeviceFingerprint();
    expect(fp).toMatch(/^[0-9a-f]{16}$/);
    expect(fp).toHaveLength(16);
  });

  it("produces a different hash when the user-agent changes", async () => {
    mockWindow({
      navigator: {
        userAgent: "AgentA",
        platform: "Win32",
        language: "en",
        hardwareConcurrency: 4,
        deviceMemory: 8,
        maxTouchPoints: 0,
      },
    });
    const fpA = await getDeviceFingerprint();

    vi.unstubAllGlobals();

    mockWindow({
      navigator: {
        userAgent: "AgentB",
        platform: "Win32",
        language: "en",
        hardwareConcurrency: 4,
        deviceMemory: 8,
        maxTouchPoints: 0,
      },
    });
    const fpB = await getDeviceFingerprint();

    expect(fpA).not.toBe(fpB);
  });

  it("produces a different hash when screen dimensions differ", async () => {
    mockWindow({
      navigator: {
        userAgent: "Same",
        platform: "Win32",
        language: "en",
        hardwareConcurrency: 4,
        deviceMemory: 8,
        maxTouchPoints: 0,
      },
      screen: { width: 1920, height: 1080, colorDepth: 24 },
    });
    const fp1 = await getDeviceFingerprint();

    vi.unstubAllGlobals();

    mockWindow({
      navigator: {
        userAgent: "Same",
        platform: "Win32",
        language: "en",
        hardwareConcurrency: 4,
        deviceMemory: 8,
        maxTouchPoints: 0,
      },
      screen: { width: 375, height: 812, colorDepth: 32 },
    });
    const fp2 = await getDeviceFingerprint();

    expect(fp1).not.toBe(fp2);
  });

  it("produces a different hash when touch support differs", async () => {
    mockWindow({
      navigator: {
        userAgent: "Same",
        platform: "Win32",
        language: "en",
        hardwareConcurrency: 4,
        deviceMemory: 8,
        maxTouchPoints: 0,
      },
    });
    const fpDesktop = await getDeviceFingerprint();

    vi.unstubAllGlobals();

    mockWindow({
      navigator: {
        userAgent: "Same",
        platform: "Win32",
        language: "en",
        hardwareConcurrency: 4,
        deviceMemory: 8,
        maxTouchPoints: 5,
      },
    });
    const fpMobile = await getDeviceFingerprint();

    expect(fpDesktop).not.toBe(fpMobile);
  });

  it("is stable across repeated calls with the same browser signals", async () => {
    mockWindow();
    const fp1 = await getDeviceFingerprint();
    const fp2 = await getDeviceFingerprint();
    const fp3 = await getDeviceFingerprint();
    expect(fp1).toBe(fp2);
    expect(fp2).toBe(fp3);
  });

  it("always returns the SSR hash when window is undefined", async () => {
    // First call — no window
    const fpSSR1 = await getDeviceFingerprint();

    vi.unstubAllGlobals();
    // Second call — still no window
    const fpSSR2 = await getDeviceFingerprint();

    expect(fpSSR1).toBe(fpSSR2);
    expect(fpSSR1).toMatch(/^[0-9a-f]{16}$/);
  });
});

// ─── getDeviceInfo ───

describe("getDeviceInfo", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns { userAgent: 'server' } in SSR mode", () => {
    const info = getDeviceInfo();
    expect(info).toEqual({ userAgent: "server" });
  });

  it("returns a full device-info object in browser mode", () => {
    mockWindow();
    const info = getDeviceInfo();

    expect(info).toEqual(
      expect.objectContaining({
        userAgent: expect.stringContaining("TestBrowser"),
        platform: "Win32",
        language: "en-US",
        screen: "1920×1080",
        timezone: expect.any(String),
        cores: 8,
        touch: false,
      })
    );
  });

  it("marks touch: true when maxTouchPoints > 0", () => {
    mockWindow({
      navigator: {
        userAgent: "Mobile",
        platform: "iPhone",
        language: "en",
        hardwareConcurrency: 6,
        deviceMemory: 4,
        maxTouchPoints: 5,
      },
    });
    const info = getDeviceInfo();
    expect(info.touch).toBe(true);
    expect(info.platform).toBe("iPhone");
  });

  it("uses '?' when screen dimensions are unavailable", () => {
    mockWindow({
      screen: { width: 0, height: 0, colorDepth: 0 },
    });
    const info = getDeviceInfo();
    expect(info.screen).toBe("?×?");
  });

  it("defaults unknown fields when navigator properties are missing", () => {
    mockWindow({
      navigator: {},
      screen: {},
    });
    const info = getDeviceInfo();

    expect(info.userAgent).toBe("unknown");
    expect(info.platform).toBe("unknown");
    expect(info.language).toBe("unknown");
    expect(info.cores).toBe("unknown");
    expect(info.touch).toBe(false);
  });
});

// ─── getOrComputeFingerprint ───

describe("getOrComputeFingerprint", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns null in SSR mode (no window)", async () => {
    const result = await getOrComputeFingerprint();
    expect(result).toBeNull();
  });

  it("computes and caches the fingerprint in localStorage", async () => {
    const fake = mockWindow();

    const result = await getOrComputeFingerprint();

    expect(result).toMatch(/^[0-9a-f]{16}$/);
    expect(fake.localStorage.setItem).toHaveBeenCalledWith(
      "abu_device_fingerprint",
      result
    );
  });

  it("returns the cached value from localStorage on subsequent calls", async () => {
    const fake = mockWindow();
    fake.localStorage.getItem.mockReturnValue("cached-fingerprint-abc");

    const result = await getOrComputeFingerprint();

    expect(result).toBe("cached-fingerprint-abc");
    // Should NOT have called setItem since we hit the cache
    expect(fake.localStorage.setItem).not.toHaveBeenCalled();
    // Should NOT have computed a new fingerprint either
    expect(fake.localStorage.getItem).toHaveBeenCalledWith(
      "abu_device_fingerprint"
    );
  });

  it("still returns a fingerprint when localStorage.getItem throws", async () => {
    const fake = mockWindow();
    fake.localStorage.getItem.mockImplementation(() => {
      throw new Error("localStorage not available");
    });

    const result = await getOrComputeFingerprint();

    // Should still compute and return a valid fingerprint
    expect(result).toMatch(/^[0-9a-f]{16}$/);
    // Should have attempted to store it (even if that also throws, it's fine)
  });

  it("still returns a fingerprint when localStorage.setItem throws", async () => {
    const fake = mockWindow();
    fake.localStorage.setItem.mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });

    const result = await getOrComputeFingerprint();

    expect(result).toMatch(/^[0-9a-f]{16}$/);
  });

  it("returns consistent results across multiple calls", async () => {
    mockWindow();
    const fp1 = await getOrComputeFingerprint();
    const fp2 = await getOrComputeFingerprint();
    expect(fp1).toBe(fp2);
  });
});
