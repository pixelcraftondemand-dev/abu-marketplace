import prisma from "@/lib/prisma";
import authSeller from "@/middlewares/authSeller";
import { getSessionFromRequest } from "@/lib/serverAuth";
import { NextResponse } from "next/server";

export async function GET(request) {
    try {
        const session = await getSessionFromRequest(request);
        const userId = session?.user?.id;
        const storeId = await authSeller(userId);

        if (!storeId) {
            return NextResponse.json({ error: "not authorized" }, { status: 401 });
        }

        const [orders, products, store] = await Promise.all([
            prisma.order.findMany({
                where: { storeId },
                orderBy: { createdAt: "desc" },
                select: { id: true, total: true, status: true, createdAt: true },
            }),
            prisma.product.findMany({
                where: { storeId },
                select: { id: true, name: true, category: true, createdAt: true },
            }),
            prisma.store.findUnique({
                where: { id: storeId },
                select: { name: true, username: true },
            }),
        ]);

        const ratings = await prisma.rating.findMany({
            where: { productId: { in: products.map((product) => product.id) } },
            include: {
                user: { select: { id: true, name: true, image: true } },
                product: { select: { id: true, name: true, category: true, images: true } },
            },
        });

        const activeOrders = orders.filter((order) => order.status !== "CANCELLED");
        const totalSales = activeOrders.reduce((acc, order) => acc + Number(order.total || 0), 0);
        const averageRating = ratings.length > 0
            ? (ratings.reduce((acc, rating) => acc + Number(rating.rating || 0), 0) / ratings.length).toFixed(1)
            : "0.0";

        const now = new Date();
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthlyOrders = activeOrders.filter((order) => order.createdAt >= currentMonthStart);
        const monthlySales = monthlyOrders.reduce((acc, order) => acc + Number(order.total || 0), 0);

        const salesSeries = Array.from({ length: 6 }, (_, index) => {
            const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
            const monthOrders = activeOrders.filter((order) => {
                const createdAt = new Date(order.createdAt);
                return createdAt.getMonth() === date.getMonth() && createdAt.getFullYear() === date.getFullYear();
            });

            return {
                month: date.toLocaleString("en-US", { month: "short" }),
                sales: monthOrders.reduce((acc, order) => acc + Number(order.total || 0), 0),
            };
        });

        const categoryCounts = products.reduce((acc, product) => {
            const category = product.category || "General";
            acc[category] = (acc[category] || 0) + 1;
            return acc;
        }, {});

        const topCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "General";

        const dashboardData = {
            store,
            ratings,
            totalOrders: activeOrders.length,
            totalSales: Math.round(totalSales),
            totalProducts: products.length,
            averageRating: Number(averageRating),
            monthlySales: Math.round(monthlySales),
            monthlyOrders: monthlyOrders.length,
            pendingOrders: activeOrders.filter(
                (order) => !["DELIVERED", "PAID"].includes(order.status)
            ).length,
            averageOrderValue: activeOrders.length > 0 ? Math.round(totalSales / activeOrders.length) : 0,
            recentOrders: activeOrders.slice(0, 5),
            topCategory,
            salesSeries,
        };

        return NextResponse.json({ dashboardData });
    } catch (error) {
        console.error("[GET /api/store/dashboard]", error);
        return NextResponse.json({ error: "Unable to fetch dashboard data." }, { status: 500 });
    }
}
