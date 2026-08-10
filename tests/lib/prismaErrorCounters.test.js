import { describe, it, expect, beforeEach } from 'vitest';
import {
  recordPrismaError,
  recordSuppressedRateLimitP2002,
  getPrismaErrorCounters,
  resetPrismaErrorCounters,
} from '@/lib/prismaErrorCounters';

describe('prismaErrorCounters', () => {
  beforeEach(() => resetPrismaErrorCounters());

  it('starts at zero', () => {
    expect(getPrismaErrorCounters()).toEqual({
      unexpectedPrismaErrors: 0,
      suppressedRateLimitP2002: 0,
    });
  });

  it('counts unexpected and suppressed errors independently', () => {
    recordPrismaError();
    recordPrismaError();
    recordSuppressedRateLimitP2002();
    const c = getPrismaErrorCounters();
    expect(c.unexpectedPrismaErrors).toBe(2);
    expect(c.suppressedRateLimitP2002).toBe(1);
  });

  it('returns a copy — mutating the snapshot does not affect the counters', () => {
    const snap = getPrismaErrorCounters();
    snap.unexpectedPrismaErrors = 99;
    expect(getPrismaErrorCounters().unexpectedPrismaErrors).toBe(0);
  });

  it('reset zeroes previously recorded values', () => {
    recordPrismaError();
    recordSuppressedRateLimitP2002();
    resetPrismaErrorCounters();
    expect(getPrismaErrorCounters()).toEqual({
      unexpectedPrismaErrors: 0,
      suppressedRateLimitP2002: 0,
    });
  });
});
