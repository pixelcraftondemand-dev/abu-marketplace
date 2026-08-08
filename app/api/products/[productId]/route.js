export const runtime = "nodejs";

import prisma from '@/lib/prisma'
import { isValidId } from '@/lib/security'
import { NextResponse } from 'next/server'

export async function GET(request, { params }) {
  let productId
  try {
    // Next.js 15 passes `params` as a Promise — must be awaited.
    ;({ productId } = await params)

    // Reject malformed/oversized ids before touching the database.
    if (!isValidId(productId)) {
      return NextResponse.json({ error: 'Invalid product id.' }, { status: 422 })
    }

    // Public catalog only: in-stock products from active, approved stores.
    // A deactivated/rejected store's products must never be reachable by
    // guessing a direct URL.
    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        inStock: true,
        store: { is: { isActive: true, status: 'approved' } },
      },
      include: {
        store: {
          select: {
            id: true, name: true, username: true, logo: true,
            description: true, halalCertified: true,
          }
        },
        // Public review surface only — never expose who rated (userId/orderId).
        rating: {
          select: {
            rating: true, review: true, createdAt: true,
            user: { select: { name: true, image: true } },
          }
        },
      },
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const reviewCount = product.rating.length
    const averageRating = reviewCount
      ? product.rating.reduce((sum, item) => sum + item.rating, 0) / reviewCount
      : 0

    return NextResponse.json({
      product: {
        ...product,
        rating: averageRating,
        reviewCount,
        originalPrice: product.mrp,
      },
    })
  } catch (error) {
    console.error('[GET /api/products/[productId]]', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      productId,
    });
    return NextResponse.json(
      {
        error: 'Unable to fetch product.',
        message: 'Please try again later.',
      },
      { status: 500 }
    );
  }
}
