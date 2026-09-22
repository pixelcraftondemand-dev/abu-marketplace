// ─── AMBER PAY — Agent Cash-Out ───────────────────────────────────────────────
//
// POST /api/agent/cash-out
//
// An agent processes a user's withdrawal request. The agent hands over
// cash to the user, and the user's wallet is debited atomically.
//
// Flow:
//   1. User creates withdrawal request (from wallet page — future)
//   2. User shows agentRef code to an agent
//   3. Agent confirms cash handed over
//   4. User's wallet is debited

import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionFromRequest } from "@/lib/serverAuth";
import { agentActionRateLimiter } from "@/lib/security";
import { InsufficientFundsError, AGENT_COMMISSION_RATE } from "@/lib/services/amberPayService";
import { roundMoney } from "@/lib/services/walletService";
import prisma from "@/lib/prisma";

const cashOutSchema = z.object({
    agentRef: z.string().length(6).regex(/^[A-Z0-9]{6}$/),
    notes: z.string().max(200).optional().nullable(),
});

export async function POST(request) {
    try {
        const session = await getSessionFromRequest(request);
        const userId = session?.user?.id;
        if (!userId) {
            return NextResponse.json({ error: "not authorized" }, { status: 401 });
        }

        // Verify the user is an active agent
        const agent = await prisma.agent.findUnique({
            where: { userId },
            select: { id: true, status: true, businessName: true, floatBalance: true },
        });

        if (!agent || agent.status !== "active") {
            return NextResponse.json(
                { error: "You are not an active AMBER PAY agent." },
                { status: 403 }
            );
        }

        // Rate limit
        const rl = await agentActionRateLimiter.check(userId);
        if (!rl.allowed) {
            return NextResponse.json(
                { error: "Too many requests." },
                { status: 429, headers: { "Retry-After": String(rl.retryAfter || 60) } }
            );
        }

        // Validate input
        let parsed;
        try {
            const body = await request.json();
            const result = cashOutSchema.safeParse(body);
            if (!result.success) {
                return NextResponse.json(
                    { error: "Invalid cash-out details.", details: result.error.issues.map((i) => i.path.join(".")) },
                    { status: 422 }
                );
            }
            parsed = result.data;
        } catch {
            return NextResponse.json({ error: "Invalid cash-out details." }, { status: 400 });
        }

        // Find the withdrawal request by agentRef
        const withdrawal = await prisma.withdrawalRequest.findFirst({
            where: { agentRef: parsed.agentRef },
            select: { id: true, status: true, amount: true, userId: true, walletId: true },
        });

        if (!withdrawal) {
            return NextResponse.json(
                { error: "No withdrawal request found with that reference code." },
                { status: 404 }
            );
        }

        if (withdrawal.status !== "pending") {
            return NextResponse.json(
                { error: `This request has already been ${withdrawal.status}.` },
                { status: 409 }
            );
        }

        const fee = roundMoney(withdrawal.amount * AGENT_COMMISSION_RATE);

        // Atomic transaction: debit wallet + complete withdrawal + record agent tx
        const result = await prisma.$transaction(async (tx) => {
            // Find the user's wallet
            const wallet = await tx.wallet.findUnique({ where: { id: withdrawal.walletId } });
            if (!wallet) throw new Error("WALLET_NOT_FOUND");
            if (wallet.status !== "active") throw new Error("WALLET_NOT_ACTIVE");

            // Atomic debit: only succeeds if balance >= amount
            const debitResult = await tx.wallet.updateMany({
                where: { id: wallet.id, balance: { gte: withdrawal.amount } },
                data: { balance: { decrement: withdrawal.amount } },
            });
            if (debitResult.count !== 1) {
                throw new InsufficientFundsError(wallet.balance, withdrawal.amount);
            }

            // Record the withdrawal in the wallet transaction ledger
            await tx.walletTransaction.create({
                data: {
                    walletId: wallet.id,
                    userId: withdrawal.userId,
                    type: "WITHDRAWAL",
                    amount: -withdrawal.amount,
                    balanceAfter: roundMoney(wallet.balance - withdrawal.amount),
                    currency: "USD",
                    referenceType: "withdrawal_request",
                    referenceId: withdrawal.id,
                    description: `Cash-out via agent (ref: ${parsed.agentRef})`,
                    metadata: { agentId: agent.id, fee },
                },
            });

            // Complete the withdrawal request
            await tx.withdrawalRequest.update({
                where: { id: withdrawal.id },
                data: {
                    agentId: agent.id,
                    status: "completed",
                    matchedAt: new Date(),
                    completedAt: new Date(),
                },
            });

            // Record the agent transaction
            await tx.agentTransaction.create({
                data: {
                    agentId: agent.id,
                    userId: withdrawal.userId,
                    type: "CASH_OUT",
                    amount: withdrawal.amount,
                    fee,
                    status: "confirmed",
                    agentRef: parsed.agentRef,
                    notes: parsed.notes,
                    confirmedAt: new Date(),
                },
            });

            // Deduct from agent's float (they gave out cash)
            await tx.agent.update({
                where: { id: agent.id },
                data: { floatBalance: { decrement: withdrawal.amount } },
            });

            return {
                walletBalance: roundMoney(wallet.balance - withdrawal.amount),
                agentFloat: roundMoney(agent.floatBalance - withdrawal.amount),
            };
        });

        return NextResponse.json({
            cashOut: {
                requestId: withdrawal.id,
                amount: withdrawal.amount,
                fee,
                walletBalance: result.walletBalance,
                agentFloat: result.agentFloat,
                agent: agent.businessName,
            },
            message: `Successfully disbursed $${withdrawal.amount.toFixed(2)} cash. Wallet debited.`,
        });
    } catch (error) {
        if (error instanceof InsufficientFundsError) {
            return NextResponse.json(
                { error: "User has insufficient wallet balance.", balance: error.balance, requested: error.requested },
                { status: 422 }
            );
        }
        console.error("[POST /api/agent/cash-out]", error);
        return NextResponse.json(
            { error: "Unable to process cash-out." },
            { status: 500 }
        );
    }
}
