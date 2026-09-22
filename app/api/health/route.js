import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Never cached — an external monitor must always get a live answer.
export const dynamic = "force-dynamic";

/**
 * Real database connectivity check, capped so a dead pool/DB can't hang a
 * monitor ping. SELECT 1 through an interactive transaction with a hard
 * timeout (5s query, 3s pool wait).
 */
async function checkDatabase() {
  try {
    await prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT 1`;
      },
      { timeout: 5000, maxWait: 3000 }
    );
    return true;
  } catch {
    return false;
  }
}

export async function GET() {
    const requiredEnv = [
        "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
        "CLERK_SECRET_KEY",
        "DATABASE_URL",
        "DIRECT_URL",
    ];
    const missing = requiredEnv.filter((key) => !process.env[key]);
    const databaseUp = await checkDatabase();
    const isProduction = process.env.NODE_ENV === "production";

    const ok = missing.length === 0 && databaseUp;

    return NextResponse.json(
      {
        ok,
        database: databaseUp ? "up" : "down",
        ...(isProduction ? {} : {
            missing,
            clerkPublishableKeySet: Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY),
            clerkSecretKeySet: Boolean(process.env.CLERK_SECRET_KEY),
            databaseUrlSet: Boolean(process.env.DATABASE_URL),
            directUrlSet: Boolean(process.env.DIRECT_URL),
        }),
      },
      // Unhealthy -> 503, so a monitor pinging this endpoint gets a real
      // pass/fail from the status code alone (not a 200 regardless of DB state).
      { status: ok ? 200 : 503 }
    );
}
