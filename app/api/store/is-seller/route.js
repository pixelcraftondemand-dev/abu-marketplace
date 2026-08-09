import prisma from "@/lib/prisma";
import authSeller from "@/middlewares/authSeller";
import { getSessionFromRequest } from "@/lib/serverAuth";
import { NextResponse } from "next/server";

// GET /api/store/is-seller
// Returns { isSeller: true, storeInfo: {...} } for approved/active sellers,
// { isSeller: false } for signed-in non-sellers, or 401 when unauthenticated.
// Returning 200 (not 401) for non-sellers keeps the Navbar/account pages from
// logging a noisy 401 on every page load for the common non-seller case.
export async function GET(request) {
    try {
        const session = await getSessionFromRequest(request);
        const userId = session?.user?.id;
        if (!userId) {
            return NextResponse.json({ error: "not authorized" }, { status: 401 });
        }

        // authSeller returns the store id for approved/active sellers, falsy otherwise.
        const storeId = await authSeller(userId);
        if (!storeId) {
            return NextResponse.json({ isSeller: false });
        }

        const storeInfo = await prisma.store.findUnique({
            where: { userId },
            select: {
                id: true,
                name: true,
                username: true,
                description: true,
                address: true,
                status: true,
                isActive: true,
                logo: true,
                email: true,
                contact: true,
                createdAt: true,
            },
        });

        return NextResponse.json({ isSeller: true, storeInfo });
    } catch (error) {
        console.error("[is-seller]", error);
        return NextResponse.json({ error: "Unable to verify seller access." }, { status: 500 });
    }
}
