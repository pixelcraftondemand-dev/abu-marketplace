// ─────────────────────────────────────────────────────────────────────────────
// Seed script: creates a demo store and sample products so the marketplace has
// content to render (homepage product grid, /api/products, product pages).
//
// Usage: node scripts/seed.mjs
// ─────────────────────────────────────────────────────────────────────────────
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const STORE = {
  name: "ABU Demo Store",
  description:
    "Curated electronics, fashion and home essentials with verified quality.",
  username: "abu_demo_store",
  address: "50 Pratt Street, Freetown, Sierra Leone",
  status: "approved",
  isActive: true,
  logo: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400",
  email: "demo@abumarketplace.shop",
  contact: "+232 32 110 054",
  halalCertified: true,
};

const PRODUCTS = [
  {
    name: "Smart Watch Series X",
    description:
      "Premium smart watch with heart-rate monitoring, GPS and a 7-day battery. Halal-friendly everyday wear.",
    mrp: 199,
    price: 149,
    halalCertified: true,
    images: JSON.stringify([
      "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600",
    ]),
    category: "electronics",
  },
  {
    name: "Wireless Headphones Pro",
    description:
      "Noise-cancelling over-ear headphones with 30-hour battery life and studio-grade sound.",
    mrp: 120,
    price: 89,
    halalCertified: true,
    images: JSON.stringify([
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600",
    ]),
    category: "electronics",
  },
  {
    name: "Modern Table Lamp",
    description:
      "Warm minimalist LED table lamp with touch dimming - perfect for reading corners.",
    mrp: 65,
    price: 45,
    halalCertified: false,
    images: JSON.stringify([
      "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=600",
    ]),
    category: "home",
  },
  {
    name: "African Print Fashion Jacket",
    description:
      "Tailored unisex jacket in vibrant African wax print, ethically produced.",
    mrp: 95,
    price: 72,
    halalCertified: true,
    images: JSON.stringify([
      "https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?w=600",
    ]),
    category: "fashion",
  },
  {
    name: "Apple Wireless Earbuds",
    description:
      "Seamless pairing, spatial audio and sweat-resistant design for daily commutes.",
    mrp: 129,
    price: 99,
    halalCertified: false,
    images: JSON.stringify([
      "https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?w=600",
    ]),
    category: "electronics",
  },
  {
    name: "Leather Crossbody Bag",
    description:
      "Handcrafted full-grain leather crossbody bag with brass hardware.",
    mrp: 110,
    price: 84,
    halalCertified: false,
    images: JSON.stringify([
      "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600",
    ]),
    category: "accessories",
  },
];

async function main() {
  const existing = await prisma.store.findUnique({
    where: { username: STORE.username },
  });

  let store;
  if (existing) {
    store = existing;
    console.log(`Store "${STORE.username}" already exists, reusing it.`);
  } else {
    store = await prisma.store.create({ data: STORE });
    console.log(`Created store "${STORE.username}" (${store.id}).`);
  }

  const current = await prisma.product.count({ where: { storeId: store.id } });
  if (current > 0) {
    console.log(`Store already has ${current} products - skipping product seed.`);
  } else {
    for (const product of PRODUCTS) {
      await prisma.product.create({ data: { ...product, storeId: store.id } });
    }
    console.log(`Seeded ${PRODUCTS.length} products.`);
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error("Seed error:", e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
