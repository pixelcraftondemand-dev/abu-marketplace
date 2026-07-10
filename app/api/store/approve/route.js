import prisma from "@/lib/prisma";
import { isValidId } from "@/lib/security";
import authAdmin from "@/middlewares/authAdmin";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// POST /api/admin/store/approve
// Body: { storeId: string, action: "approve" | "reject" }
export async function POST(request) {
    try {
        const { userId } = getAuth(request);
        const isAdmin = await authAdmin(userId);

        if (!isAdmin) {
            return NextResponse.json({ error: "Not authorized" }, { status: 401 });
        }

        const { storeId, action } = await request.json();

        if (!isValidId(storeId) || !["approve", "reject"].includes(action)) {
            return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
        }

        if (action === "approve") {
            await prisma.store.update({
                where: { id: storeId },
                data: {
                    status:   "approved",
                    isActive: true,     // ← THIS IS THE CRITICAL FIX
                },
            });
            return NextResponse.json({ message: "Store approved" });
        }

        if (action === "reject") {
            await prisma.store.update({
                where: { id: storeId },
                data: {
                    status:   "rejected",
                    isActive: false,
                },
            });
            return NextResponse.json({ message: "Store rejected" });
        }

    } catch (error) {
        console.error("[approve-store]", error);
        return NextResponse.json({ error: "Unable to update store approval." }, { status: 500 });
    }
}
