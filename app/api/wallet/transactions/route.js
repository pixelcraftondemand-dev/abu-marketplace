import prisma from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/serverAuth";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const session = await getSessionFromRequest(request);
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "not authorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const rawLimit = Number(searchParams.get("limit") || 20);
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(Math.floor(rawLimit), 1), 50) : 20;

    const wallet = await prisma.wallet.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!wallet) {
      return NextResponse.json({ transactions: [] });
    }

    const transactions = await prisma.walletTransaction.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        type: true,
        amount: true,
        balanceAfter: true,
        description: true,
        referenceType: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ transactions });
  } catch (error) {
    console.error("[GET /api/wallet/transactions]", error);
    return NextResponse.json({ error: "Unable to fetch wallet transactions." }, { status: 400 });
  }
}
