import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

/**
 * Get the current session user id from Clerk.
 * Used in API routes to verify authentication.
 */
export async function getSessionFromRequest() {
    try {
        const { userId } = await auth({ acceptsToken: "any" });
        if (!userId) return null;
        return { user: { id: userId } };
    } catch (error) {
        console.error("[getSessionFromRequest]", error);
        return null;
    }
}

/**
 * Enforces server-side email verification for sensitive actions.
 * Returns the user row (with id + emailVerified) when the caller is
 * authenticated AND verified; otherwise returns null. Callers must 401/403
 * when null — this cannot be bypassed by manipulating frontend state because
 * the check reads the verified flag from the database on every request.
 */
export async function getVerifiedUserFromRequest() {
    const session = await getSessionFromRequest();
    const userId = session?.user?.id;
    if (!userId) return null;

    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, emailVerified: true },
        });
        if (!user || !user.emailVerified) return null;
        return user;
    } catch (error) {
        console.error("[getVerifiedUserFromRequest]", error);
        return null;
    }
}
