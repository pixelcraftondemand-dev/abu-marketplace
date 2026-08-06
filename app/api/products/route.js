import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";


export async function GET(request){
    try {
        const { searchParams } = new URL(request.url)
        const storeId = searchParams.get('storeId')
        const category = searchParams.get('category')?.trim()
        const search = searchParams.get('search')?.trim()

        const products = await prisma.product.findMany({
            where: {
                inStock: true,
                ...(storeId ? { storeId } : {}),
                ...(category ? category === 'halal-certified' ? { halalCertified: true } : { category: { equals: category, mode: 'insensitive' } } : {}),
                ...(search ? {
                    OR: [
                        { name: { contains: search, mode: 'insensitive' } },
                        { description: { contains: search, mode: 'insensitive' } },
                        { category: { contains: search, mode: 'insensitive' } },
                    ],
                } : {}),
                store: { is: { isActive: true, status: 'approved' } },
            },
            include: {
                rating: {
                    select: {
                        createdAt: true, rating: true, review: true,
                        user: {select: {name: true, image: true}}
                    }
                },
                // Only public storefront fields — never internal ids/contacts.
                store: {
                    select: {
                        id: true, name: true, username: true, logo: true,
                        description: true, halalCertified: true,
                    }
                },
            },
            orderBy: {createdAt: 'desc'}
        })

        return NextResponse.json({products})
    } catch (error) {
        console.error('[GET /api/products]', error);
        return NextResponse.json({ error: "An internal server error occurred." }, { status: 500 });
    }
}
