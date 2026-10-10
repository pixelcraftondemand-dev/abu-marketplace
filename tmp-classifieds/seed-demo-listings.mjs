// TEMPORARY verification fixture — not part of the delivered feature.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Inlined copy of lib/utils/classifieds#slugifyListingTitle (this fixture is a
// plain Node script and cannot import the TypeScript module directly).
function slugifyListingTitle(title) {
  return String(title)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

const SELLER_ID = "demo_user_seed";

const DEMO = [
  { title: "iPhone 13 Pro 256GB", slugCategory: "phones", price: 8500000, condition: "USED", district: "Western Area Urban", town: "Freetown", description: "Clean iPhone 13 Pro, 90% battery health, no scratches. Comes with charger and box.", featured: true },
  { title: "Toyota Corolla 2015", slugCategory: "vehicles", price: 145000000, condition: "USED", district: "Bo", town: "Bo", description: "Well maintained Corolla, new tyres, full service history. Serious buyers only." },
  { title: "Samsung 43 inch Smart TV", slugCategory: "electronics", price: 4200000, condition: "NEW", district: "Western Area Rural", town: "Waterloo", description: "Brand new sealed smart TV with wifi and 2 USB ports. Free delivery in Freetown." },
  { title: "Office desk and chair", slugCategory: "furniture-home", price: 2800000, condition: "USED", district: "Port Loko", town: "Lunsar", description: "Solid wooden desk with a matching padded chair. Minor wear on the desk edge." },
  { title: "Two bedroom apartment for rent", slugCategory: "property-rentals", price: 12000000, condition: "USED", district: "Kenema", town: "Kenema", description: "Self contained two bedroom flat with running water and a secure compound. Rent is per year." },
  { title: "Gerber tailoring services", slugCategory: "services", price: 1500000, condition: "NEW", district: "Kono", town: "Koidu", description: "Custom tailoring for kaftans, dresses and school uniforms. Two week turnaround." },
  { title: "Nike Air trainers size 42", slugCategory: "fashion", price: 900000, condition: "USED", district: "Western Area Urban", town: "Aberdeen", description: "Barely worn trainers, original box included.", sold: true },
];

async function main() {
  const categories = await prisma.category.findMany({ select: { id: true, slug: true } });
  const bySlug = new Map(categories.map((c) => [c.slug, c.id]));

  await prisma.listing.deleteMany({ where: { sellerId: SELLER_ID } });

  let n = 0;
  for (const item of DEMO) {
    const categoryId = bySlug.get(item.slugCategory);
    if (!categoryId) {
      console.warn("missing category", item.slugCategory);
      continue;
    }
    const slug = `${slugifyListingTitle(item.title)}-${Date.now()}-${n}`;
    await prisma.listing.create({
      data: {
        sellerId: SELLER_ID,
        categoryId,
        title: item.title,
        slug,
        description: item.description,
        price: item.price,
        currency: "SLL",
        condition: item.condition,
        status: item.sold ? "SOLD" : "ACTIVE",
        district: item.district,
        town: item.town,
        phone: "+23276123456",
        contactPreference: "BOTH",
        isFeatured: Boolean(item.featured),
        soldAt: item.sold ? new Date() : null,
        images: {
          create: [
            { url: "/og-image.png", sortOrder: 0, blurDataUrl: null },
          ],
        },
      },
    });
    n += 1;
  }
  console.log(`seeded ${n} demo listings`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
