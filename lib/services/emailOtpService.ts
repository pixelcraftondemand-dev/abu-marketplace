import crypto from "node:crypto";
import prisma from "@/lib/prisma";
import { sendVerificationEmail } from "@/lib/verificationEmail";
import { createDistributedRateLimiter } from "@/lib/services/rateLimitStore";

const EMAIL_OTP_IDENTIFIER_PREFIX = "email-auth:";
const EMAIL_OTP_TTL_MINUTES = 5;
const OTP_LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const OTP_PATTERN = /^[A-HJ-NP-Z0-9]{6}$/;

export const emailOtpSendRateLimiter = createDistributedRateLimiter({
  windowMs: 10 * 60_000,
  max: 3,
  name: "email-otp-send",
});

export const emailOtpVerifyRateLimiter = createDistributedRateLimiter({
  windowMs: 10 * 60_000,
  max: 10,
  name: "email-otp-verify",
});

export type EmailOtpIntent = "signIn" | "signUp";

export function normalizeEmailAddress(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmailOtp(code: string): boolean {
  return OTP_PATTERN.test(code) && (code.match(/[A-Z]/g)?.length ?? 0) === 1;
}

export function generateEmailOtp(): string {
  const digits = crypto.randomInt(0, 100_000).toString().padStart(5, "0");
  const letter = OTP_LETTERS[crypto.randomInt(0, OTP_LETTERS.length)];
  const position = crypto.randomInt(0, 6);
  return `${digits.slice(0, position)}${letter}${digits.slice(position)}`;
}

function getOtpSecret(): string {
  const secret = process.env.EMAIL_OTP_SECRET || process.env.CLERK_SECRET_KEY || "";
  if (!secret) {
    throw new Error("EMAIL_OTP_SECRET or CLERK_SECRET_KEY must be configured.");
  }
  return secret;
}

function getIdentifier(email: string, intent: EmailOtpIntent): string {
  const emailHash = crypto.createHash("sha256").update(email).digest("hex");
  return `${EMAIL_OTP_IDENTIFIER_PREFIX}${intent}:${emailHash}`;
}

function hashOtp(code: string): string {
  return crypto.createHmac("sha256", getOtpSecret()).update(code).digest("hex");
}

export async function issueEmailOtp(
  rawEmail: string,
  intent: EmailOtpIntent
): Promise<void> {
  const email = normalizeEmailAddress(rawEmail);
  const identifier = getIdentifier(email, intent);
  const expiresAt = new Date(Date.now() + EMAIL_OTP_TTL_MINUTES * 60_000);

  await prisma.verification.deleteMany({ where: { identifier } });

  let code = "";
  let stored = false;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = generateEmailOtp();
    const value = hashOtp(candidate);
    try {
      await prisma.verification.create({
        data: {
          id: crypto.randomUUID(),
          identifier,
          value,
          expiresAt,
        },
      });
      code = candidate;
      stored = true;
      break;
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "P2002"
      ) {
        continue;
      }
      throw error;
    }
  }

  if (!stored) {
    throw new Error("Could not allocate a sign-in code.");
  }

  try {
    await sendVerificationEmail({
      to: email,
      code,
      purpose: intent === "signUp" ? "signup" : "login",
      expiresInMinutes: EMAIL_OTP_TTL_MINUTES,
    });
  } catch (error) {
    await prisma.verification.deleteMany({
      where: { identifier, value: hashOtp(code) },
    });
    throw error;
  }
}

export type VerifyEmailOtpResult =
  | { status: "verified"; email: string; intent: EmailOtpIntent }
  | { status: "invalid" }
  | { status: "expired" };

export async function verifyEmailOtp(
  rawEmail: string,
  rawCode: string,
  intent: EmailOtpIntent
): Promise<VerifyEmailOtpResult> {
  const email = normalizeEmailAddress(rawEmail);
  const code = rawCode.trim().toUpperCase();
  if (!isValidEmailOtp(code)) return { status: "invalid" };

  const identifier = getIdentifier(email, intent);
  const value = hashOtp(code);

  return prisma.$transaction(async (tx) => {
    const record = await tx.verification.findFirst({
      where: { identifier, value },
      select: { id: true, expiresAt: true },
    });
    if (!record) return { status: "invalid" as const };

    const consumed = await tx.verification.deleteMany({
      where: { id: record.id },
    });
    if (consumed.count !== 1) return { status: "invalid" as const };
    if (record.expiresAt <= new Date()) return { status: "expired" as const };

    return { status: "verified" as const, email, intent };
  });
}
