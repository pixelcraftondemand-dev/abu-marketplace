// Vendor WhatsApp contact helpers for the Sierra Leone pilot.
//
// Vendors store their number as international digits with no plus or spaces
// (e.g. "23276123456"). These helpers normalise raw user input and build wa.me
// deep links for the storefront and product pages.

export const DEFAULT_COUNTRY_CODE = "232"; // Sierra Leone

/**
 * Normalise a vendor-supplied WhatsApp number to international digits.
 * Accepts local and international spellings, e.g. "+232 76 123 456",
 * "076 123 456", "23276123456", "00 232 76 123 456".
 * Returns null when there are no usable digits.
 */
export function normalizeWhatsAppNumber(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;
  let digits = String(raw).replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("00")) digits = digits.slice(2);
  // Local Sierra Leone format (0XXXXXXXX) → international.
  if (digits.startsWith("0")) digits = DEFAULT_COUNTRY_CODE + digits.slice(1);
  return digits;
}

/** True when the value normalises to a plausible international number. */
export function isValidWhatsAppNumber(raw: unknown): boolean {
  const digits = normalizeWhatsAppNumber(raw);
  if (!digits) return false;
  return digits.length >= 8 && digits.length <= 15;
}

/** Build a wa.me deep link, or null when the number is unusable. */
export function buildWhatsAppLink(raw: unknown, message?: string): string | null {
  const digits = normalizeWhatsAppNumber(raw);
  if (!digits || digits.length < 8 || digits.length > 15) return null;
  const base = `https://wa.me/${digits}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

/**
 * The marketplace's own WhatsApp line (support + "arrange payment" handoff).
 * Public by design — BuyNow SL publishes theirs in the footer — so it lives in
 * a NEXT_PUBLIC_ var and the site-wide bubble simply hides when it is unset.
 */
export function getSupportWhatsAppNumber(): string {
  return process.env.NEXT_PUBLIC_WHATSAPP_SUPPORT_NUMBER || "";
}

/** wa.me link to the marketplace line, or null when it is not configured. */
export function buildSupportWhatsAppLink(message?: string): string | null {
  return buildWhatsAppLink(getSupportWhatsAppNumber(), message);
}

/** Deep link to the configured Meta In-App Signup opt-in flow. */
export function buildWhatsAppSignupLink(): string | null {
  const signupId = String(process.env.NEXT_PUBLIC_WHATSAPP_SIGNUP_ID || "").trim();
  const phoneNumber = normalizeWhatsAppNumber(getSupportWhatsAppNumber());
  if (!/^\d{8,20}$/.test(signupId) || !phoneNumber || phoneNumber.length > 15) {
    return null;
  }
  return `https://wa.me/${phoneNumber}/signup/${signupId}`;
}

/**
 * Opening message for the site-wide bubble — short, and tells support what to
 * reply with (availability + how to pay).
 */
export function buildSupportMessage(context?: { productName?: string; url?: string }): string {
  if (context?.productName) {
    const lines = [
      `Hi ABU Marketplace, I have a question about "${context.productName}".`,
    ];
    if (context.url) lines.push(context.url);
    lines.push("Please tell me if it's available and how to pay.");
    return lines.join("\n");
  }
  return "Hi ABU Marketplace, I'd like help with an order or a payment.";
}

/**
 * Prefilled text a buyer sends when they want to close an order on WhatsApp.
 * Mirrors the per-product message already used on the product page so the
 * seller sees the same shape whether the buyer taps the card or the bubble.
 */
export function buildOrderMessage({
  productName,
  storeName,
  priceLabel,
  url,
}: {
  productName?: string;
  storeName?: string;
  priceLabel?: string;
  url?: string;
}): string {
  const lines = ["Hi ABU Marketplace, I'd like to order:"];
  if (productName) {
    const price = priceLabel ? ` — ${priceLabel}` : "";
    lines.push(`• ${productName}${price}`);
  }
  if (storeName) lines.push(`From: ${storeName}`);
  if (url) lines.push(url);
  lines.push("Please confirm availability and how to pay.");
  return lines.join("\n");
}
