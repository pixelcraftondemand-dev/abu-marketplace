// ─── AMBER PAY — Agent: List Top-Up Requests ──────────────────────────────────
//
// GET /api/agent/requests
//
// Returns pending top-up requests that agents can pick up and process.
// Optional query params:
//   - status: filter by status (pending | matched | processing | completed)
//   - limit: max results (default 20, max 50)

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

        // Rate limit
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

        // If processing, only show requests assigned to this agent
        if (status === "processing" || status === "matched") {
            where.agentId = agent.id;
        }

        const requests = await prisma.topUpRequest.findMany({
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

        // Also get summary stats
        const [pendingCount, processingCount, completedToday] = await Promise.all([
            prisma.topUpRequest.count({ where: { status: "pending" } }),
            prisma.topUpRequest.count({ where: { status: "processing", agentId: agent.id } }),
            prisma.topUpRequest.count({
                where: {
                    agentId: agent.id,
                    status: "completed",
                    completedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
                },
            }),
        ]);

        const completedTodaySum = await prisma.topUpRequest.aggregate({
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
                earnedToday: (completedTodaySum._sum.amount || 0) * (agent.commissionRate || 0.02),
            },
        });
    } catch (error) {
        console.error("[GET /api/agent/requests]", error);
        return NextResponse.json({ error: "Unable to fetch requests." }, { status: 500 });
    }
}
