/**
 * Formats the dev-mode Prisma query log line, kept as a pure function so the
 * exact output is unit-testable (the handler lives inside lib/prisma.js's
 * guarded one-time registration).
 *
 * Format (matches the detail the old array-form `['query']` config provided):
 *   [prisma:query] <query> <params> (<duration>ms)
 *
 * Important: Prisma emits `params` as a JSON string (e.g. `["1","2"]`), so it
 * is printed AS-IS — stringifying it again would double-encode it
 * (`"["1","2"]"`). Verified against the real query event shape.
 */
export function formatPrismaQueryLog(event) {
  const query = event?.query ?? "";
  const params = event?.params ?? "";
  const duration = event?.duration ?? 0;
  return `[prisma:query] ${query} ${params} (${duration}ms)`;
}
