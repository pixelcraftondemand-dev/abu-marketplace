import { NextResponse } from "next/server";
import { z } from "zod";
import { hashIp } from "@/lib/paymentLog";
import {
  toWhatsappDigits,
  verifyWhatsappOtp,
  whatsappOtpVerifyRateLimiter,
} from "@/lib/services/whatsappOtpService";
import { signInWithVerifiedWhatsappNumber } from "@/lib/services/clerkWhatsappAuth";

/**
 * Step 2 of WhatsApp sign-in: verify the code and hand back a Clerk sign-in
 * ticket the browser exchanges for a session:
 *
 *   await signIn.create({ strategy: "ticket", ticket })
 *
 * The ticket is short-lived and single-use, so leaking it in a log or a
 * screenshot has a ~2 minute blast radius.
 */
const bodySchema = z
  .object({
    phone: z.string().min(4).max(32),
    code: z.string().regex(/^\d{6}$/),
  })
  .strict();

function getClientIP(request) {
  const real = request.headers.get("x-real-ip");
  if (real) return real.trim();
  const forwarded = request.headers.get("x-forwarded-for");
  if (!forwarded) return "unknown";
  return forwarded.split(",").pop()?.trim() || "unknown";
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Enter the 6-digit code." }, { status: 422 });
    }

    const digits = toWhatsappDigits(parsed.data.phone);
    if (!digits) {
      return NextResponse.json({ error: "Enter a valid WhatsApp number." }, { status: 422 });
    }

    // Wrong guesses count against the same bucket as real attempts, so the
    // 10^6 code space cannot be walked.
    const ip = getClientIP(request);
    for (const key of [digits, `ip:${hashIp(ip)}`]) {
      const rl = await whatsappOtpVerifyRateLimiter.check(key);
      if (!rl.allowed) {
        return NextResponse.json(
          { error: "Too many attempts. Please request a new code in a few minutes." },
          { status: 429, headers: { "Retry-After": String(rl.retryAfter || 600) } }
        );
      }
    }

    const outcome = await verifyWhatsappOtp(digits, parsed.data.code);
    if (outcome.status === "expired") {
      return NextResponse.json(
        { error: "That code expired. Request a new one.", code: "expired" },
        { status: 410 }
      );
    }
    if (outcome.status !== "verified") {
      return NextResponse.json(
        { error: "That code isn't right. Check WhatsApp and try again.", code: "invalid" },
        { status: 401 }
      );
    }

    const ticket = await signInWithVerifiedWhatsappNumber(outcome.phone);
    if (!ticket.ok) {
      return NextResponse.json({ error: ticket.message }, { status: 503 });
    }

    return NextResponse.json({ ok: true, ticket: ticket.ticket });
  } catch (error) {
    console.error("[POST /api/auth/whatsapp/verify]", error);
    return NextResponse.json({ error: "Unable to verify that code right now." }, { status: 500 });
  }
}
