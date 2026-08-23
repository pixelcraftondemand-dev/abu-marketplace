"use client";

/**
 * Compute a lightweight device fingerprint from stable browser signals.
 *
 * The hash is NOT a unique device identifier — it's a heuristic "is this the
 * same device?" check. It changes when the user switches browsers, devices,
 * or OS, but stays constant across sessions on the same machine.
 *
 * The raw signal is salted with the site origin so fingerprints from different
 * domains never collide if this utility is ever imported elsewhere.
 *
 * Returns a Promise<string> that resolves to a 16-character hex prefix of
 * the SHA-256 hash (64 bits — enough for collision avoidance across a
 * reasonable user base without storing long strings).
 */

const SITE_SALT = "abu-marketplace-device-v1";

function collectSignals() {
  if (typeof window === "undefined") return "server";

  const nav = window.navigator || {};
  const screen = window.screen || {};

  return [
    // Core identity — changes across devices/browsers
    nav.userAgent || "",
    nav.platform || "",
    nav.language || "",

    // Screen — different monitors = different device
    `${screen.width || 0}x${screen.height || 0}`,
    `${screen.colorDepth || 0}`,

    // Timezone — strong signal for device locality
    (() => {
      try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || "";
      } catch {
        return "";
      }
    })(),

    // Hardware concurrency (CPU cores) — rare to change on same device
    `${nav.hardwareConcurrency || 0}`,

    // Device memory (Chrome-only) — different across devices
    `${nav.deviceMemory || 0}`,

    // Touch support — phones vs desktops
    `${nav.maxTouchPoints || 0}`,

    // Prefers-reduced-motion — set at OS level, stable per device
    (() => {
      try {
        return window.matchMedia?.("(prefers-reduced-motion: reduce)")
          ?.matches
          ? "1"
          : "0";
      } catch {
        return "0";
      }
    })(),
  ].join("||");
}

async function sha256hex(input) {
  // Web Crypto API — available in all modern browsers and Edge Runtime
  const data = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Returns a stable device fingerprint hash for the current browser/device.
 * Safe to call from any React component or effect.
 */
export async function getDeviceFingerprint() {
  const signals = collectSignals();
  const fullHash = await sha256hex(`${SITE_SALT}::${signals}`);
  return fullHash.slice(0, 16); // 16 hex chars = 64-bit prefix
}

/**
 * Collects human-readable device metadata to store alongside the fingerprint
 * so alert emails can say what device was used.
 */
export function getDeviceInfo() {
  if (typeof window === "undefined") return { userAgent: "server" };

  const nav = window.navigator || {};
  const screen = window.screen || {};

  return {
    userAgent: nav.userAgent || "unknown",
    platform: nav.platform || "unknown",
    language: nav.language || "unknown",
    screen: `${screen.width || "?"}×${screen.height || "?"}`,
    timezone: (() => {
      try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || "unknown";
      } catch {
        return "unknown";
      }
    })(),
    cores: nav.hardwareConcurrency || "unknown",
    touch: (nav.maxTouchPoints || 0) > 0,
  };
}

const STORAGE_KEY = "abu_device_fingerprint";

/**
 * Persist the fingerprint in localStorage so the server can compare without
 * a round-trip to recompute it. Returns the cached value if available.
 */
export async function getOrComputeFingerprint() {
  if (typeof window === "undefined") return null;

  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) return cached;
  } catch {
    // localStorage unavailable (private browsing, etc.)
  }

  const fp = await getDeviceFingerprint();

  try {
    localStorage.setItem(STORAGE_KEY, fp);
  } catch {
    // quota exceeded or private mode — ignore, will recompute next time
  }

  return fp;
}
