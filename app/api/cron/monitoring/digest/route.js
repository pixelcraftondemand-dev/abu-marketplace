// Daily digest cron job — runs once per day via Vercel Cron.
//
// Collects all medium-tier alerts from the last 24 hours and sends
// a digest email. Also snapshots all metrics for the dashboard.

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma.js";
import { computeAllMetrics } from "@/lib/services/monitoringMetrics.js";
import { evaluateAlerts } from "@/lib/services/alertEngine.js";
import { sendAlertEmail, buildDigestEmailHtml } from "@/lib/services/alertNotifications.js";
import { getEmailFromAddress } from "@/lib/emailUtils.js";

export async function GET(request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // 1. Evaluate medium-tier alerts (this creates AlertLog entries)
    const mediumResult = await evaluateAlerts(prisma, "medium");

    // 2. Collect all medium-tier alerts from the last 24 hours for digest
    const mediumAlerts = await prisma.alertLog.findMany({
      where: {
        tier: "medium",
        firedAt: { gte: twentyFourHoursAgo },
      },
      orderBy: { firedAt: "desc" },
    });

    // 3. Compute and store metric snapshots for dashboard
    const allMetrics = await computeAllMetrics(prisma, {
      from: twentyFourHoursAgo,
      to: now,
    });

    const snapshotPromises = [];
    for (const [metric, result] of Object.entries(allMetrics)) {
      if (result && result.value !== null) {
        snapshotPromises.push(
          prisma.metricSnapshot.create({
            data: {
              metric,
              value: result.value,
              metadata: result.metadata || null,
              windowStart: twentyFourHoursAgo,
              windowEnd: now,
            },
          })
        );
      }
    }
    await Promise.allSettled(snapshotPromises);

    // 4. Send digest email (even if 0 alerts — confirmation that system is running)
    const toAddress = process.env.MONITORING_EMAIL_TO;
    if (toAddress) {
      const html = buildDigestEmailHtml(mediumAlerts);
      const text = mediumAlerts.length === 0
        ? "No medium-tier alerts in the last 24 hours. All systems nominal."
        : `${mediumAlerts.length} medium-tier alert(s) in the last 24 hours:\n\n${mediumAlerts.map((a) => `- [${a.metric}] ${a.message}`).join("\n")}`;

      await sendAlertEmail({
        subject: `[Digest] ABU Marketplace Monitoring — ${mediumAlerts.length} alerts`,
        html,
        text,
      });
    }

    // 5. Sweep old metric snapshots (keep 90 days)
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    await prisma.metricSnapshot.deleteMany({
      where: { createdAt: { lt: ninetyDaysAgo } },
    });

    console.log(
      `[cron:digest] medium_fired=${mediumResult.fired.length} total_medium_24h=${mediumAlerts.length} snapshots=${snapshotPromises.length}`
    );

    return NextResponse.json({
      ok: true,
      tier: "digest",
      mediumFired: mediumResult.fired.length,
      totalMedium24h: mediumAlerts.length,
      snapshotsStored: snapshotPromises.length,
      alerts: mediumAlerts.map((a) => ({
        metric: a.metric,
        message: a.message,
        firedAt: a.firedAt,
      })),
    });
  } catch (error) {
    console.error("[cron:digest] Error:", error);
    return NextResponse.json({ error: "Digest job failed" }, { status: 500 });
  }
}
