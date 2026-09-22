export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { sendNewDeviceAlert } from "@/lib/deviceAlertEmail";

/**
 * POST /api/auth/device-check
 *
 * Body: { fingerprint: string, deviceInfo: object }
 *
 * Checks whether the current device fingerprint is known for the signed-in
 * user. If not, records it and sends a security alert email. Always returns
 * { known: boolean } so the client can display an appropriate message.
 */
export async function POST(req) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    const { fingerprint, deviceInfo } = await req.json();

    if (!fingerprint || typeof fingerprint !== "string") {
      return NextResponse.json({ error: "Fingerprint is required." }, { status: 400 });
    }

    // Look up the user's email from the DB (we store it in the User model).
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    // Check if this fingerprint is already known for this user.
    const existing = await prisma.deviceSession.findUnique({
      where: {
        userId_fingerprintHash: {
          userId,
          fingerprintHash: fingerprint,
        },
      },
    });

    if (existing) {
      // Known device — update lastSeenAt and return early.
      await prisma.deviceSession.update({
        where: { id: existing.id },
        data: { lastSeenAt: new Date() },
      });
      return NextResponse.json({ known: true });
    }

    // New device — record it and send alert email.
    await prisma.deviceSession.create({
      data: {
        userId,
        fingerprintHash: fingerprint,
        deviceInfo: deviceInfo || {},
        lastSeenAt: new Date(),
      },
    });

    // Send alert asynchronously — don't block the response if email fails.
    sendNewDeviceAlert({
      email: user.email,
      deviceInfo: deviceInfo || {},
      timestamp: new Date().toISOString(),
    }).catch((err) => {
      console.error("[device-check] Failed to send alert email:", err?.message || err);
    });

    return NextResponse.json({ known: false });
  } catch (error) {
    console.error("[POST /api/auth/device-check]", error?.message || error);
    return NextResponse.json(
      { error: "Device check failed." },
      { status: 500 }
    );
  }
}
