import prisma from "@/lib/prisma";
import { z } from "zod";
import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/serverAuth";
import authAdmin from "@/middlewares/authAdmin";
import { getAuditTrail, getAuditLogsForReporting } from "@/lib/services/auditLog";

// ─── GET /api/psp/audit ─────────────────────────────────────────────────────

export async function GET(request) {
  try {
    const session = await getSessionFromRequest();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    const isAdmin = await authAdmin(userId);
    const { searchParams } = new URL(request.url);
    const pspTransactionId = searchParams.get("pspTransactionId");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const action = searchParams.get("action");
    const limit = Math.min(Number(searchParams.get("limit") || 100), 1000);

    // Transaction-specific audit trail
    if (pspTransactionId) {
      // Verify the transaction belongs to the user (or user is admin)
      const txn = await prisma.pspTransaction.findUnique({
        where: { id: pspTransactionId },
        select: { userId: true, merchantId: true },
      });

      if (!txn) {
        return NextResponse.json({ error: "Transaction not found." }, { status: 404 });
      }

      if (!isAdmin && txn.userId !== userId) {
        return NextResponse.json({ error: "Access denied." }, { status: 403 });
      }

      const trail = await getAuditTrail(prisma, pspTransactionId);
      return NextResponse.json({ trail, total: trail.length });
    }

    // Admin reporting: date-range audit logs
    if (!isAdmin) {
      return NextResponse.json({ error: "Admin access required for reporting." }, { status: 403 });
    }

    if (!from || !to) {
      return NextResponse.json({ error: "from and to dates are required for reporting." }, { status: 422 });
    }

    const logs = await getAuditLogsForReporting(prisma, {
      from: new Date(from),
      to: new Date(to),
      action: action || undefined,
      limit,
    });

    return NextResponse.json({ logs, total: logs.length });
  } catch (error) {
    console.error("[GET /api/psp/audit]", error);
    return NextResponse.json({ error: "Unable to fetch audit logs." }, { status: 500 });
  }
}
