import prisma from "@/lib/prisma";

const authSeller = async (userId) => {
    try {
        if (!userId) return false;

        const user = await prisma.user.findUnique({
            // Closed (soft-deleted) accounts can never operate a store.
            where:  { id: userId, deletedAt: null },
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
        if (!user.store.isActive)             return false;

        return user.store.id;

    } catch (error) {
        console.error("[authSeller]", error);
        return false;
    }
};

export default authSeller;