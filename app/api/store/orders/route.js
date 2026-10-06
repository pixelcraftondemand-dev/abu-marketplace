import prisma from "@/lib/prisma";
import { storeActionRateLimiter } from "@/lib/security";
import authSeller from "@/middlewares/authSeller";
import { getSessionFromRequest } from "@/lib/serverAuth";
import { NextResponse } from "next/server";

// Canonical pilot fulfilment progression. Sellers may advance an order along
// this path but never regress it (e.g. DELIVERED -> ORDER_PLACED), which would
// let a seller rewrite history after the fact.
const STATUS_ORDER = ["ORDER_PLACED", "CONFIRMED", "OUT_FOR_DELIVERY", "DELIVERED", "PAID"];

// CANCELLED is a terminal branch: it can be reached from any state that has
// not already been paid, and its own state can never be left again.
const CANCELLED = "CANCELLED";

// Historical rows may still carry the pre-pilot values. Treat them as aliases
// so they keep their position on the path and can still be advanced forward
// without rewriting the row.
const LEGACY_STATUS_ALIASES = { PROCESSING: "CONFIRMED", SHIPPED: "OUT_FOR_DELIVERY" };

// Values a seller may write. Declared explicitly rather than from the generated
// Prisma enum so the guard cannot drift from the schema during migrations.
const WRITABLE_STATUSES = [
    ...STATUS_ORDER,
    CANCELLED,
    ...Object.keys(LEGACY_STATUS_ALIASES),
];

function canonicalStatus(status) {
    return LEGACY_STATUS_ALIASES[status] || status;
}

function rankOf(status) {
    return STATUS_ORDER.indexOf(canonicalStatus(status));
}

// Update seller order status
export async function POST(request){
    try {
        const session = await getSessionFromRequest(request);
        const userId = session?.user?.id;
        const storeId = await authSeller(userId)

        if(!storeId){
            return NextResponse.json({ error: 'not authorized' }, { status: 401 })
        }

        const rl = await storeActionRateLimiter.check(userId);
        if (!rl.allowed) {
            return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429, headers: { "Retry-After": String(rl.retryAfter || 600) } });
        }

        const {orderId, status } = await request.json()
        if(!orderId || typeof orderId !== "string" || !WRITABLE_STATUSES.includes(status)){
            return NextResponse.json({ error: "Invalid order status." }, { status: 422 })
        }

        // Fetch the current status first — the transition guard must read the
        // authoritative row, never trust the client's idea of the order state.
        const existing = await prisma.order.findFirst({
            where: { id: orderId, storeId },
            select: { id: true, status: true },
        });
        if (!existing) {
            return NextResponse.json({ error: "Order not found." }, { status: 404 })
        }

        const currentCanonical = canonicalStatus(existing.status);
        const nextCanonical = canonicalStatus(status);

        if (nextCanonical === CANCELLED) {
            // Cancelling is terminal and never allowed once an order is paid.
            if (currentCanonical === "PAID") {
                return NextResponse.json(
                    { error: "A paid order cannot be cancelled." },
                    { status: 422 }
                );
            }
        } else if (currentCanonical === CANCELLED) {
            return NextResponse.json(
                { error: "A cancelled order cannot be reopened." },
                { status: 422 }
            );
        } else if (rankOf(status) < rankOf(existing.status)) {
            // Reject regressions: the new status must not be earlier than current.
            return NextResponse.json(
                { error: "Order status cannot move backwards." },
                { status: 422 }
            );
        }

        // Same status = idempotent no-op; otherwise apply the forward transition.
        if (status !== existing.status) {
            await prisma.order.update({
                where: { id: existing.id },
                data: { status },
            });
        }

        return NextResponse.json({message: "Order Status updated"})
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Unable to update order status." }, { status: 400 })
    }
}

// Get all orders for a seller
export async function GET(request){
    try {
        const session = await getSessionFromRequest(request);
        const userId = session?.user?.id;
        const storeId = await authSeller(userId)

        if(!storeId){
            return NextResponse.json({ error: 'not authorized' }, { status: 401 })
        }

        // Data minimization: sellers see only the fulfilment fields they need,
        // never full user records (cart, internal flags) or unrelated data.
        const orders = await prisma.order.findMany({
            where: {storeId},
            include: {
                user: { select: { id: true, name: true, email: true, image: true } },
                address: { select: { id: true, name: true, email: true, phone: true, street: true, city: true, state: true, zip: true, country: true } },
                orderItems: { include: { product: { select: { id: true, name: true, images: true, price: true } } } },
            },
            orderBy: {createdAt: 'desc' }
        })

        return NextResponse.json({orders})
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Unable to fetch store orders." }, { status: 400 })
    }
}
