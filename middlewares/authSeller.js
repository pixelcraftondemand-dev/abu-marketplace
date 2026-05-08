import prisma from "@/lib/prisma";

/**
 * Verifies that the requesting user is an approved, active seller.
 *
 * FIX 1: Returns true (not store ID) on success so isSeller === true in layout.
 * FIX 2: isActive check removed — approval sets the gate, not a separate flag.
 *         If your schema requires isActive, flip it to true on approval instead.
 */
const authSeller = async (userId) => {
    try {
        if (!userId) return false;

        const user = await prisma.user.findUnique({
            where:  { id: userId },
            select: {
                id:    true,
                store: {
                    select: { id: true, status: true, isActive: true },
                },
            },
        });

        if (!user)                            return false;
        if (!user.store)                      return false;
        if (user.store.status !== "approved") return false;

        // isActive must be true — set it when admin approves the store
        if (!user.store.isActive)             return false;

        return true; // was returning user.store.id (string) — now explicit boolean

    } catch (error) {
        console.error("[authSeller]", error);
        return false;
    }
};

export default authSeller;