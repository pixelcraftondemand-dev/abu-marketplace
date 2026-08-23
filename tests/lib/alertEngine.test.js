import { describe, expect, it, vi, beforeEach } from "vitest";

// ─── Mock prisma ─────────────────────────────────────────────────────────────

function makeDb() {
  return {
    alertConfig: {
      findMany: vi.fn().mockResolvedValue([]),
      createMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    alertLog: {
      create: vi.fn(),
      findFirst: vi.fn(),
    },
    // All the metric tables — return empty/zero by default
    pspTransaction: {
      count: vi.fn().mockResolvedValue(0),
      findMany: vi.fn().mockResolvedValue([]),
      aggregate: vi.fn().mockResolvedValue({ _sum: { capturedAmount: 0 } }),
    },
    refund: {
      count: vi.fn().mockResolvedValue(0),
      aggregate: vi.fn().mockResolvedValue({ _sum: { amount: 0 } }),
    },
    dispute: { count: vi.fn().mockResolvedValue(0) },
    fraudEvent: { findMany: vi.fn().mockResolvedValue([]) },
    rateLimitEntry: { count: vi.fn().mockResolvedValue(0) },
    ledgerEntry: { findMany: vi.fn().mockResolvedValue([]) },
    settlementBatch: { count: vi.fn().mockResolvedValue(0) },
    webhookEvent: { findMany: vi.fn().mockResolvedValue([]) },
    auditLog: { findMany: vi.fn().mockResolvedValue([]) },
    idempotencyKeyRecord: { count: vi.fn().mockResolvedValue(0) },
  };
}

vi.mock("@/lib/prisma", () => ({ default: {} }));
vi.mock("@/lib/services/alertNotifications.js", () => ({
  routeAlert: vi.fn().mockResolvedValue(undefined),
}));

import { evaluateAlerts } from "@/lib/services/alertEngine.js";
import { routeAlert } from "@/lib/services/alertNotifications.js";

beforeEach(() => {
  vi.resetAllMocks();
});

describe("alertEngine", () => {
  describe("evaluateAlerts", () => {
    it("returns empty when no configs exist", async () => {
      const db = makeDb();
      // findMany returns [] for seed check AND [] for evaluation
      db.alertConfig.findMany.mockResolvedValue([]);

      const result = await evaluateAlerts(db);
      expect(result.fired).toEqual([]);
      expect(result.evaluated).toBe(0);
    });

    it("does not fire when metric is within threshold", async () => {
      const db = makeDb();
      const configs = [
        { id: "cfg_1", metric: "payment_success_rate", tier: "critical", threshold: 50, operator: "<=", enabled: true, cooldownMin: 30 },
      ];
      // First call = seed check (returns existing), second call = evaluation
      db.alertConfig.findMany.mockResolvedValueOnce(configs).mockResolvedValueOnce(configs);

      // Mock healthy metrics: 95% success rate
      db.pspTransaction.count
        .mockResolvedValueOnce(100) // attempted
        .mockResolvedValueOnce(95)  // captured
        .mockResolvedValueOnce(5);  // failed
      db.pspTransaction.findMany.mockResolvedValue([]);

      const result = await evaluateAlerts(db, "critical");
      expect(result.fired).toHaveLength(0);
      expect(routeAlert).not.toHaveBeenCalled();
    });

    it("fires when metric breaches threshold", async () => {
      const db = makeDb();
      const configs = [
        { id: "cfg_1", metric: "payment_success_rate", tier: "critical", threshold: 50, operator: "<=", enabled: true, cooldownMin: 30 },
      ];
      db.alertConfig.findMany.mockResolvedValueOnce(configs).mockResolvedValueOnce(configs);

      // Mock degraded metrics: 30% success rate
      db.pspTransaction.count
        .mockResolvedValueOnce(100) // attempted
        .mockResolvedValueOnce(30)  // captured
        .mockResolvedValueOnce(70); // failed
      db.pspTransaction.findMany.mockResolvedValue([]);

      // No cooldown
      db.alertLog.findFirst.mockResolvedValue(null);
      db.alertLog.create.mockResolvedValue({ id: "alert_1" });

      const result = await evaluateAlerts(db, "critical");
      expect(result.fired).toHaveLength(1);
      expect(routeAlert).toHaveBeenCalledWith(
        expect.objectContaining({
          metric: "payment_success_rate",
          tier: "critical",
        })
      );
    });

    it("respects cooldown period", async () => {
      const db = makeDb();
      const configs = [
        { id: "cfg_1", metric: "payment_success_rate", tier: "critical", threshold: 50, operator: "<=", enabled: true, cooldownMin: 30 },
      ];
      db.alertConfig.findMany.mockResolvedValueOnce(configs).mockResolvedValueOnce(configs);

      // Degraded metrics
      db.pspTransaction.count
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(30)
        .mockResolvedValueOnce(70);
      db.pspTransaction.findMany.mockResolvedValue([]);

      // Alert already fired recently (within cooldown)
      db.alertLog.findFirst.mockResolvedValue({ id: "recent_alert" });

      const result = await evaluateAlerts(db, "critical");
      expect(result.fired).toHaveLength(0);
      expect(result.skipped).toBe(1);
    });

    it("fires ledger imbalance as critical", async () => {
      const db = makeDb();
      const configs = [
        { id: "cfg_1", metric: "ledger_balance", tier: "critical", threshold: 0.01, operator: ">=", enabled: true, cooldownMin: 15 },
      ];
      db.alertConfig.findMany.mockResolvedValueOnce(configs).mockResolvedValueOnce(configs);

      // Imbalanced ledger
      db.ledgerEntry.findMany.mockResolvedValue([
        { debit: 100, credit: 0 },
        { debit: 0, credit: 90 },
      ]);

      db.alertLog.findFirst.mockResolvedValue(null);
      db.alertLog.create.mockResolvedValue({ id: "alert_2", metric: "ledger_balance", tier: "critical", threshold: 0.01, actualValue: 10, message: "test" });

      const result = await evaluateAlerts(db, "critical");
      expect(result.fired).toHaveLength(1);
      expect(result.fired[0].actualValue).toBe(10);
    });

    it("only evaluates configs matching the tier filter", async () => {
      const db = makeDb();
      const configs = [
        { id: "cfg_critical", metric: "ledger_balance", tier: "critical", threshold: 0.01, operator: ">=", enabled: true, cooldownMin: 15 },
        { id: "cfg_high", metric: "refund_rate", tier: "high", threshold: 0.15, operator: ">=", enabled: true, cooldownMin: 360 },
      ];
      // First call (seed check) returns both, second call (evaluation) returns only critical
      const criticalOnly = [configs[0]];
      db.alertConfig.findMany.mockResolvedValueOnce(configs).mockResolvedValueOnce(criticalOnly);

      // Balanced ledger (no trigger)
      db.ledgerEntry.findMany.mockResolvedValue([
        { debit: 100, credit: 0 },
        { debit: 0, credit: 100 },
      ]);

      const result = await evaluateAlerts(db, "critical");
      // Only ledger_balance should be evaluated (refund_rate filtered out by tier)
      expect(result.evaluated).toBe(1);
    });

    it("seeds default configs on first run when table is empty", async () => {
      const db = makeDb();
      // First findMany (seed check) returns empty, triggering createMany
      // Second findMany (evaluation) returns the seeded configs
      const seededConfigs = [
        { id: "cfg_1", metric: "ledger_balance", tier: "critical", threshold: 0.01, operator: ">=", enabled: true, cooldownMin: 15, windowMin: 5 },
      ];
      db.alertConfig.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce(seededConfigs);
      db.alertConfig.createMany.mockResolvedValue({ count: 1 });

      await evaluateAlerts(db);
      expect(db.alertConfig.createMany).toHaveBeenCalled();
    });
  });

  describe("threshold evaluation", () => {
    it("fires when value exceeds >= threshold, does not fire when below", async () => {
      const db = makeDb();
      const configs = [
        { id: "cfg_1", metric: "rate_limit_triggers", tier: "medium", threshold: 10, operator: ">=", enabled: true, cooldownMin: 1440 },
      ];
      db.alertConfig.findMany.mockResolvedValueOnce(configs).mockResolvedValueOnce(configs);

      // 5 triggers — below threshold
      db.rateLimitEntry.count.mockResolvedValue(5);
      db.alertLog.findFirst.mockResolvedValue(null);

      const result = await evaluateAlerts(db, "medium");
      expect(result.fired).toHaveLength(0);

      // 15 triggers — above threshold
      db.alertConfig.findMany.mockResolvedValueOnce(configs).mockResolvedValueOnce(configs);
      db.rateLimitEntry.count.mockResolvedValue(15);
      const result2 = await evaluateAlerts(db, "medium");
      expect(result2.fired).toHaveLength(1);
    });
  });
});
