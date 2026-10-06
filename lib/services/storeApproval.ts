/**
 * Store approval — one implementation for every caller.
 *
 * Before this service there were two endpoints with two vocabularies
 * (`status: approved|rejected` vs `action: approve|reject`), two different
 * unauthorized status codes (403 vs 401), a bare `String` status column, and no
 * record of *why* a store was rejected — so a rejected seller had no way back.
 *
 * Rules enforced here:
 *  - approving an already-approved store is a no-op conflict (409);
 *  - a rejection must carry a reason (the seller is emailed it, and it is shown
 *    on their application page);
 *  - approving clears any previous rejection reason;
 *  - `canResubmit()` is the single source of truth the create route consults,
 *    so a rejected application can be fixed and sent again instead of
 *    dead-ending the seller's account.
 */
import prisma from "@/lib/prisma";
import {
  sendStoreDecisionEmail,
} from "@/lib/services/storeApplicationEmail";
import {
  STORE_STATUS,
  STORE_STATUSES,
  STORE_REJECTION_REASONS,
  MIN_REJECTION_REASON_LENGTH,
  MAX_REJECTION_REASON_LENGTH,
  canResubmit,
  isStoreStatus,
  normalizeRejectionReason,
  type StoreStatus,
} from "@/lib/storeStatus";

// Re-exported so server callers have a single import for the review API.
// (The client must import from @/lib/storeStatus instead — this module pulls in
// Prisma.)
export {
  STORE_STATUS,
  STORE_STATUSES,
  STORE_REJECTION_REASONS,
  MIN_REJECTION_REASON_LENGTH,
  MAX_REJECTION_REASON_LENGTH,
  canResubmit,
  isStoreStatus,
  normalizeRejectionReason,
};
export type { StoreStatus };

export type ReviewDecision = "approve" | "reject";

export type ReviewStoreResult =
  | {
      ok: true;
      status: StoreStatus;
      isActive: boolean;
      message: string;
      notified: boolean;
    }
  | { ok: false; httpStatus: number; error: string };

interface ReviewStoreParams {
  storeId: unknown;
  decision: unknown;
  reason?: unknown;
  adminUserId?: string | null;
}

export async function reviewStore({
  storeId,
  decision,
  reason,
  adminUserId,
}: ReviewStoreParams): Promise<ReviewStoreResult> {
  const id = typeof storeId === "string" ? storeId.trim() : "";
  if (!id) {
    return { ok: false, httpStatus: 422, error: "A valid storeId is required." };
  }

  if (decision !== "approve" && decision !== "reject") {
    return {
      ok: false,
      httpStatus: 422,
      error: 'Decision must be "approve" or "reject".',
    };
  }

  const rejectionReason = normalizeRejectionReason(reason);
  if (decision === "reject" && (!rejectionReason || rejectionReason.length < MIN_REJECTION_REASON_LENGTH)) {
    return {
      ok: false,
      httpStatus: 422,
      error: `Tell the seller why, in at least ${MIN_REJECTION_REASON_LENGTH} characters — they are emailed this and can resubmit.`,
    };
  }

  let store;
  try {
    store = await prisma.store.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        username: true,
        status: true,
        email: true,
        user: { select: { name: true, email: true } },
      },
    });
  } catch (error) {
    console.error("[storeApproval.reviewStore] lookup failed", error);
    return { ok: false, httpStatus: 500, error: "Something went wrong. Please try again." };
  }

  if (!store) {
    return { ok: false, httpStatus: 404, error: "Store not found." };
  }

  if (decision === "approve" && store.status === STORE_STATUS.APPROVED) {
    return { ok: false, httpStatus: 409, error: "This store is already approved." };
  }

  const nextStatus: StoreStatus =
    decision === "approve" ? STORE_STATUS.APPROVED : STORE_STATUS.REJECTED;

  try {
    await prisma.store.update({
      where: { id },
      data: {
        status: nextStatus,
        isActive: decision === "approve",
        // Approving clears the previous rejection so a resubmitted store does
        // not keep showing a stale reason to the seller.
        rejectionReason: decision === "approve" ? null : rejectionReason,
        reviewedAt: new Date(),
        reviewedBy: adminUserId || null,
      },
    });
  } catch (error) {
    console.error("[storeApproval.reviewStore] update failed", error);
    return { ok: false, httpStatus: 500, error: "Unable to update store approval." };
  }

  // Best-effort: a failed email must never fail the decision (which is already
  // committed). The seller still sees the outcome in their dashboard.
  const notified = await sendStoreDecisionEmail({
    storeName: store.name,
    username: store.username,
    ownerName: store.user?.name ?? null,
    ownerEmail: store.user?.email ?? null,
    storeEmail: store.email,
    decision: nextStatus === STORE_STATUS.APPROVED ? "approved" : "rejected",
    reason: rejectionReason,
  });

  return {
    ok: true,
    status: nextStatus,
    isActive: decision === "approve",
    notified,
    message:
      decision === "approve"
        ? `"${store.name}" is approved and live — the seller can start listing products.`
        : `"${store.name}" was rejected. The seller has been told what to fix and can resubmit.`,
  };
}
