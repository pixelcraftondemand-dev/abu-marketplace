import prisma from "@/lib/prisma";
import { normalizeImages } from "@/lib/productUtils";
import ShopPage from "./ShopPage";

export const dynamic = "force-dynamic";

function averageRating(product) {
  const ratings = Array.isArray(product?.rating) ? product.rating : [];
  if (!ratings.length) return 0;
  return ratings.reduce((sum, item) => sum + (Number(item.rating) || 0), 0) / ratings.length;
}

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
      return list;
  }
}

async function getShopProducts({ search, category, sort }) {
  try {
    const where = {
      inStock: true,
      ...(category === "halal-certified" ? { halalCertified: true } : {}),
      store: { is: { isActive: true, status: "approved" } },
    };

    const products = await prisma.product.findMany({
      where,
      include: {
        rating: {
          select: {
            createdAt: true,
            rating: true,
            review: true,
            user: { select: { name: true, image: true } },
          },
        },
        store: {
          select: {
            id: true,
            name: true,
            username: true,
            logo: true,
            description: true,
            halalCertified: true,
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

    return sortProducts(filtered, sort).map((product) => ({
      ...product,
      images: normalizeImages(product.images),
    }));
  } catch (error) {
    console.error("[shop page] product fetch failed:", error);
    return [];
  }
}

export async function generateMetadata({ params, searchParams }) {
  const { locale } = await params;
  const sp = await searchParams;
  const title = sp?.category
    ? `${sp.category.charAt(0).toUpperCase() + sp.category.slice(1)} — Shop`
    : "Shop";
  const description =
    "Browse electronics, fashion, home essentials, and everyday gadgets on ABU Marketplace — trusted online shopping in Sierra Leone.";
  return {
    title,
    description,
    alternates: { canonical: `https://www.abumarketplace.shop/${locale}/shop` },
    openGraph: {
      title,
      description,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function Page({ params, searchParams }) {
  const sp = await searchParams;
  const search = sp?.search || "";
  const category = sp?.category || "";
  const sort = sp?.sort || "featured";

  const products = await getShopProducts({ search, category, sort });

  return <ShopPage initialProducts={products} />;
}
