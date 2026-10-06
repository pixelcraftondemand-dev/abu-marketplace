export type FeatureFlagName = "OTP_PROVIDER" | "PAYMENTS_ONLINE_ENABLED" | "OLD_LOGIN_FALLBACK";

const FEATURE_FLAG_DEFAULTS: Record<FeatureFlagName, string> = {
  OTP_PROVIDER: "mock",
  PAYMENTS_ONLINE_ENABLED: "false",
  OLD_LOGIN_FALLBACK: "true",
};

export function readFeatureFlag(flag: FeatureFlagName, fallback?: string): string {
  const raw = process.env[flag] ?? fallback ?? FEATURE_FLAG_DEFAULTS[flag];
  return String(raw).trim();
}

export function isFeatureEnabled(flag: FeatureFlagName, fallback = false): boolean {
  const value = readFeatureFlag(flag, FEATURE_FLAG_DEFAULTS[flag] ?? (fallback ? "true" : "false")).toLowerCase();

  if (flag === "OTP_PROVIDER") {
    return value !== "" && value !== "mock" && value !== "off" && value !== "false";
  }

  if (flag === "OLD_LOGIN_FALLBACK") {
    return !["0", "false", "off", "no"].includes(value);
  }

  return ["1", "true", "yes", "on"].includes(value);
}

export function getFeatureFlag(flag: FeatureFlagName) {
  return {
    name: flag,
    value: readFeatureFlag(flag),
    enabled: isFeatureEnabled(flag),
  };
}
