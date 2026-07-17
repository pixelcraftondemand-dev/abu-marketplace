import prisma from "@/lib/prisma";
import authSeller from "@/middlewares/authSeller";
import { getSessionFromRequest } from "@/lib/serverAuth";
import { OrderStatus } from "@prisma/client";
import { NextResponse } from "next/server";


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
        if(!orderId || !Object.values(OrderStatus).includes(status)){
            return NextResponse.json({ error: "Invalid order status." }, { status: 422 })
        }

        const response = await prisma.order.updateMany({
            where: { id: orderId, storeId },
            data: {status}
        })
        if(response.count === 0){
            return NextResponse.json({ error: "Order not found." }, { status: 404 })
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

        const orders = await prisma.order.findMany({
            where: {storeId},
            include: {user: true, address: true, orderItems: {include: {product: true}}},
            orderBy: {createdAt: 'desc' }
        })

        return NextResponse.json({orders})
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Unable to fetch store orders." }, { status: 400 })
    }
}
