// /sitemap.xml — generated per request so it always reflects the live catalog.
// Dynamic (DB) entries degrade gracefully: if the database is unreachable the
// static route set is still emitted, so the sitemap never 500s.
export const dynamic = "force-dynamic";

import prisma from "@/lib/prisma";
import { supportedLocales } from "@/lib/utils/locale";

// Indexable public routes (mirrors app/[locale]/(public)/). App-only pages
// (cart, wallet, account, orders, verify-email, …) are deliberately excluded —
// they are noindexed via robots.txt.
const STATIC_PATHS = [
  "", // home
  "shop",
  "services",
  "collections",
  "sellers",
  "about",
  "contact",
  "faq",
  "help",
  "pricing",
  "privacy-policy",
  "terms-and-conditions",
  "returns",
  "shipping",
  "seller-agreement",
  "cookie-policy",
];

export default async function sitemap() {
  // Base URL is env-driven so the sitemap follows the deployment (local,
  // preview, production). Read per-call so runtime env changes are picked up
  // (and tests can stub it). Matches how NEXT_PUBLIC_APP_URL is used
  // elsewhere (lib/security.js, lib/orderEmail.js).
  const SITE = process.env.NEXT_PUBLIC_APP_URL || "https://www.abumarketplace.shop";
  let products = [];
  let stores = [];
  try {
    const [productRows, storeRows] = await Promise.all([
      // Public catalog only — same filters as the public product API route.
      prisma.product.findMany({
        where: {
          inStock: true,
          store: { is: { isActive: true, status: "approved" } },
        },
        select: { id: true, updatedAt: true },
      }),
      // Approved, active stores only.
      prisma.store.findMany({
        where: { isActive: true, status: "approved" },
        select: { username: true, updatedAt: true },
      }),
    ]);
    products = productRows;
    stores = storeRows;
  } catch (error) {
    console.error("[sitemap] failed to load dynamic entries:", error);
  }

  const entries = [];
  for (const locale of supportedLocales) {
    for (const path of STATIC_PATHS) {
      const isHome = path === "";
      entries.push({
        url: `${SITE}/${locale}${isHome ? "" : `/${path}`}`,
        changeFrequency: isHome ? "daily" : "weekly",
        priority: isHome ? 1 : 0.7,
      });
    }
    for (const product of products) {
      entries.push({
        url: `${SITE}/${locale}/product/${product.id}`,
        lastModified: product.updatedAt,
        changeFrequency: "weekly",
        priority: 0.8,
      });
    }
    for (const store of stores) {
      entries.push({
        url: `${SITE}/${locale}/shop/${store.username}`,
        lastModified: store.updatedAt,
        changeFrequency: "weekly",
        priority: 0.8,
      });
    }
  }

  return entries;
}
