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

        const orders = await prisma.order.findMany({
            where: { storeId },
            orderBy: { createdAt: "desc" },
            select: { id: true, total: true, status: true, createdAt: true },
        });

        const products = await prisma.product.findMany({
            where: { storeId },
            select: { id: true, name: true, category: true, createdAt: true },
        });

        const ratings = await prisma.rating.findMany({
            where: { productId: { in: products.map((product) => product.id) } },
            include: {
                user: { select: { id: true, name: true, image: true } },
                product: { select: { id: true, name: true, images: true } },
            },
        });

        const totalEarnings = orders.reduce((acc, order) => acc + Number(order.total || 0), 0);
        const averageRating = ratings.length > 0
            ? (ratings.reduce((acc, rating) => acc + Number(rating.rating || 0), 0) / ratings.length).toFixed(1)
            : "0.0";

        const now = new Date();
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthlyOrders = orders.filter((order) => order.createdAt >= currentMonthStart);
        const monthlyRevenue = monthlyOrders.reduce((acc, order) => acc + Number(order.total || 0), 0);

        const revenueSeries = Array.from({ length: 6 }, (_, index) => {
            const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
            const monthOrders = orders.filter((order) => {
                const createdAt = new Date(order.createdAt);
                return createdAt.getMonth() === date.getMonth() && createdAt.getFullYear() === date.getFullYear();
            });

            return {
                month: date.toLocaleString("en-US", { month: "short" }),
                revenue: monthOrders.reduce((acc, order) => acc + Number(order.total || 0), 0),
            };
        });

        const categoryCounts = products.reduce((acc, product) => {
            const category = product.category || "General";
            acc[category] = (acc[category] || 0) + 1;
            return acc;
        }, {});

        const topCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "General";

        const dashboardData = {
            ratings,
            totalOrders: orders.length,
            totalEarnings: Math.round(totalEarnings),
            totalProducts: products.length,
            averageRating: Number(averageRating),
            monthlyRevenue: Math.round(monthlyRevenue),
            monthlyOrders: monthlyOrders.length,
            averageOrderValue: orders.length > 0 ? Math.round(totalEarnings / orders.length) : 0,
            recentOrders: orders.slice(0, 5),
            topCategory,
            revenueSeries,
        };

        return NextResponse.json({ dashboardData });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Unable to fetch dashboard data." }, { status: 400 });
    }
}
