import crypto from "node:crypto";
import prisma from "@/lib/prisma";
import { sendAccountVerificationEmail } from "@/lib/verificationEmail";

const TOKEN_BYTES = 32; // 256 bits of entropy
const DEFAULT_TTL_HOURS = 24;

function getTtlHours() {
  const raw = Number(process.env.VERIFICATION_TOKEN_TTL_HOURS);
  if (Number.isFinite(raw) && raw > 0 && raw <= 168) return raw;
  return DEFAULT_TTL_HOURS;
}

/** Generates a cryptographically secure raw token (never stored in plaintext). */
export function generateVerificationToken() {
  return crypto.randomBytes(TOKEN_BYTES).toString("base64url");
}

/** SHA-256 hash of a token — the only form stored in the database. */
export function hashVerificationToken(token) {
  if (!token || typeof token !== "string") {
    throw new Error("Verification token is required.");
  }
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Creates a new single-use verification token for a user, invalidating any
 * previous ones. Returns the raw token so the caller can email it.
 */
export async function createVerificationToken(userId) {
  if (!userId) throw new Error("User id is required.");
  const rawToken = generateVerificationToken();
  const expiresAt = new Date(Date.now() + getTtlHours() * 60 * 60 * 1000);

  // Invalidate previous tokens (single live token per user at a time).
  await prisma.verification.deleteMany({ where: { identifier: userId } });

  await prisma.verification.create({
    data: {
      id: crypto.randomUUID(),
      identifier: userId,
      value: hashVerificationToken(rawToken),
      expiresAt,
    },
  });

  return { token: rawToken, expiresAt };
}

/**
 * Verifies a supplied token. Returns the outcome:
 *   { status: "verified", userId }
 *   { status: "already_verified", userId }
 *   { status: "invalid" | "expired" }
 *
 * The check + consumption happen atomically: the token row is deleted inside
 * the same transaction that marks the user verified, so a token can never be
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

      // Consume the token and mark the account verified in one atomic step.
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
 * Resends a verification email for the signed-in user. Always returns a
 * generic result (no account enumeration — the caller is already
 * authenticated, so no email address is ever probed). Invalidates any
 * previous token before issuing a new one.
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

  const { token, expiresAt } = await createVerificationToken(user.id);
  const baseUrl = (
    process.env.NEXT_PUBLIC_APP_URL || "https://abumarketplace.shop"
  ).replace(/\/+$/, "");
  const verificationUrl = `${baseUrl}/verify-email?token=${encodeURIComponent(token)}`;

  await sendAccountVerificationEmail({
    to: user.email,
    verificationUrl,
    expiresAt,
  });

  return { sent: true };
}
