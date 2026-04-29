// ─────────────────────────────────────────────────────────────────────────────
// FILEPATH: middlewares/authAdmin.js
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Verifies the requesting user is an admin by checking their email
 * directly from the Clerk session claims — no extra clerkClient API
 * call required, no external failure point.
 *
 * Usage: const isAdmin = await authAdmin(userId, sessionClaims)
 *
 * In your route:
 *   const { userId, sessionClaims } = getAuth(request)
 *   const isAdmin = await authAdmin(userId, sessionClaims)
 */
const authAdmin = async (userId, sessionClaims) => {
    try {
        if (!userId || !sessionClaims) return false;

        const email = sessionClaims?.email ?? sessionClaims?.primaryEmail ?? null;

        if (!email) return false;

        const adminEmails = (process.env.ADMIN_EMAIL || "")
            .split(",")
            .map((e) => e.trim().toLowerCase())
            .filter(Boolean);

        return adminEmails.includes(email.toLowerCase());
    } catch (error) {
        console.error("[authAdmin]", error);
        return false;
    }
};

export default authAdmin;