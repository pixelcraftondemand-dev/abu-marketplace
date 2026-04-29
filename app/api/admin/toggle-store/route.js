// ─────────────────────────────────────────────────────────────────────────────
// FILEPATH: app/api/admin/toggle-store/route.js
// ─────────────────────────────────────────────────────────────────────────────
import prisma from "@/lib/prisma";
import authAdmin from "@/middlewares/authAdmin";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function POST(request) {
    try {
        const { userId } = getAuth(request);
        const isAdmin = await authAdmin(userId);

        if (!isAdmin) {
            return NextResponse.json({ error: "Not authorized." }, { status: 403 });
        }

        const { storeId } = await request.json();

        if (!storeId || typeof storeId !== "string" || !storeId.trim()) {
            return NextResponse.json({ error: "A valid storeId is required." }, { status: 422 });
        }

        const store = await prisma.store.findUnique({
            where:  { id: storeId.trim() },
            select: { id: true, isActive: true },
        });

        if (!store) {
            return NextResponse.json({ error: "Store not found." }, { status: 404 });
        }

        await prisma.store.update({
            where: { id: storeId.trim() },
            data:  { isActive: !store.isActive },
        });

        return NextResponse.json({
            message: `Store has been ${!store.isActive ? "activated" : "deactivated"} successfully.`,
        });
    } catch (error) {
        console.error("[POST /api/admin/toggle-store]", error);
        return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
    }
}