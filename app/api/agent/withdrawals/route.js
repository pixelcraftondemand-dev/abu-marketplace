// ─── AMBER PAY — Agent: List Withdrawal Requests ──────────────────────────────
//
// GET /api/agent/withdrawals
//
// Returns pending withdrawal requests that agents can pick up and process.
// The user has requested cash out from their wallet; the agent hands over
// cash and the wallet is debited.

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

        // Verify the user is an active agent
        const agent = await prisma.agent.findUnique({
            where: { userId },
            select: { id: true, status: true },
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
        const status = searchParams.get("status") || "pending";
        const rawLimit = Number(searchParams.get("limit") || 20);
        const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(Math.floor(rawLimit), 1), 50) : 20;

        const where = { status };
        if (status === "processing" || status === "matched") {
            where.agentId = agent.id;
        }

        const requests = await prisma.withdrawalRequest.findMany({
            where,
            orderBy: { createdAt: "desc" },
            take: limit,
            select: {
                id: true,
                amount: true,
                currency: true,
                status: true,
                agentRef: true,
                notes: true,
                createdAt: true,
                matchedAt: true,
                user: {
                    select: { id: true, name: true, email: true },
                },
            },
        });

        // Summary stats for this agent
        const [pendingCount, processingCount, completedToday] = await Promise.all([
            prisma.withdrawalRequest.count({ where: { status: "pending" } }),
            prisma.withdrawalRequest.count({ where: { status: "processing", agentId: agent.id } }),
            prisma.withdrawalRequest.count({
                where: {
                    agentId: agent.id,
                    status: "completed",
                    completedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
                },
            }),
        ]);

        const completedTodaySum = await prisma.withdrawalRequest.aggregate({
            where: {
                agentId: agent.id,
                status: "completed",
                completedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
            },
            _sum: { amount: true },
        });

        return NextResponse.json({
            requests,
            stats: {
                pending: pendingCount,
                processing: processingCount,
                completedToday,
                disbursedToday: completedTodaySum._sum.amount || 0,
            },
        });
    } catch (error) {
        console.error("[GET /api/agent/withdrawals]", error);
        return NextResponse.json({ error: "Unable to fetch withdrawal requests." }, { status: 500 });
    }
}
