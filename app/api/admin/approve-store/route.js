// ─────────────────────────────────────────────────────────────────────────────
// FILEPATH: app/api/admin/approve-store/route.js
// ─────────────────────────────────────────────────────────────────────────────
import prisma from "@/lib/prisma";
import authAdmin from "@/middlewares/authAdmin";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const ALLOWED_STATUSES = ["approved", "rejected"];

// ── GET /api/admin/approve-store ──────────────────────────────────────────────
// Returns all pending and rejected store applications for the admin panel.

export async function GET(request) {
    try {
        const { userId } = getAuth(request);
        const isAdmin = await authAdmin(userId);

        if (!isAdmin) {
            return NextResponse.json({ error: "Not authorized." }, { status: 403 });
        }

        const stores = await prisma.store.findMany({
            where:   { status: { in: ["pending", "rejected"] } },
            include: {
                user: { select: { id: true, name: true, email: true, image: true } },
            },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json({ stores });
    } catch (error) {
        console.error("[GET /api/admin/approve-store]", error);
        return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
    }
}

// ── POST /api/admin/approve-store ─────────────────────────────────────────────
// Approves or rejects a pending store.
// Body: { storeId: string, status: "approved" | "rejected" }

export async function POST(request) {
    try {
        const { userId } = getAuth(request);
        const isAdmin = await authAdmin(userId);

        if (!isAdmin) {
            return NextResponse.json({ error: "Not authorized." }, { status: 403 });
        }

        const { storeId, status } = await request.json();

        if (!storeId || typeof storeId !== "string" || !storeId.trim()) {
            return NextResponse.json({ error: "A valid storeId is required." }, { status: 422 });
        }

        if (!ALLOWED_STATUSES.includes(status)) {
            return NextResponse.json(
                { error: `Status must be one of: ${ALLOWED_STATUSES.join(", ")}.` },
                { status: 422 }
            );
        }

        const store = await prisma.store.findUnique({
            where:  { id: storeId.trim() },
            select: { id: true, status: true, name: true },
        });

        if (!store) {
            return NextResponse.json({ error: "Store not found." }, { status: 404 });
        }

        if (store.status === "approved" && status === "approved") {
            return NextResponse.json({ error: "This store is already approved." }, { status: 409 });
        }

        await prisma.store.update({
            where: { id: storeId.trim() },
            data:  status === "approved"
                ? { status: "approved", isActive: true  }
                : { status: "rejected", isActive: false },
        });

        return NextResponse.json({
            message: `Store "${store.name}" has been ${status} successfully.`,
        });
    } catch (error) {
        console.error("[POST /api/admin/approve-store]", error);
        return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
    }
}