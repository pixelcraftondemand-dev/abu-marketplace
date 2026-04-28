// ─────────────────────────────────────────────────────────────────────────────
// FILEPATH: middlewares/authSeller.js
// ─────────────────────────────────────────────────────────────────────────────
import prisma from "@/lib/prisma";

/**
 * Verifies that the requesting user is an approved, active seller.
 *
 * Returns the store ID (string) on success.
 * Returns false on any failure — missing userId, no user, no store,
 * store not active, store not approved.
 *
 * BUG FIXED: the original fell off the end of the function when
 * user.store existed but status !== "approved", returning undefined
 * (falsy but not the explicit false callers expect).
 */
const authSeller = async (userId) => {
    try {
        if (!userId) return false;

        const user = await prisma.user.findUnique({
            where:   { id: userId },
            select: {
                id:    true,
                store: {
                    select: { id: true, status: true, isActive: true },
                },
            },
        });

        if (!user)                              return false;
        if (!user.store)                        return false;
        if (!user.store.isActive)               return false;
        if (user.store.status !== "approved")   return false;

        return user.store.id;

    } catch (error) {
        console.error("[authSeller]", error);
        return false;
    }
};

export default authSeller;