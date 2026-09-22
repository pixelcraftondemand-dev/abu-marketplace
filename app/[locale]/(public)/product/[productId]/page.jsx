import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { isValidId } from "@/lib/security";
import { normalizeImages } from "@/lib/productUtils";
import ProductDetailPage from "./ProductDetailPage";

export const dynamic = "force-dynamic";

const SITE = "https://www.abumarketplace.shop";

// Public catalog only — fetches all fields the client component needs.
async function getPublicProduct(productId) {
  if (!isValidId(productId)) return null;
  try {
    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        inStock: true,
        store: { is: { isActive: true, status: "approved" } },
      },
      include: {
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
        rating: {
          select: {
            rating: true,
            review: true,
            createdAt: true,
            user: { select: { name: true, image: true } },
          },
        },
      },
    });
    if (!product) return null;

    // Compute review stats like the API route does
    const reviewCount = product.rating.length;
    const averageRating = reviewCount
      ? product.rating.reduce((sum, item) => sum + item.rating, 0) / reviewCount
      : 0;

    // Related products: same category, in stock, public stores
    const related = await prisma.product.findMany({
      where: {
        category: product.category,
        id: { not: product.id },
        inStock: true,
        store: { is: { isActive: true, status: "approved" } },
      },
      include: {
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
        rating: {
          select: {
            createdAt: true,
            rating: true,
            review: true,
            user: { select: { name: true, image: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 4,
    });

    return {
      id: product.id,
      name: product.name,
      description: product.description,
      images: normalizeImages(product.images),
      category: product.category,
      price: product.price,
      mrp: product.mrp,
      inStock: product.inStock,
      stock: product.stock,
      badge: product.badge,
      halalCertified: product.halalCertified,
      shortDescription: product.shortDescription,
      specifications: product.specifications,
      rating: averageRating,
      reviewCount,
      originalPrice: product.mrp,
      store: product.store,
      reviews: product.rating,
      related: related.map((item) => ({
        ...item,
        images: normalizeImages(item.images),
      })),
    };
  } catch (error) {
    console.error("[product page] metadata fetch failed:", error);
    return null;
  }
}

export async function generateMetadata({ params }) {
  const { productId, locale } = await params;
  const product = await getPublicProduct(productId);
  if (!product) {
    return { title: "Product Not Found" };
  }
  const description = (product.description || "").slice(0, 160);
  const images = normalizeImages(product.images)
    .slice(0, 1)
    .map((url) => ({ url }));
  return {
    title: product.name,
    description,
    alternates: { canonical: `${SITE}/${locale}/product/${productId}` },
    openGraph: {
      title: product.name,
      description,
      type: "website",
      url: `${SITE}/${locale}/product/${productId}`,
      images,
    },
    twitter: {
      card: "summary_large_image",
      title: product.name,
      description,
      images: images.map((img) => img.url),
    },
  };
}

export default async function Page({ params }) {
  const { productId } = await params;
  const product = await getPublicProduct(productId);
  if (!product) notFound();
  return <ProductDetailPage product={product} />;
}
