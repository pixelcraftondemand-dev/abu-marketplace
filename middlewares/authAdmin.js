// ─────────────────────────────────────────────────────────────────────────────
// FILEPATH: middlewares/authAdmin.js
// ─────────────────────────────────────────────────────────────────────────────
import prisma from "@/lib/prisma";

/**
 * Verifies the requesting user is an admin.
 *
 * Strategy: looks up the user's email directly from the database using
 * the userId from Clerk's session token, then compares against the
 * ADMIN_EMAIL environment variable. No Clerk API calls. No session
 * claim customization required in the Clerk Dashboard.
 *
 * Usage in any route:
 *   const { userId } = getAuth(request)
 *   const isAdmin = await authAdmin(userId)
 *
 * Returns: true if admin, false otherwise.
 */
const authAdmin = async (userId) => {
    try {
        if (!userId) return false;

        const user = await prisma.user.findUnique({
            where:  { id: userId },
            select: { email: true },
        });

        if (!user?.email) return false;

        const adminEmails = (process.env.ADMIN_EMAIL || "")
            .split(",")
            .map((e) => e.trim().toLowerCase())
            .filter(Boolean);

        if (adminEmails.length === 0) {
            console.warn("[authAdmin] ADMIN_EMAIL env variable is not set.");
            return false;
        }

        return adminEmails.includes(user.email.toLowerCase());
    } catch (error) {
        console.error("[authAdmin]", error);
        return false;
    }
};

export default authAdmin;