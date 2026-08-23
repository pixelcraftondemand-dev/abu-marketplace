// Alert engine.
//
// Evaluates computed metrics against configurable thresholds stored in
// AlertConfig. When a threshold is breached, creates an AlertLog entry and
// routes the notification to the appropriate channel based on severity tier.
//
// Thresholds are configurable — stored in the database, not hardcoded.
// Changing a threshold is a row update, not a code change + redeploy.

import prisma from "@/lib/prisma.js";
import { computeAllMetrics } from "./monitoringMetrics.js";
import { routeAlert } from "./alertNotifications.js";

// ─── Default alert configurations ────────────────────────────────────────────
// Seeded on first run if no AlertConfig rows exist.

export const DEFAULT_ALERT_CONFIGS = [
  // Critical: page someone immediately
  {
    metric: "ledger_balance",
    tier: "critical",
    threshold: 0.01,
    operator: ">=",
    windowMin: 5,
    cooldownMin: 15,
  },
  {
    metric: "settlement_failure_rate",
    tier: "critical",
    threshold: 1.0,
    operator: ">=",
    windowMin: 60,
    cooldownMin: 60,
  },
  {
    metric: "payment_success_rate",
    tier: "critical",
    threshold: 50,
    operator: "<=",
    windowMin: 15,
    cooldownMin: 30,
  },

  // High: notify within the hour
  {
    metric: "refund_rate",
    tier: "high",
    threshold: 0.15,
    operator: ">=",
    windowMin: 1440,
    cooldownMin: 360,
  },
  {
    metric: "dispute_rate",
    tier: "high",
    threshold: 0.05,
    operator: ">=",
    windowMin: 1440,
    cooldownMin: 360,
  },
  {
    metric: "fraud_score_distribution",
    tier: "high",
    threshold: 5,
    operator: ">=",
    windowMin: 60,
    cooldownMin: 120,
  },
  {
    metric: "webhook_processing_lag",
    tier: "high",
    threshold: 30000,
    operator: ">=",
    windowMin: 15,
    cooldownMin: 60,
  },

  // Medium: daily digest
  {
    metric: "rate_limit_triggers",
    tier: "medium",
    threshold: 10,
    operator: ">=",
    windowMin: 60,
    cooldownMin: 1440,
  },
  {
    metric: "idempotency_conflict_rate",
    tier: "medium",
    threshold: 0.1,
    operator: ">=",
    windowMin: 60,
    cooldownMin: 1440,
  },
];

// ─── Seed default configs ────────────────────────────────────────────────────

/**
 * Ensure AlertConfig table has default entries. Called once on first cron run.
 * Skips any metrics that already have a config row.
 */
export async function seedAlertConfigs(db) {
  const existing = await db.alertConfig.findMany({ select: { metric: true } });
  const existingMetrics = new Set(existing.map((e) => e.metric));

  const toCreate = DEFAULT_ALERT_CONFIGS.filter(
    (c) => !existingMetrics.has(c.metric)
  );

  if (toCreate.length === 0) return 0;

  await db.alertConfig.createMany({ data: toCreate });
  return toCreate.length;
}

// ─── Evaluate metrics against thresholds ─────────────────────────────────────

/**
 * Compare a metric value against a threshold using the given operator.
 */
function evaluateThreshold(value, operator, threshold) {
  if (value === null || value === undefined) return false;
  switch (operator) {
    case ">=":
      return value >= threshold;
    case "<=":
      return value <= threshold;
    case "==":
      return Math.abs(value - threshold) < 0.001;
    case "abs_diff>":
      return Math.abs(value) >= threshold;
    default:
      return value >= threshold;
  }
}

/**
 * Check if an alert was already fired recently (within cooldown window).
 * Prevents alert spam.
 */
async function isInCooldown(db, metric, cooldownMin) {
  const cooldownAgo = new Date(Date.now() - cooldownMin * 60 * 1000);
  const recent = await db.alertLog.findFirst({
    where: {
      metric,
      firedAt: { gte: cooldownAgo },
    },
    orderBy: { firedAt: "desc" },
    select: { id: true },
  });
  return !!recent;
}

