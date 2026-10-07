import { NextResponse } from "next/server";
import { z } from "zod";
import { hashIp } from "@/lib/paymentLog";
import { createEmailSignInTicket } from "@/lib/services/clerkEmailAuth";
import {
  emailOtpVerifyRateLimiter,
  normalizeEmailAddress,
  verifyEmailOtp,
} from "@/lib/services/emailOtpService";

const bodySchema = z
  .object({
    email: z.string().trim().email().max(254),
    intent: z.enum(["signIn", "signUp"]),
    code: z.string().regex(/^[A-HJ-NP-Z0-9]{6}$/i),
  })
  .strict();

function getClientIp(request) {
  const real = request.headers.get("x-real-ip");
  if (real) return real.trim();
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",").pop()?.trim() || "unknown";
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Enter the 6-character code from your email." },
        { status: 422 }
      );
    }

    const email = normalizeEmailAddress(parsed.data.email);
    const ipLimit = await emailOtpVerifyRateLimiter.check(`ip:${hashIp(getClientIp(request))}`);
    const emailLimit = await emailOtpVerifyRateLimiter.check(`email:${hashIp(email)}`);
    if (!ipLimit.allowed || !emailLimit.allowed) {
      const retryAfter = Math.max(ipLimit.retryAfter || 0, emailLimit.retryAfter || 0);
      return NextResponse.json(
        { error: "Too many attempts. Please request a new code later." },
        { status: 429, headers: { "Retry-After": String(retryAfter || 600) } }
      );
    }

    const outcome = await verifyEmailOtp(email, parsed.data.code, parsed.data.intent);
    if (outcome.status === "expired") {
      return NextResponse.json(
        { error: "That code expired. Request a new one.", code: "expired" },
        { status: 410 }
      );
    }
    if (outcome.status !== "verified") {
      return NextResponse.json(
        { error: "That code is not correct. Please check it and try again." },
        { status: 401 }
      );
    }

    const result = await createEmailSignInTicket(outcome.email, outcome.intent);
    if (!result.ok) {
      if (result.reason === "account_disabled") {
        return NextResponse.json(
          { error: "This account is disabled. Contact support for help.", code: result.reason },
          { status: 403 }
        );
      }
      const status = result.reason === "account_exists" ? 409 : 404;
      const error =
        result.reason === "account_exists"
          ? "An account already exists with this email. Switch to sign in."
          : "No account found with this email. Switch to create an account.";
      return NextResponse.json({ error, code: result.reason }, { status });
    }

    return NextResponse.json({ ok: true, ticket: result.ticket });
  } catch (error) {
    console.error(
      "[POST /api/auth/email/verify] Request failed:",
      error instanceof Error ? error.name : "Unknown error"
    );
    return NextResponse.json(
      { error: "Unable to verify the code right now. Please try again." },
      { status: 500 }
    );
  }
}
