// Admin monitoring API — serves metrics, alert history, and config for
// the internal monitoring dashboard. Admin-only.

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma.js";
import { getSessionFromRequest } from "@/lib/serverAuth.js";
import authAdmin from "@/middlewares/authAdmin.js";
import { computeAllMetrics } from "@/lib/services/monitoringMetrics.js";

// ─── GET /api/admin/monitoring ───────────────────────────────────────────────

export async function GET(request) {
  try {
    const session = await getSessionFromRequest();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    const isAdmin = await authAdmin(userId);
    if (!isAdmin) {
      return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const view = searchParams.get("view") || "current";

    if (view === "alerts") {
      return handleAlertHistory(searchParams);
    }
    if (view === "config") {
      return handleAlertConfig();
    }
    if (view === "snapshots") {
      return handleSnapshots(searchParams);
    }

    // Default: current metrics
    return handleCurrentMetrics();
  } catch (error) {
    console.error("[GET /api/admin/monitoring]", error);
    return NextResponse.json({ error: "Unable to fetch monitoring data." }, { status: 500 });
  }
}

// ─── PUT /api/admin/monitoring — update alert config ─────────────────────────

export async function PUT(request) {
  try {
    const session = await getSessionFromRequest();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    const isAdmin = await authAdmin(userId);
    if (!isAdmin) {
      return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    }

    const body = await request.json();
    const { configId, threshold, enabled, tier, cooldownMin } = body;

    if (!configId) {
      return NextResponse.json({ error: "configId required." }, { status: 422 });
    }

    const updateData = {};
    if (threshold !== undefined) updateData.threshold = threshold;
    if (enabled !== undefined) updateData.enabled = enabled;
    if (tier !== undefined) updateData.tier = tier;
    if (cooldownMin !== undefined) updateData.cooldownMin = cooldownMin;

    const config = await prisma.alertConfig.update({
      where: { id: configId },
      data: updateData,
    });

    return NextResponse.json({ config });
  } catch (error) {
    console.error("[PUT /api/admin/monitoring]", error);
    return NextResponse.json({ error: "Unable to update config." }, { status: 500 });
  }
}

// ─── Handlers ────────────────────────────────────────────────────────────────

async function handleCurrentMetrics() {
  const metrics = await computeAllMetrics(prisma);

  // Get last 10 alerts across all tiers
  const recentAlerts = await prisma.alertLog.findMany({
    orderBy: { firedAt: "desc" },
    take: 10,
  });

  // Get alert counts by tier
  const alertCounts = await prisma.alertLog.groupBy({
    by: ["tier"],
    _count: true,
    where: {
      firedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
  });

  return NextResponse.json({
    metrics,
    recentAlerts,
    alertCounts: Object.fromEntries(alertCounts.map((a) => [a.tier, a._count])),
    generatedAt: new Date().toISOString(),
  });
}

async function handleAlertHistory(searchParams) {
  const limit = Math.min(Number(searchParams.get("limit") || 50), 200);
  const tier = searchParams.get("tier");
  const metric = searchParams.get("metric");

  const where = {};
  if (tier) where.tier = tier;
  if (metric) where.metric = metric;

  const alerts = await prisma.alertLog.findMany({
    where,
    orderBy: { firedAt: "desc" },
    take: limit,
  });

  return NextResponse.json({ alerts, total: alerts.length });
}

async function handleAlertConfig() {
  const configs = await prisma.alertConfig.findMany({
    orderBy: [{ tier: "asc" }, { metric: "asc" }],
  });

  return NextResponse.json({ configs });
}

async function handleSnapshots(searchParams) {
  const metric = searchParams.get("metric");
  const limit = Math.min(Number(searchParams.get("limit") || 100), 500);

  const where = {};
  if (metric) where.metric = metric;

  const snapshots = await prisma.metricSnapshot.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return NextResponse.json({ snapshots });
}
