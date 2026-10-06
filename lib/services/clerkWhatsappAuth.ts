/**
 * Turns a phone number that we have already verified over WhatsApp into an
 * active Clerk session.
 *
 * Clerk cannot deliver OTP codes through WhatsApp, so the code is sent and
 * verified by us (lib/services/whatsappOtpService.ts) and Clerk is only asked
 * for the *session*: we resolve (or create) the Clerk user for that number and
 * mint a one-time sign-in token ("ticket") the browser exchanges for a session
 * via `signIn.create({ strategy: "ticket", ticket })`.
 *
 * The ticket is short-lived (2 minutes) and single-use. The client never sees a
 * Clerk secret — only the opaque ticket.
 *
 * Note: a brand-new Clerk user is mirrored into our Postgres `user` table by the
 * existing Clerk webhook -> Inngest pipeline, so buyer features (cart, orders,
 * wallet) work immediately after the first WhatsApp sign-in.
 */
import { clerkClient } from "@clerk/nextjs/server";

const TICKET_TTL_SECONDS = 120;

export type WhatsappSignInTicketResult =
  | { ok: true; ticket: string; userId: string; created: boolean }
  | { ok: false; reason: "not_configured" | "clerk_error"; message: string };

function toE164(digits: string): string {
  return `+${digits}`;
}

function isConfigured(): boolean {
  return Boolean(process.env.CLERK_SECRET_KEY);
}

export async function findClerkUserIdByPhone(digits: string): Promise<string | null> {
  const client = await clerkClient();
  const { data } = await client.users.getUserList({
    phoneNumber: [toE164(digits)],
    limit: 1,
  });
  return data[0]?.id ?? null;
}

/**
 * Resolve the Clerk user for a verified phone number, creating one when this is
 * the buyer's first visit. Creation is race-safe: if two requests create the
 * same number at once Clerk rejects the second, and we re-read the winner.
 */
export async function findOrCreateClerkUserByPhone(
  digits: string
): Promise<{ userId: string; created: boolean }> {
  const existing = await findClerkUserIdByPhone(digits);
  if (existing) return { userId: existing, created: false };

  try {
    const client = await clerkClient();
    const created = await client.users.createUser({
      phoneNumber: [toE164(digits)],
      skipPasswordRequirement: true,
    });
    return { userId: created.id, created: true };
  } catch (error) {
    // The number was created between our lookup and the create call (or the
    // instance rejects unverified numbers) — re-read before giving up.
    const retry = await findClerkUserIdByPhone(digits);
    if (retry) return { userId: retry, created: false };
    throw error;
  }
}

export async function createWhatsappSignInTicket(userId: string): Promise<string> {
  const client = await clerkClient();
  const { token } = await client.signInTokens.createSignInToken({
    userId,
    expiresInSeconds: TICKET_TTL_SECONDS,
  });
  return token;
}

/**
 * Full step: verified WhatsApp number -> Clerk sign-in ticket.
 * Only call this after verifyWhatsappOtp() returned `verified`.
 */
export async function signInWithVerifiedWhatsappNumber(
  digits: string
): Promise<WhatsappSignInTicketResult> {
  if (!isConfigured()) {
    console.error(
      "[clerkWhatsappAuth] CLERK_SECRET_KEY is not set — cannot mint a WhatsApp sign-in ticket."
    );
    return {
      ok: false,
      reason: "not_configured",
      message: "Sign-in is temporarily unavailable. Please try again shortly.",
    };
  }

  try {
    const { userId, created } = await findOrCreateClerkUserByPhone(digits);
    const ticket = await createWhatsappSignInTicket(userId);
    return { ok: true, ticket, userId, created };
  } catch (error) {
    console.error(
      "[clerkWhatsappAuth] failed to create a sign-in ticket",
      error instanceof Error ? error.message : String(error)
    );
    return {
      ok: false,
      reason: "clerk_error",
      message: "We couldn't complete sign-in. Please try again.",
    };
  }
}
