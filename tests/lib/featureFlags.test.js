import { describe, expect, it, afterEach } from "vitest";
import { getFeatureFlag, isFeatureEnabled, readFeatureFlag } from "@/lib/featureFlags";

describe("featureFlags", () => {
  afterEach(() => {
    delete process.env.OTP_PROVIDER;
    delete process.env.PAYMENTS_ONLINE_ENABLED;
    delete process.env.OLD_LOGIN_FALLBACK;
  });

  it("uses safe defaults when no env is set", () => {
    expect(readFeatureFlag("OTP_PROVIDER")).toBe("mock");
    expect(readFeatureFlag("PAYMENTS_ONLINE_ENABLED")).toBe("false");
    expect(readFeatureFlag("OLD_LOGIN_FALLBACK")).toBe("true");
    expect(isFeatureEnabled("OTP_PROVIDER")).toBe(false);
    expect(isFeatureEnabled("PAYMENTS_ONLINE_ENABLED")).toBe(false);
    expect(isFeatureEnabled("OLD_LOGIN_FALLBACK")).toBe(true);
  });

  it("reads explicit env values and resolves booleans correctly", () => {
    process.env.OTP_PROVIDER = "whatsapp";
    process.env.PAYMENTS_ONLINE_ENABLED = "true";
    process.env.OLD_LOGIN_FALLBACK = "false";

    expect(readFeatureFlag("OTP_PROVIDER")).toBe("whatsapp");
    expect(readFeatureFlag("PAYMENTS_ONLINE_ENABLED")).toBe("true");
    expect(readFeatureFlag("OLD_LOGIN_FALLBACK")).toBe("false");
    expect(isFeatureEnabled("OTP_PROVIDER")).toBe(true);
    expect(isFeatureEnabled("PAYMENTS_ONLINE_ENABLED")).toBe(true);
    expect(isFeatureEnabled("OLD_LOGIN_FALLBACK")).toBe(false);
    expect(getFeatureFlag("OTP_PROVIDER")).toMatchObject({ name: "OTP_PROVIDER", value: "whatsapp" });
  });
});
