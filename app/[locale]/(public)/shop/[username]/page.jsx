import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { sanitizeText } from "@/lib/security";
import StoreShopPage from "./StoreShopPage";

export const dynamic = "force-dynamic";

const SITE = "https://www.abumarketplace.shop";

// Approved, active stores only — the same public filter as /api/store/data.
async function getPublicStore(username) {
  try {
    const clean = sanitizeText(username, 30).toLowerCase();
    if (!clean) return null;
    return await prisma.store.findFirst({
      where: { username: clean, isActive: true, status: "approved" },
      select: { name: true, description: true, username: true },
    });
  } catch (error) {
    console.error("[store page] metadata fetch failed:", error);
    return null;
  }
}

export async function generateMetadata({ params }) {
  const { username, locale } = await params;
  const store = await getPublicStore(username);
  if (!store) {
    return { title: "Store Not Found" };
  }
  return {
    title: store.name,
    description: (store.description || `Shop ${store.name} on ABU Marketplace.`).slice(0, 160),
    alternates: { canonical: `${SITE}/${locale}/shop/${store.username}` },
  };
}

export default async function Page({ params }) {
  const { username } = await params;
  const store = await getPublicStore(username);
  if (!store) notFound();
  return <StoreShopPage />;
}
