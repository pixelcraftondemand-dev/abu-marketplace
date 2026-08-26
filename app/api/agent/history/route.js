// ─── AMBER PAY — Agent Transaction History ────────────────────────────────────
//
// GET /api/agent/history
//
// Returns all cash-in and cash-out transactions processed by this agent.
// Supports filtering by type (CASH_IN | CASH_OUT) and date range.

import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/serverAuth";
import { agentActionRateLimiter } from "@/lib/security";
import prisma from "@/lib/prisma";

export async function GET(request) {
    try {
        const session = await getSessionFromRequest(request);
        const userId = session?.user?.id;
        if (!userId) {
            return NextResponse.json({ error: "not authorized" }, { status: 401 });
        }

        const agent = await prisma.agent.findUnique({
            where: { userId },
            select: { id: true, status: true, commissionRate: true },
        });

        if (!agent || agent.status !== "active") {
            return NextResponse.json(
                { error: "You are not an active AMBER PAY agent." },
                { status: 403 }
            );
        }

        const rl = await agentActionRateLimiter.check(userId);
        if (!rl.allowed) {
            return NextResponse.json(
                { error: "Too many requests." },
                { status: 429, headers: { "Retry-After": String(rl.retryAfter || 60) } }
            );
        }

        const { searchParams } = new URL(request.url);
        const type = searchParams.get("type") || null; // CASH_IN | CASH_OUT | null (all)
        const rawLimit = Number(searchParams.get("limit") || 50);
        const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(Math.floor(rawLimit), 1), 100) : 50;
        const offset = Number(searchParams.get("offset") || 0);

        const where = { agentId: agent.id, status: "confirmed" };
        if (type && (type === "CASH_IN" || type === "CASH_OUT")) {
            where.type = type;
        }

        const [transactions, totalCount] = await Promise.all([
            prisma.agentTransaction.findMany({
                where,
                orderBy: { createdAt: "desc" },
                take: limit,
                skip: offset,
                select: {
                    id: true,
                    type: true,
                    amount: true,
                    fee: true,
                    status: true,
                    agentRef: true,
                    notes: true,
                    confirmedAt: true,
                    createdAt: true,
                    userId: true,
                },
            }),
            prisma.agentTransaction.count({ where }),
        ]);

        // Fetch user names for the transactions
        const userIds = [...new Set(transactions.map((t) => t.userId))];
        const users = await prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, name: true, email: true },
        });
        const userMap = new Map(users.map((u) => [u.id, u]));

        const enriched = transactions.map((t) => ({
            ...t,
            user: userMap.get(t.userId) || { name: "Unknown", email: "" },
        }));

        // Summary stats
        const [totalCashIn, totalCashOut, totalFees] = await Promise.all([
            prisma.agentTransaction.aggregate({
                where: { agentId: agent.id, status: "confirmed", type: "CASH_IN" },
                _sum: { amount: true },
                _count: true,
            }),
            prisma.agentTransaction.aggregate({
                where: { agentId: agent.id, status: "confirmed", type: "CASH_OUT" },
                _sum: { amount: true },
                _count: true,
            }),
            prisma.agentTransaction.aggregate({
                where: { agentId: agent.id, status: "confirmed" },
                _sum: { fee: true },
            }),
        ]);

        return NextResponse.json({
            transactions: enriched,
            pagination: {
                total: totalCount,
                limit,
                offset,
                hasMore: offset + limit < totalCount,
            },
            summary: {
                totalCashIn: totalCashIn._sum.amount || 0,
                totalCashInCount: totalCashIn._count || 0,
                totalCashOut: totalCashOut._sum.amount || 0,
                totalCashOutCount: totalCashOut._count || 0,
                totalFeesEarned: totalFees._sum.fee || 0,
            },
        });
    } catch (error) {
        console.error("[GET /api/agent/history]", error);
        return NextResponse.json({ error: "Unable to fetch history." }, { status: 500 });
    }
}
