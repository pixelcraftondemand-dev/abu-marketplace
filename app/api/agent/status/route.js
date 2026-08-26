// ─── AMBER PAY — Agent Status Check ───────────────────────────────────────────
//
// GET /api/agent/status
//
// Returns whether the current user is an active AMBER PAY agent and their
// agent profile info. Used by the AgentLayout to gate the dashboard.

import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/serverAuth";
import prisma from "@/lib/prisma";

export async function GET(request) {
    try {
        const session = await getSessionFromRequest(request);
        const userId = session?.user?.id;
        if (!userId) {
            return NextResponse.json({ isAgent: false });
        }

        const agent = await prisma.agent.findUnique({
            where: { userId },
            select: {
                id: true,
                businessName: true,
                location: true,
                city: true,
                status: true,
                floatBalance: true,
                dailyLimit: true,
                monthlyLimit: true,
                commissionRate: true,
                createdAt: true,
            },
        });

        if (!agent) {
            return NextResponse.json({ isAgent: false });
        }

        return NextResponse.json({
            isAgent: true,
            agent,
        });
    } catch (error) {
        console.error("[GET /api/agent/status]", error);
        return NextResponse.json({ isAgent: false });
    }
}
