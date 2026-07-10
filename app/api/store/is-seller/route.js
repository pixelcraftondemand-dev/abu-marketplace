import prisma from "@/lib/prisma";
import authSeller from "@/middlewares/authSeller";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// GET /api/store/is-seller
// Returns { isSeller: true, storeInfo: {...} } or 401
export async function GET(request) {
    try {
        const { userId } = getAuth(request);
        const isSeller = await authSeller(userId);

        if (!isSeller) {
            return NextResponse.json({ error: "not authorized" }, { status: 401 });
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
        return NextResponse.json({ error: "Unable to verify seller access." }, { status: 400 });
    }
}
