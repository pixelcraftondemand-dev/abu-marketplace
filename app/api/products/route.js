import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";


export async function GET(request){
    try {
        const { searchParams } = new URL(request.url)
        const storeId = searchParams.get('storeId')
        const products = await prisma.product.findMany({
            where: {
                inStock: true,
                ...(storeId ? { storeId } : {}),
                store: { is: { isActive: true, status: 'approved' } },
            },
            include: {
                rating: {
                    select: {
                        createdAt: true, rating: true, review: true,
                        user: {select: {name: true, image: true}}
                    }
                },
                store: true,
            },
            orderBy: {createdAt: 'desc'}
        })

        return NextResponse.json({products})
    } catch (error) {
        console.error('[GET /api/products]', error);
        return NextResponse.json({ error: "An internal server error occurred." }, { status: 500 });
    }
}
