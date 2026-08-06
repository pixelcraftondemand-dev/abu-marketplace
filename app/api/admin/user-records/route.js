// ─────────────────────────────────────────────────────────────────────────────
// Admin account-record search (AML / law-enforcement requests).
// Searches customers by name, email, or account id — including closed
// (soft-deleted) accounts whose records are retained for 5 years.
// ─────────────────────────────────────────────────────────────────────────────
import prisma from "@/lib/prisma";
import authAdmin from "@/middlewares/authAdmin";
import { getSessionFromRequest } from "@/lib/serverAuth";
import { sanitizeText } from "@/lib/security";
import { NextResponse } from "next/server";

export async function GET(request) {
    try {
        const session = await getSessionFromRequest(request);
        const userId = session?.user?.id;
        const isAdmin = await authAdmin(userId);

        if (!isAdmin) {
            return NextResponse.json({ error: "Not authorized." }, { status: 403 });
        }

        const query = sanitizeText(new URL(request.url).searchParams.get("q"), 120);
        if (!query) {
            return NextResponse.json({ users: [] });
        }

        // Closed accounts (deletedAt set) are included on purpose: those are
        // exactly the records a retention request may need.
        const users = await prisma.user.findMany({
            where: {
                OR: [
                    { id: { contains: query } },
                    { email: { contains: query } },
                    { name: { contains: query } },
                ],
            },
            select: {
                id: true,
                name: true,
                email: true,
                image: true,
                emailVerified: true,
                deletedAt: true,
                dataRetentionUntil: true,
                createdAt: true,
                membershipTier: true,
                membershipStatus: true,
            },
            orderBy: { createdAt: "desc" },
            take: 50,
        });

        // `contains` is case-insensitive on SQLite (LIKE) but case-sensitive on
        // Postgres, so run a case-insensitive pass here for consistent lookups
        // across both databases (e.g. searching "amina" finds "Amina").
        const lowerQuery = query.toLowerCase();
        const matched = users.filter((user) =>
            user.id.toLowerCase().includes(lowerQuery) ||
            (user.email || "").toLowerCase().includes(lowerQuery) ||
            (user.name || "").toLowerCase().includes(lowerQuery)
        );

        return NextResponse.json({ users: matched });
    } catch (error) {
        console.error("[GET /api/admin/user-records]", error);
        return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
    }
}
