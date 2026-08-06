// ─────────────────────────────────────────────────────────────────────────────
// FILEPATH: app/api/admin/dashboard/route.js
// ─────────────────────────────────────────────────────────────────────────────
import prisma from "@/lib/prisma";
import authAdmin from "@/middlewares/authAdmin";
import { getSessionFromRequest } from "@/lib/serverAuth";
import { NextResponse } from "next/server";

export async function GET(request) {
    try {
        const session = await getSessionFromRequest(request);
        const userId = session?.user?.id;
        const isAdmin = await authAdmin(userId);

        if (!isAdmin) {
            return NextResponse.json({ error: "Not authorized." }, { status: 403 });
        }

        const [orders, stores, products, allOrders, recentOrders, pendingStores, approvedStores, activeStores] = await Promise.all([
            prisma.order.count(),
            prisma.store.count(),
            prisma.product.count(),
            prisma.order.findMany({
                select: { createdAt: true, total: true, status: true },
            }),
            prisma.order.findMany({
                take: 5,
                orderBy: { createdAt: "desc" },
                select: {
                    id: true,
                    total: true,
                    status: true,
                    createdAt: true,
                    user: { select: { name: true } },
                    store: { select: { name: true } },
                },
            }),
            prisma.store.count({ where: { status: "pending" } }),
            prisma.store.count({ where: { status: "approved" } }),
            prisma.store.count({ where: { isActive: true } }),
        ]);

        const revenue = allOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
        const averageOrderValue = orders > 0 ? revenue / orders : 0;

        return NextResponse.json({
            dashboardData: {
                orders,
                stores,
                products,
                revenue: Number(revenue).toFixed(2),
                averageOrderValue: Number(averageOrderValue).toFixed(2),
                pendingStores,
                approvedStores,
                activeStores,
                allOrders,
                recentOrders,
            },
        });
    } catch (error) {
        console.error("[GET /api/admin/dashboard]", error);
        return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
    }
}