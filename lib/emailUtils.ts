const DEFAULT_BRAND_FROM = "ABU Marketplace <noreply@abumarketplace.shop>";
const VERIFICATION_BRAND_FROM = "ABU Marketplace <noreply@verification.abumarketplace.shop>";

interface FromConfig {
  env: string;
  fallbackEnv?: string;
  defaultFrom?: string;
}

const FROM_CONFIG: Record<string, FromConfig> = {
  // Customer-facing transactional email (order confirmations).
  order: {
    env: "EMAIL_FROM",
    fallbackEnv: "SUPPORT_EMAIL_FROM",
    defaultFrom: DEFAULT_BRAND_FROM,
  },
  // OTP / account verification email from the verification subdomain.
  verification: {
    env: "VERIFICATION_EMAIL_FROM",
    defaultFrom: VERIFICATION_BRAND_FROM,
  },
  // Support escalation sender. Returns "" when unset so callers can fall back
  // to the support destination email.
  support: {
    env: "SUPPORT_EMAIL_FROM",
  },
};

/**
 * Resolves the from-address for a given email purpose.
 * Priority: purpose-specific env var -> fallback env var -> purpose default.
 * Unknown purposes fall back to the "order" config.
 */
export function getEmailFromAddress(purpose: string): string {
  const config = FROM_CONFIG[purpose as keyof typeof FROM_CONFIG] || FROM_CONFIG.order;
  const direct = process.env[config.env];
  if (direct) return direct;
  if (config.fallbackEnv && process.env[config.fallbackEnv]) {
    return process.env[config.fallbackEnv]!;
  }
  return config.defaultFrom || "";
}

/** Escapes user-supplied content for safe embedding in HTML email bodies. */
export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
