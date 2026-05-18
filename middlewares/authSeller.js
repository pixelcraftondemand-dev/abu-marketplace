import prisma from "@/lib/prisma";

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
        if (!user.store.isActive)             return false;

        return user.store.id;

    } catch (error) {
        console.error("[authSeller]", error);
        return false;
    }
};

export default authSeller;