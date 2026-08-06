import prisma from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/serverAuth";
import { NextResponse } from "next/server";
import { roundMoney } from "@/lib/services/walletService";

export async function GET(request) {
  try {
    const session = await getSessionFromRequest(request);
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "not authorized" }, { status: 401 });
    }

    // No wallet yet = zero balance (lazily created on first top-up).
    const wallet = await prisma.wallet.findUnique({
      where: { userId },
      select: { balance: true },
    });

    return NextResponse.json({
      balance: roundMoney(wallet?.balance ?? 0),
      currency: "USD", // canonical — the frontend converts for display
    });
  } catch (error) {
    console.error("[GET /api/wallet/balance]", error);
    return NextResponse.json({ error: "Unable to fetch wallet balance." }, { status: 400 });
  }
}
