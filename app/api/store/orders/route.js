import prisma from "@/lib/prisma";
import authSeller from "@/middlewares/authSeller";
import { getSessionFromRequest } from "@/lib/serverAuth";
import { OrderStatus } from "@prisma/client";
import { NextResponse } from "next/server";

// Canonical fulfilment progression. Sellers may advance an order along this
// path but never regress it (e.g. DELIVERED -> ORDER_PLACED), which would let
// a seller rewrite history after the fact.
const STATUS_ORDER = ["ORDER_PLACED", "PROCESSING", "SHIPPED", "DELIVERED"];

// Update seller order status
export async function POST(request){
    try {
        const session = await getSessionFromRequest(request);
        const userId = session?.user?.id;
        const storeId = await authSeller(userId)

        if(!storeId){
            return NextResponse.json({ error: 'not authorized' }, { status: 401 })
        }

        const {orderId, status } = await request.json()
        if(!orderId || typeof orderId !== "string" || !Object.values(OrderStatus).includes(status)){
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

        // Reject regressions: the new status must not be earlier than current.
        if (STATUS_ORDER.indexOf(status) < STATUS_ORDER.indexOf(existing.status)) {
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
