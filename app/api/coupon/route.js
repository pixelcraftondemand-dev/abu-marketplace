import prisma from "@/lib/prisma";
import { sanitizeText } from "@/lib/security";
import { getSessionFromRequest } from "@/lib/serverAuth";
import { NextResponse } from "next/server";

export async function POST(request) {
    try {
        const session = await getSessionFromRequest(request);
        const userId = session?.user?.id;

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
        }

        const { code } = await request.json();
        const couponCode = sanitizeText(code, 32).toUpperCase();

        if (!couponCode) {
            return NextResponse.json({ error: "Coupon code is required." }, { status: 422 });
        }

        const coupon = await prisma.coupon.findUnique({
            where: { code: couponCode },
        });

        if (!coupon) {
            return NextResponse.json({ error: "Coupon not found." }, { status: 404 });
        }

        if (coupon.expiresAt < new Date()) {
            return NextResponse.json({ error: "Coupon has expired." }, { status: 400 });
        }

        if (coupon.discount < 0 || coupon.discount > 100) {
            return NextResponse.json({ error: "Coupon is invalid." }, { status: 400 });
        }

        if (coupon.forNewUser) {
            const orderCount = await prisma.order.count({ where: { userId } });
            if (orderCount > 0) {
                return NextResponse.json({ error: "Coupon valid for new users only." }, { status: 400 });
            }
        }

        if (coupon.forMember) {
            return NextResponse.json({ error: "Coupon valid for members only." }, { status: 400 });
        }

        // Data minimization: only the fields the checkout flow needs are
        // returned — never usage counters, internal flags, or audit data.
        return NextResponse.json({
          coupon: {
            code: coupon.code,
            discount: coupon.discount,
            forNewUser: coupon.forNewUser,
            expiresAt: coupon.expiresAt,
          },
        });
    } catch (error) {
        console.error("[POST /api/coupon]", error);
        return NextResponse.json({ error: "Unable to validate coupon." }, { status: 400 });
    }
}
