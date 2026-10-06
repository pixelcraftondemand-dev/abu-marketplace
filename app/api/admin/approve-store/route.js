// ─────────────────────────────────────────────────────────────────────────────
// FILEPATH: app/api/admin/approve-store/route.js
// ─────────────────────────────────────────────────────────────────────────────
import prisma from "@/lib/prisma";
import { adminActionRateLimiter } from "@/lib/security";
import authAdmin from "@/middlewares/authAdmin";
import { getSessionFromRequest } from "@/lib/serverAuth";
import { NextResponse } from "next/server";
import { STORE_STATUSES, reviewStore } from "@/lib/services/storeApproval";

/**
 * Accept the decision in any of the shapes callers have used:
 * `status: "approved" | "rejected"`, `decision: "approve" | "reject"`, or
 * `action: "approve" | "reject"`.
 */
function resolveDecision(body) {
  const raw = body?.decision ?? body?.action ?? body?.status;
  if (raw === "approve" || raw === "approved") return "approve";
  if (raw === "reject" || raw === "rejected") return "reject";
  return null;
}

// ── GET /api/admin/approve-store ──────────────────────────────────────────────
// Returns all pending and rejected store applications for the admin panel.

export async function GET(request) {
    try {
        const session = await getSessionFromRequest(request);
        const userId = session?.user?.id;
        const isAdmin = await authAdmin(userId);

        if (!isAdmin) {
            return NextResponse.json({ error: "Not authorized." }, { status: 403 });
        }

        const stores = await prisma.store.findMany({
            where:   { status: { in: [STORE_STATUSES[0], STORE_STATUSES[2]] } },
            include: {
                user: { select: { id: true, name: true, email: true, image: true } },
            },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json({
            stores,
            counts: {
                pending:  stores.filter((s) => s.status === STORE_STATUSES[0]).length,
                rejected: stores.filter((s) => s.status === STORE_STATUSES[2]).length,
            },
        });
    } catch (error) {
        console.error("[GET /api/admin/approve-store]", error);
        return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
    }
}

// ── POST /api/admin/approve-store ─────────────────────────────────────────────
// Approves or rejects a store application.
// Body: { storeId: string, decision|status|action, reason?: string }
//
// Rules (single implementation in lib/services/storeApproval.ts): a rejection
// must carry a reason, and the seller is emailed the outcome so a rejected
// application can be fixed and resubmitted instead of dead-ending.

export async function POST(request) {
    try {
        const session = await getSessionFromRequest(request);
        const userId = session?.user?.id;
        const isAdmin = await authAdmin(userId);

        if (!isAdmin) {
            return NextResponse.json({ error: "Not authorized." }, { status: 403 });
        }

        const rl = await adminActionRateLimiter.check(userId);
        if (!rl.allowed) {
            return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429, headers: { "Retry-After": String(rl.retryAfter || 600) } });
        }

        const body = await request.json().catch(() => null);
        const decision = resolveDecision(body);

        if (!decision) {
            return NextResponse.json(
                { error: "Decision must be 'approve' or 'reject'." },
                { status: 422 }
            );
        }

        const result = await reviewStore({
            storeId: body?.storeId,
            decision,
            reason: body?.reason,
            adminUserId: userId,
        });

        if (!result.ok) {
            return NextResponse.json({ error: result.error }, { status: result.httpStatus });
        }

        return NextResponse.json({
            message: result.message,
            status: result.status,
            isActive: result.isActive,
            notified: result.notified,
        });
    } catch (error) {
        console.error("[POST /api/admin/approve-store]", error);
        return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
    }
}