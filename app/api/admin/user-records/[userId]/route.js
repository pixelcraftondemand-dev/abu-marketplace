// ─────────────────────────────────────────────────────────────────────────────
// Admin account-record detail (AML / law-enforcement requests).
// Returns the complete retained record for one account — including closed
// (soft-deleted) accounts — so it can be produced upon lawful request.
// ─────────────────────────────────────────────────────────────────────────────
import prisma from "@/lib/prisma";
import authAdmin from "@/middlewares/authAdmin";
import { getSessionFromRequest } from "@/lib/serverAuth";
import { isValidId } from "@/lib/security";
import { NextResponse } from "next/server";

export async function GET(request, { params }) {
    try {
        const session = await getSessionFromRequest(request);
        const userId = session?.user?.id;
        const isAdmin = await authAdmin(userId);

        if (!isAdmin) {
            return NextResponse.json({ error: "Not authorized." }, { status: 403 });
        }

        // Next.js 15 passes `params` as a Promise — must be awaited.
        const { userId: recordId } = await params;
        if (!isValidId(recordId)) {
            return NextResponse.json({ error: "Invalid account id." }, { status: 422 });
        }

        const record = await prisma.user.findUnique({
            where: { id: recordId },
            include: {
                // Account identity incl. closure/retention markers.
                Address: true,
                store: true,
                buyerOrders: {
                    include: {
                        orderItems: {
                            include: {
                                product: { select: { id: true, name: true, price: true } },
                            },
                        },
                        payment: true,
                    },
                    orderBy: { createdAt: "desc" },
                },
                payments: { include: { refunds: true }, orderBy: { createdAt: "desc" } },
                wallet: { include: { transactions: { orderBy: { createdAt: "desc" } } } },
                ratings: true,
                // Legacy auth rows — metadata only, never token/password fields.
                sessions: {
                    select: { id: true, createdAt: true, expiresAt: true, ipAddress: true, userAgent: true },
                },
                accounts: {
                    select: { id: true, providerId: true, accountId: true, createdAt: true, updatedAt: true },
                },
            },
        });

        if (!record) {
            return NextResponse.json({ error: "Account not found." }, { status: 404 });
        }

        return NextResponse.json({ record });
    } catch (error) {
        console.error("[GET /api/admin/user-records/[userId]]", error);
        return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
    }
}
