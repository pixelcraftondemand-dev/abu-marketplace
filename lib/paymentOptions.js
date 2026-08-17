// Payment option helpers shared by the checkout UI and the orders route, so a
// rule change (e.g. the free-delivery threshold) lands in exactly one place.

// Canonical flat delivery fee, charged once per order (not per store).
export const DELIVERY_FEE = 5;

// Orders at or above this subtotal (before delivery) ship free. This is the
// same threshold the cart's free-delivery progress bar counts toward.
export const FREE_DELIVERY_THRESHOLD = 50;

/**
 * Whether an order qualifies for free delivery. Plus members always ship free
 * (UI-only signal today — the orders route does not read memberships); the
 * threshold is the shared, backend-enforced rule.
 */
export function isFreeDelivery(subtotal, isMember = false) {
  if (isMember) return true;
  return Number(subtotal) >= FREE_DELIVERY_THRESHOLD;
}

export function isCashOnDeliveryAvailable() {
  return true;
}
