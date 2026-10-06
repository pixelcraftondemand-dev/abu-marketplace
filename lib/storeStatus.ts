/**
 * Store status vocabulary and review rules.
 *
 * Client-safe on purpose: the admin review UI and the seller's application page
 * both need these values, and they must never import the service module (which
 * pulls in Prisma). The service re-exports everything from here, so there is
 * exactly one definition of each status and rule.
 */

export const STORE_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
} as const;

export type StoreStatus = (typeof STORE_STATUS)[keyof typeof STORE_STATUS];

export const STORE_STATUSES: StoreStatus[] = [
  STORE_STATUS.PENDING,
  STORE_STATUS.APPROVED,
  STORE_STATUS.REJECTED,
];

export const MIN_REJECTION_REASON_LENGTH = 5;
export const MAX_REJECTION_REASON_LENGTH = 500;

/**
 * One-tap reasons for the admin UI, so writing a useful reason costs no typing
 * — a rejection without a reason is what made resubmission impossible before.
 */
export const STORE_REJECTION_REASONS = [
  "Store name or description is unclear or misleading",
  "Logo or store details look copied from another seller",
  "Contact details are unreachable",
  "Products or category are not allowed on ABU Marketplace",
  "Suspected duplicate or fraudulent application",
] as const;

export function isStoreStatus(value: unknown): value is StoreStatus {
  return typeof value === "string" && (STORE_STATUSES as string[]).includes(value);
}

/** A rejected application may be corrected and sent again. */
export function canResubmit(status: unknown): boolean {
  return status === STORE_STATUS.REJECTED;
}

/** Strip control characters and clamp length; returns null for empty input. */
export function normalizeRejectionReason(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.replace(/[\u0000-\u001F\u007F]/g, "").trim();
  if (!trimmed) return null;
  return trimmed.slice(0, MAX_REJECTION_REASON_LENGTH);
}

/** Seller-facing label for the application page. */
export function getStoreStatusCopy(status: unknown): string {
  if (status === STORE_STATUS.APPROVED) return "Your store is approved and live.";
  if (status === STORE_STATUS.REJECTED) return "Your store request needs changes.";
  if (status === STORE_STATUS.PENDING) return "Your store request is under review.";
  return "Apply to open your store.";
}
