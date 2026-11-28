import type { VendorStore } from '../types';

/** How long a store keeps the "New" badge after an admin approves it. */
const NEW_STORE_WINDOW_DAYS = 30;

/**
 * True for a shopfront that was approved recently. Seeded directory stores carry no
 * go-live date, so they never show as new; approved submissions get one from the server.
 */
export function isNewStore(store: Pick<VendorStore, 'createdAt'>, now = Date.now()): boolean {
  if (!store.createdAt) return false;
  const approvedAt = Date.parse(store.createdAt);
  if (!Number.isFinite(approvedAt)) return false;
  return now - approvedAt <= NEW_STORE_WINDOW_DAYS * 24 * 60 * 60 * 1000;
}
