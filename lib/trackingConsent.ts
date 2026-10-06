export const TRACKING_CONSENT_KEY = "abu_cookie_consent";

export type TrackingConsentChoice = "accept" | "decline";

export type TrackingConsent = {
  choice: TrackingConsentChoice;
  timestamp: string;
};

function getStorage(): Storage | null {
  if (typeof window !== "undefined" && window.localStorage) {
    return window.localStorage;
  }

  if (typeof globalThis !== "undefined" && "localStorage" in globalThis) {
    return globalThis.localStorage as Storage;
  }

  return null;
}

export function getTrackingConsent(): TrackingConsent | null {
  const storage = getStorage();
  const raw = storage?.getItem(TRACKING_CONSENT_KEY);

  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<TrackingConsent>;
    if (parsed.choice === "accept" || parsed.choice === "decline") {
      return {
        choice: parsed.choice,
        timestamp: parsed.timestamp ?? new Date().toISOString(),
      };
    }
  } catch {
    // Ignore malformed stored values and force re-consent.
  }

  return null;
}

export function setTrackingConsent(choice: TrackingConsentChoice): boolean {
  if (!["accept", "decline"].includes(choice)) {
    return false;
  }

  const storage = getStorage();
  if (!storage) {
    return false;
  }

  storage.setItem(
    TRACKING_CONSENT_KEY,
    JSON.stringify({ choice, timestamp: new Date().toISOString() })
  );

  return true;
}

export function shouldTrackAnalytics(): boolean {
  return getTrackingConsent()?.choice === "accept";
}

export function trackEvent(eventName: string, payload: Record<string, unknown> = {}): boolean {
  if (!shouldTrackAnalytics()) {
    return false;
  }

  if (typeof window !== "undefined" && Array.isArray((window as any).dataLayer)) {
    (window as any).dataLayer.push({
      event: eventName,
      ...payload,
      consented: true,
      timestamp: new Date().toISOString(),
    });
    return true;
  }

  return true;
}
