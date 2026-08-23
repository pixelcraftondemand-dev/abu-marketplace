// Critical monitoring cron job — runs every 5 minutes via Vercel Cron.
//
// Evaluates critical-tier alerts: ledger imbalances, settlement failures,
// payment success rate drops. These page someone immediately.
//
// Protected by CRON_SECRET — only Vercel's cron runner can invoke this.

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma.js";
import { evaluateAlerts } from "@/lib/services/alertEngine.js";

export async function GET(request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await evaluateAlerts(prisma, "critical");

    console.log(
      `[cron:critical] evaluated=${result.evaluated} fired=${result.fired.length} skipped=${result.skipped}`
    );

    return NextResponse.json({
      ok: true,
      tier: "critical",
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
    console.error("[cron:critical] Error:", error);
    return NextResponse.json({ error: "Monitor check failed" }, { status: 500 });
  }
}
