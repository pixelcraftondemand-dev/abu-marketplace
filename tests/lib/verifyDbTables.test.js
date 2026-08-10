import { describe, it, expect, vi } from 'vitest';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { invalidIdentifiers, verifyDbTables, exitCodeFor } from '@/lib/verifyDbTables.mjs';

// Test file lives in tests/lib/, so the CLI is two levels up at the repo root.
const SCRIPT = fileURLToPath(new URL('../../scripts/verify-db-tables.mjs', import.meta.url));

function mockPrisma(handler) {
  return { $queryRaw: vi.fn(handler) };
}

describe('verifyDbTables (classification)', () => {
  it('records a present table with its resolved regclass name', async () => {
    const prisma = mockPrisma(() => Promise.resolve([{ tbl: 'rate_limit_entry' }]));
    const result = await verifyDbTables(prisma, ['rate_limit_entry']);
    expect(result.present).toEqual([{ table: 'rate_limit_entry', name: 'rate_limit_entry' }]);
    expect(result.missing).toEqual([]);
    expect(result.errors).toEqual([]);
    expect(exitCodeFor(result)).toBe(0);
  });

  it('classifies a null regclass as MISSING, not an error', async () => {
    const prisma = mockPrisma(() => Promise.resolve([{ tbl: null }]));
    const result = await verifyDbTables(prisma, ['table_that_never_existed']);
    expect(result.missing).toEqual(['table_that_never_existed']);
    expect(result.errors).toEqual([]);
    expect(exitCodeFor(result)).toBe(1);
  });

  it('classifies a rejected query as a CONNECTION/query error, NOT missing — the core distinction', async () => {
    const prisma = mockPrisma(() =>
      Promise.reject(new Error("Can't reach database server\n  at connect (127.0.0.1:5432)"))
    );
    const result = await verifyDbTables(prisma, ['rate_limit_entry']);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("Can't reach database server");
    expect(result.missing).toEqual([]);
    expect(exitCodeFor(result)).toBe(1);
  });

  it('handles a mixed run: present + missing + unreachable', async () => {
    const calls = [
      Promise.resolve([{ tbl: 'user' }]),
      Promise.resolve([{ tbl: null }]),
      Promise.reject(new Error('ECONNREFUSED')),
    ];
    const prisma = mockPrisma(() => calls.shift());
    const result = await verifyDbTables(prisma, ['user', 'ghost_table', 'another']);
    expect(result.present).toEqual([{ table: 'user', name: 'user' }]);
    expect(result.missing).toEqual(['ghost_table']);
    expect(result.errors).toEqual(['another: ECONNREFUSED']);
    expect(exitCodeFor(result)).toBe(1);
  });

  it('keeps only the first line of a multi-line error message', async () => {
    const prisma = mockPrisma(() => Promise.reject(new Error('line one\nline two\nline three')));
    const result = await verifyDbTables(prisma, ['x']);
    expect(result.errors).toEqual(['x: line one']);
  });
});

describe('invalidIdentifiers (the CLI exit-2 path)', () => {
  it('rejects injection-style and non-lowercase identifiers', () => {
    expect(invalidIdentifiers(['x; DROP TABLE user'])).toEqual(['x; DROP TABLE user']);
    expect(invalidIdentifiers(['UPPER', 'with-dash', 'ok_table', 'rate_limit_entry'])).toEqual([
      'UPPER',
      'with-dash',
    ]);
  });

  it('accepts plain lowercase snake_case names and empty/undefined lists', () => {
    expect(invalidIdentifiers(['rate_limit_entry', 'user', 'a1'])).toEqual([]);
    expect(invalidIdentifiers([])).toEqual([]);
    expect(invalidIdentifiers(undefined)).toEqual([]);
  });
});

describe('exitCodeFor', () => {
  it('maps to 0 only when everything is present and verifiable', () => {
    expect(exitCodeFor({ missing: [], errors: [] })).toBe(0);
    expect(exitCodeFor({ missing: ['a'], errors: [] })).toBe(1);
    expect(exitCodeFor({ missing: [], errors: ['a: boom'] })).toBe(1);
    expect(exitCodeFor({ missing: ['a'], errors: ['b: boom'] })).toBe(1);
  });
});

describe('CLI exit codes (real subprocess, no database)', () => {
  it('exits 2 on a usage error (no args)', () => {
    try {
      execFileSync(process.execPath, [SCRIPT], { encoding: 'utf8' });
      expect.unreachable('should have exited nonzero');
    } catch (err) {
      expect(err.status).toBe(2);
      expect(err.stderr).toContain('usage:');
    }
  });

  it('exits 2 on an invalid table identifier', () => {
    try {
      execFileSync(process.execPath, [SCRIPT, 'x; DROP TABLE user'], { encoding: 'utf8' });
      expect.unreachable('should have exited nonzero');
    } catch (err) {
      expect(err.status).toBe(2);
      expect(err.stderr).toContain('Invalid table identifier(s)');
    }
  });

  it('exits 1 on a connection failure (bad DATABASE_URL) with the connection/query headline, NOT "missing"', () => {
    try {
      execFileSync(process.execPath, [SCRIPT, 'rate_limit_entry'], {
        encoding: 'utf8',
        timeout: 30000,
        env: {
          ...process.env,
          DATABASE_URL: 'postgresql://nope:nope@127.0.0.1:1/nope?connect_timeout=1',
        },
      });
      expect.unreachable('should have exited nonzero');
    } catch (err) {
      expect(err.status).toBe(1);
      expect(err.stderr).toContain('could not verify table(s) against the target database');
      expect(err.stderr).not.toContain('required table(s) missing');
    }
  });
});
