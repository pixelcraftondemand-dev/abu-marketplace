// ─────────────────────────────────────────────────────────────────────────────
// FILEPATH: app/api/admin/coupon/route.js
// ─────────────────────────────────────────────────────────────────────────────
import { inngest } from "@/inngest/client";
import prisma from "@/lib/prisma";
import { normalizeCoupon, sanitizeText } from "@/lib/security";
import authAdmin from "@/middlewares/authAdmin";
import { getSessionFromRequest } from "@/lib/serverAuth";
import { NextResponse } from "next/server";

export async function POST(request) {
    try {
        const session = await getSessionFromRequest(request);
        const userId = session?.user?.id;
        const isAdmin = await authAdmin(userId);

        if (!isAdmin) {
            return NextResponse.json({ error: "Not authorized." }, { status: 403 });
        }

        const { coupon } = await request.json();
        const normalized = normalizeCoupon(coupon);
        if(normalized.error){
            return NextResponse.json({ error: normalized.error }, { status: 422 });
        }

        await prisma.coupon.create({ data: normalized.coupon }).then(async (created) => {
            await inngest.send({
                name: "app/coupon.expired",
                data: { code: created.code, expires_at: created.expiresAt },
            });
        });

        return NextResponse.json({ message: "Coupon added successfully." });
    } catch (error) {
        console.error("[POST /api/admin/coupon]", error);
        return NextResponse.json({ error: "Unable to add coupon." }, { status: 400 });
    }
}

export async function DELETE(request) {
    try {
        const session = await getSessionFromRequest(request);
        const userId = session?.user?.id;
        const isAdmin = await authAdmin(userId);

        if (!isAdmin) {
            return NextResponse.json({ error: "Not authorized." }, { status: 403 });
        }

        const code = sanitizeText(request.nextUrl.searchParams.get("code"), 32).toUpperCase();

        if (!code) {
            return NextResponse.json({ error: "Coupon code is required." }, { status: 422 });
        }

        await prisma.coupon.delete({ where: { code } });
        return NextResponse.json({ message: "Coupon deleted successfully." });
    } catch (error) {
        console.error("[DELETE /api/admin/coupon]", error);
        return NextResponse.json({ error: "Unable to delete coupon." }, { status: 400 });
    }
}

export async function GET(request) {
    try {
        const session = await getSessionFromRequest(request);
        const userId = session?.user?.id;
        const isAdmin = await authAdmin(userId);

        if (!isAdmin) {
            return NextResponse.json({ error: "Not authorized." }, { status: 403 });
        }

        const coupons = await prisma.coupon.findMany({});
        return NextResponse.json({ coupons });
    } catch (error) {
        console.error("[GET /api/admin/coupon]", error);
        return NextResponse.json({ error: "Unable to fetch coupons." }, { status: 400 });
    }
}
