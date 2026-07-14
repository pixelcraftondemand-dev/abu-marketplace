import prisma from "@/lib/prisma";
import { normalizeCart } from "@/lib/security";
import { getSessionFromRequest } from "@/lib/serverAuth";
import { NextResponse } from "next/server";


// Update user cart 
export async function POST(request){
    try {
        const session = await getSessionFromRequest(request)
        const userId = session?.user?.id
        if(!userId){
            return NextResponse.json({ error: "not authorized" }, { status: 401 });
        }
        const { cart } = await request.json()
        const normalized = normalizeCart(cart);
        if(normalized.error){
            return NextResponse.json({ error: normalized.error }, { status: 422 });
        }

        // Save the cart to the user object
        await prisma.user.update({
            where: {id: userId},
            data: {cart: normalized.cart}
        })

        return NextResponse.json({ message: 'Cart updated' })
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Unable to update cart." }, { status: 400 })
    }
}

// Get user cart 
export async function GET(request){
    try {
        const session = await getSessionFromRequest(request)
        const userId = session?.user?.id
        if(!userId){
            return NextResponse.json({ error: "not authorized" }, { status: 401 });
        }
        
        const user = await prisma.user.findUnique({
            where: {id: userId},
            select: { cart: true }
        })
        if(!user){
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        return NextResponse.json({ cart: user.cart })
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Unable to fetch cart." }, { status: 400 })
    }
}
