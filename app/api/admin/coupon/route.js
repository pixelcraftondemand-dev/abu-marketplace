// ─────────────────────────────────────────────────────────────────────────────
// FILEPATH: app/api/admin/coupon/route.js
// ─────────────────────────────────────────────────────────────────────────────
import { inngest } from "@/inngest/client";
import prisma from "@/lib/prisma";
import authAdmin from "@/middlewares/authAdmin";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// ── POST /api/admin/coupon ────────────────────────────────────────────────────
export async function POST(request) {
    try {
        const { userId, sessionClaims } = getAuth(request);
        const isAdmin = await authAdmin(userId, sessionClaims);

        if (!isAdmin) {
            return NextResponse.json({ error: "Not authorized." }, { status: 403 });
        }

        const { coupon } = await request.json();
        coupon.code = coupon.code.toUpperCase();

        await prisma.coupon.create({ data: coupon }).then(async (created) => {
            await inngest.send({
                name: "app/coupon.expired",
                data: { code: created.code, expires_at: created.expiresAt },
            });
        });

        return NextResponse.json({ message: "Coupon added successfully." });
    } catch (error) {
        console.error("[POST /api/admin/coupon]", error);
        return NextResponse.json({ error: error.code || error.message }, { status: 400 });
    }
}

// ── DELETE /api/admin/coupon?code=CODE ────────────────────────────────────────
export async function DELETE(request) {
    try {
        const { userId, sessionClaims } = getAuth(request);
        const isAdmin = await authAdmin(userId, sessionClaims);

        if (!isAdmin) {
            return NextResponse.json({ error: "Not authorized." }, { status: 403 });
        }

        const code = request.nextUrl.searchParams.get("code");

        if (!code) {
            return NextResponse.json({ error: "Coupon code is required." }, { status: 422 });
        }

        await prisma.coupon.delete({ where: { code } });
        return NextResponse.json({ message: "Coupon deleted successfully." });
    } catch (error) {
        console.error("[DELETE /api/admin/coupon]", error);
        return NextResponse.json({ error: error.code || error.message }, { status: 400 });
    }
}

// ── GET /api/admin/coupon ─────────────────────────────────────────────────────
export async function GET(request) {
    try {
        const { userId, sessionClaims } = getAuth(request);
        const isAdmin = await authAdmin(userId, sessionClaims);

        if (!isAdmin) {
            return NextResponse.json({ error: "Not authorized." }, { status: 403 });
        }

        const coupons = await prisma.coupon.findMany({});
        return NextResponse.json({ coupons });
    } catch (error) {
        console.error("[GET /api/admin/coupon]", error);
        return NextResponse.json({ error: error.code || error.message }, { status: 400 });
    }
}