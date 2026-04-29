// ─────────────────────────────────────────────────────────────────────────────
// FILEPATH: app/api/admin/stores/route.js
// ─────────────────────────────────────────────────────────────────────────────
import prisma from "@/lib/prisma";
import authAdmin from "@/middlewares/authAdmin";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function GET(request) {
    try {
        const { userId } = getAuth(request);
        const isAdmin = await authAdmin(userId);

        if (!isAdmin) {
            return NextResponse.json({ error: "Not authorized." }, { status: 403 });
        }

        const stores = await prisma.store.findMany({
            where:   { status: "approved" },
            include: {
                user: { select: { id: true, name: true, email: true, image: true } },
            },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json({ stores });
    } catch (error) {
        console.error("[GET /api/admin/stores]", error);
        return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
    }
}