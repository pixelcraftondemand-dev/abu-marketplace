export const runtime = "nodejs";

import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

function averageRating(product) {
  const ratings = Array.isArray(product?.rating) ? product.rating : [];
  if (!ratings.length) return 0;
  return ratings.reduce((sum, item) => sum + (Number(item.rating) || 0), 0) / ratings.length;
}

/**
 * Sort the filtered result set by the shop's selected sort option.
 * The SQL query always orders by newest first (featured/newest default).
 */
function sortProducts(products, sort) {
  const list = [...products];
  switch (sort) {
    case "price_asc":
      return list.sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
    case "price_desc":
      return list.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
    case "rating":
      return list.sort((a, b) => averageRating(b) - averageRating(a));
    case "popular":
      return list.sort((a, b) => (b.rating?.length || 0) - (a.rating?.length || 0));
    case "newest":
    case "featured":
    default:
      return list; // already ordered by createdAt desc
  }
}

export async function GET(request) {
  const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get("storeId");
    const category = searchParams.get("category")?.trim();
    const search = searchParams.get("search")?.trim();
    const sort = searchParams.get("sort") || "featured";

    // SQL-side filters are kept portable across SQLite and Postgres.
    // `mode: "insensitive"` is Postgres-only and makes these endpoints 500 on
    // SQLite, so case-insensitive category/search matching happens in JS below.
    const products = await prisma.product.findMany({
      where: {
        inStock: true,
        ...(storeId ? { storeId } : {}),
        ...(category === "halal-certified" ? { halalCertified: true } : {}),
        store: { is: { isActive: true, status: "approved" } },
      },
      include: {
        rating: {
          select: {
            createdAt: true, rating: true, review: true,
            user: { select: { name: true, image: true } },
          },
        },
        // Only public storefront fields — never internal ids/contacts.
        store: {
          select: {
            id: true, name: true, username: true, logo: true,
            description: true, halalCertified: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Case-insensitive category + free-text search (provider-agnostic).
    const normalizedCategory =
      category && category !== "halal-certified" ? category.toLowerCase() : "";
    const normalizedSearch = search?.toLowerCase() || "";

    const filtered = products.filter((product) => {
      if (
        normalizedCategory &&
        String(product.category || "").toLowerCase() !== normalizedCategory
      ) {
        return false;
      }
      if (normalizedSearch) {
        const haystack = `${product.name} ${product.description} ${product.category}`.toLowerCase();
        if (!haystack.includes(normalizedSearch)) return false;
      }
      return true;
    });

    return NextResponse.json({ products: sortProducts(filtered, sort) });
  } catch (error) {
    console.error(`[GET /api/products] requestId=${requestId}`, {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      {
        error: "Unable to fetch products.",
        message: "Please try again later.",
        requestId,
      },
      { status: 500 }
    );
  }
}
