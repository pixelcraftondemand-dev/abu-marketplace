// Alert engine.
import { PrismaClient } from "@prisma/client";
import { computeAllMetrics } from "./monitoringMetrics";
import { routeAlert } from "./alertNotifications";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PrismaDb = PrismaClient | any;

interface AlertConfig {
  id: string;
  metric: string;
  tier: string;
  threshold: number;
  operator: string;
  enabled: boolean;
  cooldownMin: number;
}

export const DEFAULT_ALERT_CONFIGS: Omit<AlertConfig, "id">[] = [
  { metric: "ledger_balance", tier: "critical", threshold: 0.01, operator: ">=", enabled: true, cooldownMin: 15 },
  { metric: "settlement_failure_rate", tier: "critical", threshold: 1.0, operator: ">=", enabled: true, cooldownMin: 60 },
  { metric: "payment_success_rate", tier: "critical", threshold: 50, operator: "<=", enabled: true, cooldownMin: 30 },
  { metric: "refund_rate", tier: "high", threshold: 0.15, operator: ">=", enabled: true, cooldownMin: 360 },
  { metric: "dispute_rate", tier: "high", threshold: 0.05, operator: ">=", enabled: true, cooldownMin: 360 },
  { metric: "fraud_score_distribution", tier: "high", threshold: 5, operator: ">=", enabled: true, cooldownMin: 120 },
  { metric: "webhook_processing_lag", tier: "high", threshold: 30000, operator: ">=", enabled: true, cooldownMin: 60 },
  { metric: "rate_limit_triggers", tier: "medium", threshold: 10, operator: ">=", enabled: true, cooldownMin: 1440 },
  { metric: "idempotency_conflict_rate", tier: "medium", threshold: 0.1, operator: ">=", enabled: true, cooldownMin: 1440 },
];

export async function seedAlertConfigs(db: PrismaDb): Promise<number> {
  const existing = await db.alertConfig.findMany({ select: { metric: true } });
  const existingMetrics = new Set(existing.map((e: { metric: string }) => e.metric));
  const toCreate = DEFAULT_ALERT_CONFIGS.filter((c) => !existingMetrics.has(c.metric));
  if (toCreate.length === 0) return 0;
  await db.alertConfig.createMany({ data: toCreate });
  return toCreate.length;
}

function evaluateThreshold(value: number, operator: string, threshold: number): boolean {
  if (value === null || value === undefined) return false;
  switch (operator) {
    case ">=": return value >= threshold;
    case "<=": return value <= threshold;
    case "==": return Math.abs(value - threshold) < 0.001;
    case "abs_diff>": return Math.abs(value) >= threshold;
    default: return value >= threshold;
  }
}

async function isInCooldown(db: PrismaDb, metric: string, cooldownMin: number): Promise<boolean> {
  const cooldownAgo = new Date(Date.now() - cooldownMin * 60 * 1000);
  const recent = await db.alertLog.findFirst({ where: { metric, firedAt: { gte: cooldownAgo } }, orderBy: { firedAt: "desc" }, select: { id: true } });
  return !!recent;
}

function buildAlertMessage(metric: string, config: AlertConfig, actualValue: number): string {
  const operator = config.operator || ">=";
  switch (metric) {
    case "ledger_balance": return `CRITICAL: Ledger imbalance detected — $${actualValue.toFixed(2)} difference between debits and credits.`;
    case "settlement_failure_rate": return `CRITICAL: Settlement batch failure rate is ${(actualValue * 100).toFixed(1)}%.`;
    case "payment_success_rate": return `CRITICAL: Payment success rate dropped to ${actualValue.toFixed(1)}%.`;
    case "refund_rate": return `HIGH: Refund rate is ${(actualValue * 100).toFixed(2)}%.`;
    case "dispute_rate": return `HIGH: Dispute rate is ${(actualValue * 100).toFixed(2)}%.`;
    case "fraud_score_distribution": return `HIGH: ${actualValue} high/critical fraud events detected.`;
    case "webhook_processing_lag": return `HIGH: Webhook processing lag is ${actualValue}ms.`;
    case "rate_limit_triggers": return `MEDIUM: ${actualValue} rate-limit triggers detected.`;
    case "idempotency_conflict_rate": return `MEDIUM: Idempotency conflict rate is ${(actualValue * 100).toFixed(1)}%.`;
    default: return `Alert: ${metric} = ${actualValue} (threshold: ${operator} ${config.threshold})`;
  }
}

interface EvaluateResult {
  fired: unknown[];
  evaluated: number;
  skipped: number;
}

export async function evaluateAlerts(db: PrismaDb, tierFilter: string | null = null): Promise<EvaluateResult> {
  await seedAlertConfigs(db);
  const where: Record<string, unknown> = { enabled: true };
  if (tierFilter) where.tier = tierFilter;
  const configs: AlertConfig[] = await db.alertConfig.findMany({ where });
  if (configs.length === 0) return { fired: [], evaluated: 0, skipped: 0 };
  const metrics = await computeAllMetrics(db);
  const fired: unknown[] = [];
  let evaluated = 0;
  let skipped = 0;
  for (const config of configs) {
    evaluated++;
    const metricResult = metrics[config.metric];
    if (!metricResult || metricResult.value === null) { skipped++; continue; }
    const actualValue = metricResult.value;
    if (!evaluateThreshold(actualValue, config.operator, config.threshold)) continue;
    if (await isInCooldown(db, config.metric, config.cooldownMin)) { skipped++; continue; }
    const message = buildAlertMessage(config.metric, config, actualValue);
    const diff = Math.abs(actualValue - config.threshold);
    const alertLog = await db.alertLog.create({ data: { metric: config.metric, tier: config.tier, threshold: config.threshold, actualValue, diff, message, context: { ...metricResult.metadata, configId: config.id, operator: config.operator } } });
    fired.push(alertLog);
    await routeAlert({ metric: config.metric, tier: config.tier, message, actualValue, threshold: config.threshold, context: metricResult.metadata });
  }
  return { fired, evaluated, skipped };
}
