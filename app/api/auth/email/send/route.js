import { NextResponse } from "next/server";
import { z } from "zod";
import { hashIp } from "@/lib/paymentLog";
import {
  emailOtpSendRateLimiter,
  issueEmailOtp,
  normalizeEmailAddress,
} from "@/lib/services/emailOtpService";

const bodySchema = z
  .object({
    email: z.string().trim().email().max(254),
    intent: z.enum(["signIn", "signUp"]),
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
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 422 });
    }

    const email = normalizeEmailAddress(parsed.data.email);
    const ipLimit = await emailOtpSendRateLimiter.check(`ip:${hashIp(getClientIp(request))}`);
    const emailLimit = await emailOtpSendRateLimiter.check(`email:${hashIp(email)}`);
    if (!ipLimit.allowed || !emailLimit.allowed) {
      const retryAfter = Math.max(ipLimit.retryAfter || 0, emailLimit.retryAfter || 0);
      return NextResponse.json(
        { error: "Too many code requests. Please try again later." },
        { status: 429, headers: { "Retry-After": String(retryAfter || 600) } }
      );
    }

    await issueEmailOtp(email, parsed.data.intent);
    return NextResponse.json({
      ok: true,
      message: "If the address can be used, a sign-in code has been sent.",
    });
  } catch (error) {
    console.error(
      "[POST /api/auth/email/send] Request failed:",
      error instanceof Error ? error.name : "Unknown error"
    );
    return NextResponse.json(
      { error: "Unable to send a code right now. Please try again." },
      { status: 500 }
    );
  }
}
