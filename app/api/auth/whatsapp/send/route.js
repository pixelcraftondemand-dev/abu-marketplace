import { NextResponse } from "next/server";
import { z } from "zod";
import { hashIp } from "@/lib/paymentLog";
import {
  issueWhatsappOtp,
  toWhatsappDigits,
  whatsappOtpSendRateLimiter,
} from "@/lib/services/whatsappOtpService";

/**
 * Step 1 of WhatsApp sign-in: send a 6-digit code to the buyer's WhatsApp.
 *
 * Unauthenticated by design (it *is* the sign-in entry point), so it is bounded
 * on both axes: per-number (3 / 10 min — stops SMS/WhatsApp pumping) and per-IP
 * (reuses the same limiter namespace so a scripted client cannot rotate numbers
 * freely). Accounts are created on first sign-in, so there is no account
 * enumeration to protect — the response shape is identical either way.
 */
const bodySchema = z.object({ phone: z.string().min(4).max(32) }).strict();

/**
 * Client IP from the *trusted* end of the chain. `x-forwarded-for` is
 * client-appendable, so its leftmost entry must never be used for limits.
 */
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
      return NextResponse.json({ error: "Enter a valid WhatsApp number." }, { status: 422 });
    }

    const digits = toWhatsappDigits(parsed.data.phone);
    if (!digits) {
      return NextResponse.json(
        { error: "Enter a valid WhatsApp number, including the country code." },
        { status: 422 }
      );
    }

    const ip = getClientIP(request);
    for (const key of [digits, `ip:${hashIp(ip)}`]) {
      const rl = await whatsappOtpSendRateLimiter.check(key);
      if (!rl.allowed) {
        return NextResponse.json(
          { error: "Too many codes requested. Please try again in a few minutes." },
          { status: 429, headers: { "Retry-After": String(rl.retryAfter || 600) } }
        );
      }
    }

    const result = await issueWhatsappOtp(digits);
    if (!result.sent) {
      const status = result.reason === "invalid_number" ? 422 : 502;
      return NextResponse.json(
        { error: result.message || "We couldn't send your code. Please try again." },
        { status }
      );
    }

    return NextResponse.json({
      ok: true,
      expiresInMinutes: result.expiresInMinutes,
      // Present only under the local `mock` provider so development can
      // complete the flow without Meta credentials. Never set in production
      // (the service refuses to run `mock` in production at all).
      ...(result.devCode ? { devCode: result.devCode } : {}),
    });
  } catch (error) {
    console.error("[POST /api/auth/whatsapp/send]", error);
    return NextResponse.json({ error: "Unable to send a code right now." }, { status: 500 });
  }
}
