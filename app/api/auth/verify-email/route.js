import { NextResponse } from "next/server";
import { z } from "zod";
import { verificationVerifyRateLimiter } from "@/lib/security";
import { hashIp } from "@/lib/paymentLog";
import { verifyVerificationToken } from "@/lib/services/verificationService";

/**
 * Validate a 6-digit verification code (emailed to the account owner) or a
 * legacy single-use token (from links in previously-sent emails).
 *
 * Security:
 *  - The raw code/token is hashed server-side before comparison; the DB only
 *    ever stores SHA-256 hashes, so a leaked DB dump cannot be used to forge
 *    codes.
 *  - Codes are single-use: the code row is deleted in the same transaction
 *    that flips emailVerified, so replay (even racing requests) is impossible.
 *  - Expired and unknown codes are rejected with distinct statuses.
 *  - Rate limited per IP (20 per 10 minutes) to blunt brute force against
 *    the 10^6 code space.
 */
const bodySchema = z
  .object({
    code: z.string().regex(/^\d{6}$/).optional(),
    token: z.string().min(8).max(200).optional(),
  })
  .refine((body) => Boolean(body.code || body.token), {
    message: "A verification code or link is required.",
  });

export async function POST(request) {
  // Rate limit FIRST — before any parsing/DB work — so abuse of the endpoint
  // (including malformed payloads) is throttled.
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rl = verificationVerifyRateLimiter.check(hashIp(ip));
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again later." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter || 600) } }
    );
  }

  let parsed;
  try {
    const body = await request.json();
    const result = bodySchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: "Invalid verification code." }, { status: 422 });
    }
    parsed = result.data;
  } catch {
    return NextResponse.json({ error: "Invalid verification code." }, { status: 400 });
  }

  // Prefer the code; fall back to the legacy link token.
  const outcome = await verifyVerificationToken(parsed.code || parsed.token);

  switch (outcome.status) {
    case "verified":
      return NextResponse.json({ verified: true, userId: outcome.userId });
    case "already_verified":
      return NextResponse.json({ verified: true, alreadyVerified: true, userId: outcome.userId });
    case "expired":
      return NextResponse.json({ verified: false, status: "expired" }, { status: 410 });
    case "server_error":
      return NextResponse.json(
        { error: "Unable to verify your email right now. Please try again later." },
        { status: 500 }
      );
    case "invalid":
    default:
      return NextResponse.json({ verified: false, status: "invalid" }, { status: 400 });
  }
}
