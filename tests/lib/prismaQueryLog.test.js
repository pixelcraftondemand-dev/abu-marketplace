import { describe, it, expect } from 'vitest';
import { formatPrismaQueryLog } from '@/lib/prismaQueryLog';

describe('formatPrismaQueryLog', () => {
  it('formats query, params and duration in the [prisma:query] line', () => {
    const line = formatPrismaQueryLog({
      query: 'SELECT * FROM "product" WHERE id = $1',
      params: '["p_123"]',
      duration: 1.234,
    });
    expect(line).toBe(
      '[prisma:query] SELECT * FROM "product" WHERE id = $1 ["p_123"] (1.234ms)'
    );
  });

  it('prints the params JSON string as-is — no double-encoding', () => {
    // Prisma emits params as a JSON string; stringifying it again would
    // produce a quoted literal like "[]" instead of the raw JSON [].
    const line = formatPrismaQueryLog({
      query: 'SELECT $1::int AS n',
      params: '[]',
      duration: 0.5,
    });
    expect(line).toBe('[prisma:query] SELECT $1::int AS n [] (0.5ms)');
    expect(line).not.toContain('"[]"');
  });

  it('keeps quoted params intact when they contain string values', () => {
    const line = formatPrismaQueryLog({
      query: 'SELECT * FROM "user" WHERE id IN ($1, $2)',
      params: '["user_1","user_2"]',
      duration: 2,
    });
    expect(line).toContain('["user_1","user_2"]');
  });

  it('tolerates a missing/malformed event without throwing', () => {
    expect(formatPrismaQueryLog(null)).toBe('[prisma:query]   (0ms)');
    expect(formatPrismaQueryLog(undefined)).toBe('[prisma:query]   (0ms)');
    expect(formatPrismaQueryLog({})).toBe('[prisma:query]   (0ms)');
  });
});
