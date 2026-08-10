import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}));

import { reportPrismaErrorToSentry } from '@/lib/prismaErrorReporter';
import * as Sentry from '@sentry/nextjs';

describe('reportPrismaErrorToSentry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('captures the event message as an exception with the event context', async () => {
    await reportPrismaErrorToSentry({
      message: 'Unique constraint failed on the fields: (`key`)',
      target: 'rateLimitEntry.create',
      timestamp: '2026-08-10T12:00:00.000Z',
    });

    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
    const [error, options] = Sentry.captureException.mock.calls[0];
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('Unique constraint failed on the fields: (`key`)');
    expect(options.extra.prismaTarget).toBe('rateLimitEntry.create');
    expect(options.extra.prismaEventTimestamp).toBe('2026-08-10T12:00:00.000Z');
    expect(options.tags.source).toBe('prisma-event');
  });

  it('captures a fallback message when the event has no message', async () => {
    await reportPrismaErrorToSentry({ target: 'product.create' });

    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
    const [error] = Sentry.captureException.mock.calls[0];
    expect(error.message).toBe('Prisma error event');
  });

  it('tolerates a null/undefined event without throwing', async () => {
    await expect(reportPrismaErrorToSentry(null)).resolves.toBeUndefined();
    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
  });

  it('never rejects when captureException throws — Sentry must not break the request path', async () => {
    Sentry.captureException.mockImplementationOnce(() => {
      throw new Error('sentry boom');
    });
    await expect(reportPrismaErrorToSentry({ message: 'x' })).resolves.toBeUndefined();
  });
});
