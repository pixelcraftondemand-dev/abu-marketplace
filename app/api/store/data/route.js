import prisma from "@/lib/prisma";
import { sanitizeText } from "@/lib/security";
import { NextResponse } from "next/server";

// Get store info & store products
export async function GET(request){
    try {
        // Get store username from query params
        const { searchParams } = new URL(request.url)
        const username = sanitizeText(searchParams.get('username'), 30).toLowerCase();

        if(!username){
            return NextResponse.json({error: "missing username"}, { status: 400 })
        }

        // Get store info and inStock products with ratings
        const store = await prisma.store.findFirst({
            where: {username, isActive: true, status: "approved"},
            select: {
                id: true,
                name: true,
                username: true,
                description: true,
                address: true,
                logo: true,
                contact: true,
                Product: {
                    where: { inStock: true },
                    include: { rating: true }
                }
            }
        })

        if(!store){
            return NextResponse.json({error: "store not found"}, { status: 400 })
        }

        return NextResponse.json({store})
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Unable to fetch store." }, { status: 400 })
    }
}
