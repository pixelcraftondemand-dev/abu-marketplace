// ─────────────────────────────────────────────────────────────────────────────
// FILEPATH: app/api/admin/dashboard/route.js
// ─────────────────────────────────────────────────────────────────────────────
import prisma from "@/lib/prisma";
import authAdmin from "@/middlewares/authAdmin";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function GET(request) {
    try {
        const { userId, sessionClaims } = getAuth(request);
        const isAdmin = await authAdmin(userId, sessionClaims);

        if (!isAdmin) {
            return NextResponse.json({ error: "Not authorized." }, { status: 403 });
        }

        const [orders, stores, products, allOrders] = await Promise.all([
            prisma.order.count(),
            prisma.store.count(),
            prisma.product.count(),
            prisma.order.findMany({
                select: { createdAt: true, total: true },
            }),
        ]);

        const revenue = allOrders
            .reduce((sum, o) => sum + o.total, 0)
            .toFixed(2);

        return NextResponse.json({
            dashboardData: { orders, stores, products, revenue, allOrders },
        });
    } catch (error) {
        console.error("[GET /api/admin/dashboard]", error);
        return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
    }
}