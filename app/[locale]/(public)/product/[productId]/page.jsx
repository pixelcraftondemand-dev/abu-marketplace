import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { isValidId } from "@/lib/security";
import { normalizeImages } from "@/lib/productUtils";
import ProductDetailPage from "./ProductDetailPage";

export const dynamic = "force-dynamic";

const SITE = "https://www.abumarketplace.shop";

// Public catalog only — same filters as GET /api/products/[productId].
async function getPublicProduct(productId) {
  if (!isValidId(productId)) return null;
  try {
    return await prisma.product.findFirst({
      where: {
        id: productId,
        inStock: true,
        store: { is: { isActive: true, status: "approved" } },
      },
      select: { id: true, name: true, description: true, images: true },
    });
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
  };
}

export default async function Page({ params }) {
  const { productId } = await params;
  const product = await getPublicProduct(productId);
  if (!product) notFound();
  return <ProductDetailPage />;
}
