import { describe, it, expect, beforeEach } from "vitest";
import { getTrackingConsent, setTrackingConsent, shouldTrackAnalytics, trackEvent } from "@/lib/trackingConsent";

function makeStorage() {
  const map = new Map();
  return {
    getItem(key) {
      return map.has(key) ? map.get(key) : null;
    },
    setItem(key, value) {
      map.set(key, String(value));
    },
    removeItem(key) {
      map.delete(key);
    },
    clear() {
      map.clear();
    },
  };
}

describe("tracking consent", () => {
  beforeEach(() => {
    globalThis.localStorage = makeStorage();
  });

  it("blocks analytics until a user explicitly accepts", () => {
    expect(getTrackingConsent()).toBeNull();
    expect(shouldTrackAnalytics()).toBe(false);
    expect(trackEvent("page_view")).toBe(false);
  });

  it("allows tracking only after consent is accepted", () => {
    setTrackingConsent("accept");

    expect(getTrackingConsent()).toMatchObject({ choice: "accept" });
    expect(shouldTrackAnalytics()).toBe(true);
    expect(trackEvent("checkout_started")).toBe(true);
  });

  it("refuses tracking after a decline decision", () => {
    setTrackingConsent("decline");

    expect(shouldTrackAnalytics()).toBe(false);
    expect(trackEvent("product_view")).toBe(false);
  });
});
