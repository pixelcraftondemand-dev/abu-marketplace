import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/serverAuth";

/**
 * Reports whether the signed-in user has completed email verification.
 *
 * Used by the client-side VerificationGate to block unverified accounts
 * (regardless of sign-in method — email/password or OAuth) until they enter
 * their OTP. The flag is always read from the database on every call, so a
 * stale page or forged client state can never report "verified".
 */
export async function GET(request) {
  try {
    const session = await getSessionFromRequest(request);
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "not authorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
      select: { emailVerified: true },
    });

    return NextResponse.json({ verified: Boolean(user?.emailVerified) });
  } catch (error) {
    console.error("[GET /api/auth/status]", error);
    return NextResponse.json({ verified: false }, { status: 500 });
  }
}
