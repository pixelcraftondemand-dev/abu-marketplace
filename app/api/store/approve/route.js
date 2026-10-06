/**
 * Legacy alias for store review.
 *
 * Kept so any older client or script calling `/api/store/approve` with
 * `{ storeId, action }` keeps working — but it now shares one implementation
 * with `/api/admin/approve-store` (lib/services/storeApproval.ts) instead of
 * duplicating the transition rules. Non-admin callers used to get a 401 here
 * and a 403 from the other endpoint; both answer 403 now.
 */
import { adminActionRateLimiter } from "@/lib/security";
import authAdmin from "@/middlewares/authAdmin";
import { getSessionFromRequest } from "@/lib/serverAuth";
import { NextResponse } from "next/server";
import { reviewStore } from "@/lib/services/storeApproval";

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
        const raw = body?.action ?? body?.decision ?? body?.status;
        const decision =
            raw === "approve" || raw === "approved"
                ? "approve"
                : raw === "reject" || raw === "rejected"
                  ? "reject"
                  : null;

        if (!decision) {
            return NextResponse.json(
                { error: 'Action must be "approve" or "reject".' },
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
        console.error("[POST /api/store/approve]", error);
        return NextResponse.json({ error: "Unable to update store approval." }, { status: 500 });
    }
}
