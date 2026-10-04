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
