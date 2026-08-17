import prisma from "@/lib/prisma";
import authAdmin from "@/middlewares/authAdmin";
import { adminActionRateLimiter } from "@/lib/security";
import { getSessionFromRequest } from "@/lib/serverAuth";
import { NextResponse } from "next/server";
import * as flutterwave from "@/lib/services/flutterwave";
import { reconcilePayment, reconcileAllStuck } from "@/lib/services/paymentReconciliation";
import { getRequestId } from "@/lib/paymentLog";

/**
 * Admin payment reconciliation.
 *   GET /api/admin/reconcile?paymentId=<id>      — reconcile one payment
 *   GET /api/admin/reconcile?scope=stuck         — reconcile all PENDING/PROCESSING
 *
 * Discrepancies that can be proven safe against the provider are recovered;
 * everything else is reported for manual review. Never exposes internals to
 * non-admins.
 */
export async function GET(request) {
  const requestId = getRequestId(request);
  try {
    const session = await getSessionFromRequest(request);
    const userId = session?.user?.id;
    const isAdmin = await authAdmin(userId);
    if (!isAdmin) {
      return NextResponse.json({ error: "Not authorized." }, { status: 403 });
    }

    // Reconciliation hits the Flutterwave API — bound it per admin.
    const rl = await adminActionRateLimiter.check(userId);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429, headers: { "Retry-After": String(rl.retryAfter || 600) } });
    }

    const { searchParams } = new URL(request.url);
    const paymentId = searchParams.get("paymentId");
    const scope = searchParams.get("scope") || "stuck";

    const results = paymentId
      ? [await reconcilePayment({ paymentId, prisma, provider: flutterwave })]
      : await reconcileAllStuck({ prisma, provider: flutterwave, take: 50 });

    const reconciled = results.filter((r) => r.status === "reconciled").length;
    const issues = results.filter((r) => r.status !== "ok" && r.status !== "consistent" && r.status !== "reconciled");

    return NextResponse.json({ requestId, scope, results, summary: { total: results.length, reconciled, issues: issues.length } });
  } catch (error) {
    console.error("[GET /api/admin/reconcile]", error);
    return NextResponse.json({ error: "Reconciliation failed." }, { status: 500 });
  }
}
