// ─── AMBER PAY — USSD Admin Stats ─────────────────────────────────────────────
//
// GET /api/admin/ussd
//
// Returns USSD session stats, active sessions, and recent activity
// for the admin dashboard. Admin-only endpoint.

import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/serverAuth";
import authAdmin from "@/middlewares/authAdmin";
import prisma from "@/lib/prisma";

export async function GET(request) {
    try {
        const session = await getSessionFromRequest(request);
        const userId = session?.user?.id;
        if (!userId) {
            return NextResponse.json({ error: "not authorized" }, { status: 401 });
        }

        const isAdmin = await authAdmin(userId);
        if (!isAdmin) {
            return NextResponse.json({ error: "Not authorized." }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const days = Math.min(Number(searchParams.get("days") || 7), 90);
        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

        // USSD users are identified by phone — count unique phones with wallets
        // that have recent USSD transaction metadata
        const [
            totalUsers,
            totalWallets,
            recentTransactions,
            topUpStats,
            withdrawalStats,
            p2pStats,
            activeAgents,
        ] = await Promise.all([
            // Total users with phone numbers (USSD-capable)
            prisma.user.count({ where: { phone: { not: null } } }),

            // Total active wallets
            prisma.wallet.count({ where: { status: "active" } }),

            // Recent wallet transactions (proxy for USSD activity)
            prisma.walletTransaction.findMany({
                where: { createdAt: { gte: since } },
                orderBy: { createdAt: "desc" },
                take: 100,
                select: {
                    id: true,
                    type: true,
                    amount: true,
                    description: true,
                    createdAt: true,
                    userId: true,
                },
            }),

            // Top-up stats
            prisma.topUpRequest.aggregate({
                where: { createdAt: { gte: since } },
                _sum: { amount: true },
                _count: true,
            }),

            // Withdrawal stats
            prisma.withdrawalRequest.aggregate({
                where: { createdAt: { gte: since } },
                _sum: { amount: true },
                _count: true,
            }),

            // P2P transfer stats
            prisma.p2PTransfer.aggregate({
                where: { createdAt: { gte: since }, status: "completed" },
                _sum: { amount: true, fee: true },
                _count: true,
            }),

            // Active agents
            prisma.agent.count({ where: { status: "active" } }),
        ]);

        // Transaction breakdown by type
        const typeBreakdown = {};
        for (const tx of recentTransactions) {
            typeBreakdown[tx.type] = (typeBreakdown[tx.type] || 0) + 1;
        }

        // Daily volume for the chart (last N days)
        const dailyVolume = [];
        for (let i = days - 1; i >= 0; i--) {
            const dayStart = new Date(Date.now() - (i + 1) * 24 * 60 * 60 * 1000);
            const dayEnd = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
            const dayLabel = dayStart.toLocaleDateString("en-SL", { month: "short", day: "numeric" });

            const dayTx = recentTransactions.filter(
                (t) => t.createdAt >= dayStart && t.createdAt < dayEnd
            );
            const deposits = dayTx
                .filter((t) => t.type === "TOPUP")
                .reduce((s, t) => s + t.amount, 0);
            const withdrawals = dayTx
                .filter((t) => t.type === "WITHDRAWAL")
                .reduce((s, t) => s + Math.abs(t.amount), 0);
            const p2pSends = dayTx
                .filter((t) => t.type === "P2P_SEND")
                .reduce((s, t) => s + Math.abs(t.amount), 0);

            dailyVolume.push({
                date: dayLabel,
                deposits: Math.round(deposits * 100) / 100,
                withdrawals: Math.round(withdrawals * 100) / 100,
                p2pSends: Math.round(p2pSends * 100) / 100,
                count: dayTx.length,
            });
        }

        return NextResponse.json({
            overview: {
                ussdUsers: totalUsers,
                activeWallets: totalWallets,
                activeAgents,
                recentTransactions: recentTransactions.length,
            },
            topups: {
                count: topUpStats._count || 0,
                totalAmount: topUpStats._sum.amount || 0,
            },
            withdrawals: {
                count: withdrawalStats._count || 0,
                totalAmount: withdrawalStats._sum.amount || 0,
            },
            p2p: {
                count: p2pStats._count || 0,
                totalAmount: p2pStats._sum.amount || 0,
                totalFees: p2pStats._sum.fee || 0,
            },
            typeBreakdown,
            dailyVolume,
            recentActivity: recentTransactions.slice(0, 20).map((t) => ({
                id: t.id,
                type: t.type,
                amount: t.amount,
                description: t.description,
                createdAt: t.createdAt,
            })),
        });
    } catch (error) {
        console.error("[GET /api/admin/ussd]", error);
        return NextResponse.json({ error: "Unable to fetch USSD stats." }, { status: 500 });
    }
}
