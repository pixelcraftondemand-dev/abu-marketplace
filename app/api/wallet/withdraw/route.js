// ─── AMBER PAY — Create Withdrawal Request ────────────────────────────────────
//
// POST /api/wallet/withdraw
//
// Creates a withdrawal request. The user specifies how much they want to
// withdraw. An agent nearby will see this request and process it (cash-out).
//
// Flow:
//   1. User creates withdrawal request with amount
//   2. System generates a short agentRef code (e.g. "X3K9M2")
//   3. User shows the code to a physical agent
//   4. Agent confirms cash given → wallet is debited

import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionFromRequest } from "@/lib/serverAuth";
import { walletTopupRateLimiter } from "@/lib/security";
import { roundMoney } from "@/lib/services/walletService";
import prisma from "@/lib/prisma";

const WITHDRAW_MIN = 1;
const WITHDRAW_MAX = 10000;

const withdrawSchema = z.object({
    amount: z.number().min(WITHDRAW_MIN).max(WITHDRAW_MAX),
});

/** Generate a short agent reference code (6 chars, no ambiguous chars). */
function generateAgentRef() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let ref = "";
    for (let i = 0; i < 6; i++) {
        ref += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return ref;
}

export async function POST(request) {
    try {
        const session = await getSessionFromRequest(request);
        const userId = session?.user?.id;
        if (!userId) {
            return NextResponse.json({ error: "not authorized" }, { status: 401 });
        }

        const rl = await walletTopupRateLimiter.check(userId);
        if (!rl.allowed) {
            return NextResponse.json(
                { error: "Too many attempts. Please wait." },
                { status: 429, headers: { "Retry-After": String(rl.retryAfter || 60) } }
            );
        }

        let parsed;
        try {
            const body = await request.json();
            const result = withdrawSchema.safeParse(body);
            if (!result.success) {
                return NextResponse.json(
                    { error: "Invalid withdrawal details." },
                    { status: 422 }
                );
            }
            parsed = result.data;
        } catch {
            return NextResponse.json({ error: "Invalid withdrawal details." }, { status: 400 });
        }

        // Check wallet balance
        const wallet = await prisma.wallet.findUnique({ where: { userId } });
        if (!wallet) {
            return NextResponse.json({ error: "No wallet found." }, { status: 404 });
        }
        if (wallet.status !== "active") {
            return NextResponse.json({ error: "Wallet is not active." }, { status: 403 });
        }
        if (wallet.balance < parsed.amount) {
            return NextResponse.json(
                { error: "Insufficient wallet balance.", balance: wallet.balance, requested: parsed.amount },
                { status: 422 }
            );
        }

        const agentRef = generateAgentRef();

        const withdrawal = await prisma.withdrawalRequest.create({
            data: {
                walletId: wallet.id,
                userId,
                amount: parsed.amount,
                currency: "USD",
                status: "pending",
                agentRef,
            },
        });

        return NextResponse.json({
            request: {
                id: withdrawal.id,
                agentRef,
                amount: withdrawal.amount,
                currency: withdrawal.currency,
                status: withdrawal.status,
            },
            message: "Take this code to an AMBER PAY agent to collect your cash.",
        });
    } catch (error) {
        console.error("[POST /api/wallet/withdraw]", error);
        return NextResponse.json(
            { error: "Unable to create withdrawal request." },
            { status: 500 }
        );
    }
}
