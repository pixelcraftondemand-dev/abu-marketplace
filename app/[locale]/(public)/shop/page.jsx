import ShopPage from "./ShopPage";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  return {
    title: "Shop",
    description:
      "Browse electronics, fashion, home essentials, and everyday gadgets on ABU Marketplace — trusted online shopping in Sierra Leone.",
    alternates: { canonical: `https://www.abumarketplace.shop/${locale}/shop` },
  };
}

export default function Page() {
  return <ShopPage />;
}
