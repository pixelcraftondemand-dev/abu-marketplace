import crypto from "node:crypto";
import prisma from "@/lib/prisma";
import { sendVerificationEmail } from "@/lib/verificationEmail";

const OTP_LENGTH = 6;
const DEFAULT_TTL_MINUTES = 15;

function getTtlMinutes() {
  const raw = Number(process.env.VERIFICATION_OTP_TTL_MINUTES);
  if (Number.isFinite(raw) && raw > 0 && raw <= 60) return raw;
  return DEFAULT_TTL_MINUTES;
}

/**
 * Generates a cryptographically secure 6-digit verification code
 * (e.g. "483920"). The raw code is never stored — only its SHA-256 hash.
 */
export function generateVerificationToken() {
  return crypto
    .randomInt(0, 10 ** OTP_LENGTH)
    .toString()
    .padStart(OTP_LENGTH, "0");
}

/** SHA-256 hash of a code — the only form stored in the database. */
export function hashVerificationToken(token) {
  if (!token || typeof token !== "string") {
    throw new Error("Verification token is required.");
  }
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Creates a new single-use verification code for a user, invalidating any
 * previous ones. Returns the raw code so the caller can email it.
 *
 * Codes live in a small space (10^6), so two users could draw the same code
 * at the same time; the unique `value` index would then reject the second
 * insert, which we resolve by retrying with a fresh code.
 */
export async function createVerificationToken(userId) {
  if (!userId) throw new Error("User id is required.");
  const expiresAt = new Date(Date.now() + getTtlMinutes() * 60 * 1000);

  // Invalidate previous codes (single live code per user at a time).
  await prisma.verification.deleteMany({ where: { identifier: userId } });

  for (let attempt = 0; attempt < 5; attempt++) {
    const rawCode = generateVerificationToken();
    try {
      await prisma.verification.create({
        data: {
          id: crypto.randomUUID(),
          identifier: userId,
          value: hashVerificationToken(rawCode),
          expiresAt,
        },
      });
      return { token: rawCode, expiresAt };
    } catch (error) {
      // P2002 = unique constraint on `value`: another user holds this code
      // right now. Rare, but regenerate and try again.
      if (error?.code === "P2002") continue;
      throw error;
    }
  }

  throw new Error("Could not allocate a unique verification code. Please try again.");
}

/**
 * Verifies a supplied code. Returns the outcome:
 *   { status: "verified", userId }
 *   { status: "already_verified", userId }
 *   { status: "invalid" | "expired" }
 *
 * The check + consumption happen atomically: the code row is deleted inside
 * the same transaction that marks the user verified, so a code can never be
 * replayed — even by two racing requests.
 */
export async function verifyVerificationToken(token) {
  if (!token || typeof token !== "string" || token.length > 200) {
    return { status: "invalid" };
  }

  const tokenHash = hashVerificationToken(token);

  try {
    return await prisma.$transaction(async (tx) => {
      const record = await tx.verification.findUnique({
        where: { value: tokenHash },
      });
      if (!record) return { status: "invalid" };

      const user = await tx.user.findUnique({
        where: { id: record.identifier },
        select: { id: true, emailVerified: true },
      });
      if (!user) {
        await tx.verification.delete({ where: { id: record.id } });
        return { status: "invalid" };
      }
      if (user.emailVerified) {
        await tx.verification.delete({ where: { id: record.id } });
        return { status: "already_verified", userId: user.id };
      }
      if (record.expiresAt < new Date()) {
        await tx.verification.delete({ where: { id: record.id } });
        return { status: "expired" };
      }

      // Consume the code and mark the account verified in one atomic step.
      await tx.verification.delete({ where: { id: record.id } });
      await tx.user.update({
        where: { id: user.id },
        data: { emailVerified: true },
      });
      return { status: "verified", userId: user.id };
    });
  } catch (error) {
    console.error("[verificationService.verifyVerificationToken]", error);
    return { status: "server_error" };
  }
}

/**
 * Sends a verification code email for the signed-in user. Always returns a
 * generic result (no account enumeration — the caller is already
 * authenticated, so no email address is ever probed). Invalidates any
 * previous code before issuing a new one.
 */
export async function issueVerificationEmail(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, emailVerified: true },
  });
  if (!user) return { sent: false, reason: "no_account" };

  if (user.emailVerified) {
    return { sent: false, reason: "already_verified" };
  }

  const { token: code, expiresAt } = await createVerificationToken(user.id);

  await sendVerificationEmail({
    to: user.email,
    code,
    purpose: "verification",
    expiresInMinutes: getTtlMinutes(),
  });

  return { sent: true };
}
