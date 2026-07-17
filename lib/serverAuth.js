import { auth } from "@clerk/nextjs/server";

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
