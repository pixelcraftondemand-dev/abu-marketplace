import prisma from "@/lib/prisma";
import authAdmin from "@/middlewares/authAdmin";
import { getSessionFromRequest } from "@/lib/serverAuth";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { reconcilePayment, reconcileAllStuck } from "@/lib/services/paymentReconciliation";
import { getRequestId } from "@/lib/paymentLog";

const getStripe = () => new Stripe(process.env.STRIPE_SECRET_KEY);

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

    const { searchParams } = new URL(request.url);
    const paymentId = searchParams.get("paymentId");
    const scope = searchParams.get("scope") || "stuck";

    const stripe = getStripe();

    const results = paymentId
      ? [await reconcilePayment({ paymentId, prisma, stripe })]
      : await reconcileAllStuck({ prisma, stripe, take: 50 });

    const reconciled = results.filter((r) => r.status === "reconciled").length;
    const issues = results.filter((r) => r.status !== "ok" && r.status !== "consistent" && r.status !== "reconciled");

    return NextResponse.json({ requestId, scope, results, summary: { total: results.length, reconciled, issues: issues.length } });
  } catch (error) {
    console.error("[GET /api/admin/reconcile]", error);
    return NextResponse.json({ error: "Reconciliation failed." }, { status: 500 });
  }
}
