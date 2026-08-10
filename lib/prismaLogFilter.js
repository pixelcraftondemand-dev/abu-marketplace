/**
 * True when a Prisma error event is the EXPECTED rate-limit bucket race:
 * two serverless instances both `create` the same `rate_limit_entry` key in
 * the same instant (see checkDb in lib/services/rateLimitStore.js — the
 * P2002 is caught and handled there). Prisma's default `log: ['error']`
 * config prints a full `prisma:error` stack for it on every bucket rollover,
 * which is pure noise. We identify it by the query target + unique-constraint
 * message (the event form carries no `code`/`meta`).
 */
export function isExpectedRateLimitP2002(event) {
  return (
    event?.target === 'rateLimitEntry.create' &&
    typeof event?.message === 'string' &&
    event.message.includes('Unique constraint failed')
  );
}
