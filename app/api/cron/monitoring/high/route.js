// High-tier monitoring cron job — runs every hour via Vercel Cron.
//
// Evaluates high-tier alerts: refund rate spikes, fraud distribution shifts,
// webhook processing lag. Notifies within business hours.

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma.js";
import { evaluateAlerts } from "@/lib/services/alertEngine.js";

export async function GET(request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await evaluateAlerts(prisma, "high");

    console.log(
      `[cron:high] evaluated=${result.evaluated} fired=${result.fired.length} skipped=${result.skipped}`
    );

    return NextResponse.json({
      ok: true,
      tier: "high",
      evaluated: result.evaluated,
      fired: result.fired.length,
      skipped: result.skipped,
      alerts: result.fired.map((a) => ({
        metric: a.metric,
        message: a.message,
        actualValue: a.actualValue,
        threshold: a.threshold,
      })),
    });
  } catch (error) {
    console.error("[cron:high] Error:", error);
    return NextResponse.json({ error: "Monitor check failed" }, { status: 500 });
  }
}
