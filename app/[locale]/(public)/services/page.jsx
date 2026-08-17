import ServicesPage from "./ServicesPage";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  return {
    title: "Hire Skilled Workers in Sierra Leone",
    description:
      "Find trusted plumbers, electricians, tailors, mechanics, and more across Freetown and Sierra Leone. Request a vetted worker in minutes on ABU Marketplace.",
    alternates: { canonical: `https://www.abumarketplace.shop/${locale}/services` },
  };
}

export default function Page() {
  return <ServicesPage />;
}
