import { describe, expect, it, vi, beforeEach } from "vitest";

// ─── Mock prisma ─────────────────────────────────────────────────────────────

function makeDb() {
  return {
    pspTransaction: {
      count: vi.fn().mockResolvedValue(0),
      findMany: vi.fn().mockResolvedValue([]),
      aggregate: vi.fn().mockResolvedValue({ _sum: { capturedAmount: 0 } }),
    },
    refund: {
      count: vi.fn().mockResolvedValue(0),
      aggregate: vi.fn().mockResolvedValue({ _sum: { amount: 0 } }),
    },
    dispute: {
      count: vi.fn().mockResolvedValue(0),
    },
    fraudEvent: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    rateLimitEntry: {
      count: vi.fn().mockResolvedValue(0),
    },
    ledgerEntry: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    settlementBatch: {
      count: vi.fn().mockResolvedValue(0),
    },
    idempotencyKeyRecord: {
      count: vi.fn().mockResolvedValue(0),
    },
  };
}

vi.mock("@/lib/prisma", () => ({ default: {} }));

import {
  paymentSuccessRate,
  refundRate,
  disputeRate,
  fraudScoreDistribution,
  rateLimitTriggerCount,
  ledgerBalanceCheck,
  settlementFailureRate,
  idempotencyConflictRate,
} from "@/lib/services/monitoringMetrics.js";

beforeEach(() => {
  vi.resetAllMocks();
});

describe("monitoringMetrics", () => {
  describe("paymentSuccessRate", () => {
    it("returns 100% when no transactions exist", async () => {
      const db = makeDb();
      db.pspTransaction.count.mockResolvedValue(0);
      const result = await paymentSuccessRate(db);
      expect(result.value).toBe(100);
    });

    it("computes correct ratio of captured to attempted", async () => {
      const db = makeDb();
      // paymentSuccessRate calls count() 3 times:
      // 1. attempted (all), 2. captured, 3. failed
      db.pspTransaction.count
        .mockResolvedValueOnce(10)  // attempted
        .mockResolvedValueOnce(7)   // captured
        .mockResolvedValueOnce(3);  // failed
      db.pspTransaction.findMany.mockResolvedValue([
        { failureReason: "declined" },
        { failureReason: "declined" },
        { failureReason: "timeout" },
      ]);

      const result = await paymentSuccessRate(db);
      expect(result.value).toBe(70);
      expect(result.metadata.captured).toBe(7);
      expect(result.metadata.attempted).toBe(10);
      expect(result.metadata.byReason).toEqual({ declined: 2, timeout: 1 });
    });
  });

  describe("refundRate", () => {
    it("returns 0 when no captures exist", async () => {
      const db = makeDb();
      db.refund.count.mockResolvedValue(0);
      db.refund.aggregate.mockResolvedValue({ _sum: { amount: 0 } });
      db.pspTransaction.count.mockResolvedValue(0);
      db.pspTransaction.aggregate.mockResolvedValue({ _sum: { capturedAmount: 0 } });

      const result = await refundRate(db);
      expect(result.value).toBe(0);
    });

    it("computes refund-to-capture ratio", async () => {
      const db = makeDb();
      db.refund.count.mockResolvedValue(2);
      db.refund.aggregate.mockResolvedValue({ _sum: { amount: 100 } });
      db.pspTransaction.count.mockResolvedValue(20);
      db.pspTransaction.aggregate.mockResolvedValue({ _sum: { capturedAmount: 2000 } });

      const result = await refundRate(db);
      expect(result.value).toBe(0.05);
      expect(result.metadata.refundAmount).toBe(100);
      expect(result.metadata.captureAmount).toBe(2000);
    });
  });

  describe("disputeRate", () => {
    it("returns 0 when no captures exist", async () => {
      const db = makeDb();
      db.dispute.count.mockResolvedValue(0);
      db.pspTransaction.count.mockResolvedValue(0);

      const result = await disputeRate(db);
      expect(result.value).toBe(0);
    });

    it("computes dispute-to-capture ratio", async () => {
      const db = makeDb();
      db.dispute.count.mockResolvedValue(1);
      db.pspTransaction.count.mockResolvedValue(50);

      const result = await disputeRate(db);
      expect(result.value).toBe(0.02);
    });
  });

  describe("fraudScoreDistribution", () => {
    it("categorizes events into risk bands", async () => {
      const db = makeDb();
      db.fraudEvent.findMany.mockResolvedValue([
        { riskScore: 0 },
        { riskScore: 10 },
        { riskScore: 30 },
        { riskScore: 60 },
        { riskScore: 85 },
        { riskScore: 95 },
      ]);

      const result = await fraudScoreDistribution(db);
      expect(result.value).toBe(3); // high + critical
      expect(result.metadata.distribution).toEqual({
        low: 1,
        medium: 2,
        high: 1,
        critical: 2,
      });
      expect(result.metadata.total).toBe(6);
    });

    it("returns 0 when no events exist", async () => {
      const db = makeDb();
      db.fraudEvent.findMany.mockResolvedValue([]);
      const result = await fraudScoreDistribution(db);
      expect(result.value).toBe(0);
      expect(result.metadata.distribution).toEqual({ low: 0, medium: 0, high: 0, critical: 0 });
    });
  });

  describe("rateLimitTriggerCount", () => {
    it("counts rate limit entries with count >= 3", async () => {
      const db = makeDb();
      db.rateLimitEntry.count.mockResolvedValue(5);
      const result = await rateLimitTriggerCount(db);
      expect(result.value).toBe(5);
    });
  });

  describe("ledgerBalanceCheck", () => {
    it("returns balanced when debits = credits", async () => {
      const db = makeDb();
      db.ledgerEntry.findMany.mockResolvedValue([
        { debit: 100, credit: 0 },
        { debit: 0, credit: 100 },
      ]);

      const result = await ledgerBalanceCheck(db);
      expect(result.value).toBe(0);
      expect(result.metadata.balanced).toBe(true);
      expect(result.metadata.totalDebit).toBe(100);
      expect(result.metadata.totalCredit).toBe(100);
    });

    it("detects imbalance", async () => {
      const db = makeDb();
      db.ledgerEntry.findMany.mockResolvedValue([
        { debit: 100, credit: 0 },
        { debit: 0, credit: 95 },
      ]);

      const result = await ledgerBalanceCheck(db);
      expect(result.value).toBe(5);
      expect(result.metadata.balanced).toBe(false);
    });
  });

  describe("settlementFailureRate", () => {
    it("returns 0 when no batches exist", async () => {
      const db = makeDb();
      db.settlementBatch.count.mockResolvedValue(0);
      const result = await settlementFailureRate(db);
      expect(result.value).toBe(0);
    });

    it("computes failure ratio", async () => {
      const db = makeDb();
      db.settlementBatch.count
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(2); // failed

      const result = await settlementFailureRate(db);
      expect(result.value).toBe(0.2);
    });
  });

  describe("idempotencyConflictRate", () => {
    it("returns 0 when no keys exist", async () => {
      const db = makeDb();
      db.idempotencyKeyRecord.count.mockResolvedValue(0);
      const result = await idempotencyConflictRate(db);
      expect(result.value).toBe(0);
    });

    it("computes conflict ratio", async () => {
      const db = makeDb();
      db.idempotencyKeyRecord.count
        .mockResolvedValueOnce(3)  // conflicts
        .mockResolvedValueOnce(30); // total

      const result = await idempotencyConflictRate(db);
      expect(result.value).toBe(0.1);
    });
  });
});
