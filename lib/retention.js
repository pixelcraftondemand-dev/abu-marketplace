/**
 * Data retention policy (anti-money-laundering / financial-record keeping).
 *
 * When an account is closed we never hard-delete the underlying records.
 * Account rows, orders, payments, wallet transactions, addresses and ratings
 * are retained so the business can produce complete records to law
 * enforcement and regulators upon lawful request.
 *
 * `dataRetentionUntil` marks the minimum retention deadline
 * (deletedAt + DATA_RETENTION_YEARS). Records are NOT auto-purged after the
 * deadline — the deadline is a compliance marker; disposal is a deliberate,
 * manual decision.
 */

const DEFAULT_RETENTION_YEARS = 5;

/** Number of years account records must be retained after closure. */
export function getRetentionYears() {
  const raw = Number(process.env.DATA_RETENTION_YEARS);
  if (Number.isFinite(raw) && raw > 0 && raw <= 50) return raw;
  return DEFAULT_RETENTION_YEARS;
}

/** Retention deadline for an account closed at `deletedAt`. */
export function getDataRetentionUntil(deletedAt) {
  if (deletedAt === null || deletedAt === undefined) return null;
  const base = deletedAt instanceof Date ? deletedAt : new Date(deletedAt);
  if (Number.isNaN(base.getTime())) return null;
  const until = new Date(base.getTime());
  until.setFullYear(until.getFullYear() + getRetentionYears());
  return until;
}
