import { auth } from "@/lib/auth";
import { headers } from "next/headers";

/**
 * Get the current session from Better Auth
 * Used in API routes to verify authentication
 */
export async function getSessionFromRequest(request) {
  try {
    const headersList = headers();
    const cookieHeader = headersList.get("cookie");
    
    // Get session from Better Auth
    const session = await auth.api.getSession({
      headers: {
        cookie: cookieHeader,
      },
    });
    
    return session;
  } catch (error) {
    console.error("[getSessionFromRequest]", error);
    return null;
  }
}
