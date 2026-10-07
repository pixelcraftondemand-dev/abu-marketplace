import prisma from "@/lib/prisma";
import { storeActionRateLimiter } from "@/lib/security";
import authSeller from "@/middlewares/authSeller";
import { getSessionFromRequest } from "@/lib/serverAuth";
import { isValidWhatsAppNumber, normalizeWhatsAppNumber } from "@/lib/utils/whatsapp";
import { NextResponse } from "next/server";

// POST /api/store/update
// Lets an approved seller update the required WhatsApp contact number.
export async function POST(request) {
    try {
        const session = await getSessionFromRequest(request);
        const userId = session?.user?.id;
        const storeId = await authSeller(userId);

        if (!storeId) {
            return NextResponse.json({ error: "not authorized" }, { status: 401 });
        }

        const rl = await storeActionRateLimiter.check(userId);
        if (!rl.allowed) {
            return NextResponse.json(
                { error: "Too many requests. Please try again later." },
                { status: 429, headers: { "Retry-After": String(rl.retryAfter || 600) } }
            );
        }

        const body = await request.json().catch(() => ({}));
        const raw = typeof body?.whatsappNumber === "string" ? body.whatsappNumber.trim() : "";

        if (!raw) {
            return NextResponse.json(
                { error: "WhatsApp number is required so buyers can contact your store." },
                { status: 422 }
            );
        }
        if (!isValidWhatsAppNumber(raw)) {
            return NextResponse.json(
                { error: "WhatsApp number must be a valid phone number." },
                { status: 422 }
            );
        }

        const whatsappNumber = normalizeWhatsAppNumber(raw);

        await prisma.store.update({
            where: { userId },
            data: { whatsappNumber },
        });

        return NextResponse.json({ message: "Store settings updated", whatsappNumber });
    } catch (error) {
        console.error("[POST /api/store/update]", error);
        return NextResponse.json({ error: "Unable to update store settings." }, { status: 400 });
    }
}
