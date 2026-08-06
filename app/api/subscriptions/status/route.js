import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/serverAuth";
import prisma from "@/lib/prisma";

export async function GET(request) {
  try {
    const session = await getSessionFromRequest(request);
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "not authorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        membershipTier: true,
        membershipStatus: true,
        membershipProviderId: true,
        membershipStartedAt: true,
        membershipEndsAt: true,
      },
    });

    return NextResponse.json({
      membership: {
        membershipTier: user?.membershipTier || null,
        status: user?.membershipStatus || "inactive",
        membershipProviderId: user?.membershipProviderId || null,
        membershipStartedAt: user?.membershipStartedAt || null,
        membershipEndsAt: user?.membershipEndsAt || null,
      },
    });
  } catch (error) {
    console.error("[subscriptions/status]", error);
    return NextResponse.json({ error: "Unable to load membership status." }, { status: 400 });
  }
}
