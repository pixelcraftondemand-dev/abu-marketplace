import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionFromRequest } from "@/lib/serverAuth";
import { verificationSendRateLimiter } from "@/lib/security";
import { issueVerificationEmail } from "@/lib/services/verificationService";

/**
 * Resend the account verification email for the signed-in user.
 *
 * Security:
 *  - Requires an authenticated session (the endpoint never accepts an email
 *    address from the client, so arbitrary addresses can never be probed).
 *  - Rate limited per user (3 per 10 minutes) to prevent email flooding.
 *  - Always returns the same generic 200 shape for known-user states so the
 *    response cannot be used for account enumeration.
 *  - Issuing a new token invalidates the previous one (single live token).
 */
const bodySchema = z.object({}).strict().optional();

export async function POST(request) {
  try {
    const session = await getSessionFromRequest(request);
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "not authorized" }, { status: 401 });
    }

    const rl = verificationSendRateLimiter.check(userId);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfter || 600) } }
      );
    }

    // Parse (and ignore) any body — nothing from the client is trusted.
    try {
      const body = await request.json().catch(() => ({}));
      if (!bodySchema.safeParse(body).success) {
        return NextResponse.json({ error: "Invalid request." }, { status: 422 });
      }
    } catch {
      return NextResponse.json({ error: "Invalid request." }, { status: 422 });
    }

    const result = await issueVerificationEmail(userId);

    // Generic response — never reveals whether an account exists or is verified.
    if (result.reason === "already_verified") {
      return NextResponse.json({ message: "Your email is already verified.", alreadyVerified: true });
    }
    if (result.reason === "no_account" || !result.sent) {
      // Match the success shape to avoid enumeration.
      return NextResponse.json({ message: "If an account exists, a verification email has been sent." });
    }

    return NextResponse.json({ message: "Verification email sent." });
  } catch (error) {
    console.error("[POST /api/auth/send-verification]", error);
    return NextResponse.json(
      { error: "Unable to send the verification email. Please try again later." },
      { status: 400 }
    );
  }
}