/**
 * Build human-readable message for an alert.
 */
function buildAlertMessage(metric, config, actualValue, metadata) {
  const operator = config.operator || ">=";
  switch (metric) {
    case "ledger_balance":
      return `CRITICAL: Ledger imbalance detected — $${actualValue.toFixed(2)} difference between debits and credits. Money may be lost or double-counted.`;
    case "settlement_failure_rate":
      return `CRITICAL: Settlement batch failure rate is ${(actualValue * 100).toFixed(1)}% — all batches failing.`;
    case "payment_success_rate":
      return `CRITICAL: Payment success rate dropped to ${actualValue.toFixed(1)}% (threshold: ${operator} ${config.threshold}%). Processor integration may be broken.`;
    case "refund_rate":
      return `HIGH: Refund rate is ${(actualValue * 100).toFixed(2)}% (baseline threshold: ${operator} ${(config.threshold * 100).toFixed(1)}%). Check recent refunds.`;
    case "dispute_rate":
      return `HIGH: Dispute/chargeback rate is ${(actualValue * 100).toFixed(2)}% (threshold: ${operator} ${(config.threshold * 100).toFixed(1)}%).`;
    case "fraud_score_distribution":
      return `HIGH: ${actualValue} high/critical risk fraud events detected in the window. Fraud pattern may be shifting.`;
    case "webhook_processing_lag":
      return `HIGH: Webhook processing lag is ${actualValue}ms (threshold: ${operator} ${config.threshold}ms). Events may be piling up.`;
    case "rate_limit_triggers":
      return `MEDIUM: ${actualValue} rate-limit triggers (card testing attempts) detected. Worth monitoring.`;
    case "idempotency_conflict_rate":
      return `MEDIUM: Idempotency conflict rate is ${(actualValue * 100).toFixed(1)}% — possible retry storms or client bug.`;
    default:
      return `Alert: ${metric} = ${actualValue} (threshold: ${operator} ${config.threshold})`;
  }
}

// ─── Main evaluation loop ────────────────────────────────────────────────────

/**
 * Evaluate all enabled alert configs against current metrics.
 * Returns { fired: AlertLog[], evaluated: number, skipped: number }.
 *
 * @param {object} db - Prisma client
 * @param {string} tierFilter - optional: only evaluate configs for this tier ("critical"|"high"|"medium")
 */
export async function evaluateAlerts(db, tierFilter = null) {
  // Seed configs if empty
  await seedAlertConfigs(db);

  // Get all enabled alert configs
  const where = { enabled: true };
  if (tierFilter) where.tier = tierFilter;

  const configs = await db.alertConfig.findMany({ where });

  if (configs.length === 0) {
    return { fired: [], evaluated: 0, skipped: 0 };
  }

  // Compute metrics once (shared across all configs)
  const metrics = await computeAllMetrics(db);

  const fired = [];
  let evaluated = 0;
  let skipped = 0;

  for (const config of configs) {
    evaluated++;

    const metricResult = metrics[config.metric];
    if (!metricResult || metricResult.value === null) {
      skipped++;
      continue;
    }

    const actualValue = metricResult.value;

    // Check threshold
    if (!evaluateThreshold(actualValue, config.operator, config.threshold)) {
      continue;
    }

    // Check cooldown
    if (await isInCooldown(db, config.metric, config.cooldownMin)) {
      skipped++;
      continue;
    }

    // Build alert
    const message = buildAlertMessage(config.metric, config, actualValue, metricResult.metadata);
    const diff = Math.abs(actualValue - config.threshold);

    // Log the alert
    const alertLog = await db.alertLog.create({
      data: {
        metric: config.metric,
        tier: config.tier,
        threshold: config.threshold,
        actualValue,
        diff,
        message,
        context: {
          ...metricResult.metadata,
          configId: config.id,
          operator: config.operator,
        },
      },
    });

    fired.push(alertLog);

    // Route notification
    await routeAlert({
      metric: config.metric,
      tier: config.tier,
      message,
      actualValue,
      threshold: config.threshold,
      context: metricResult.metadata,
    });
  }

  return { fired, evaluated, skipped };
}
