import CommerceInfoPage from "@/components/CommerceInfoPage";
import { Compass, Sparkles, Store, TrendingUp } from "lucide-react";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  return {
    title: "Collections",
    description:
      "Browse curated collections of electronics, fashion, home essentials, and everyday gadgets on ABU Marketplace.",
    alternates: { canonical: `https://www.abumarketplace.shop/${locale}/collections` },
    openGraph: {
      title: "Collections — ABU Marketplace",
      description:
        "Browse curated collections of electronics, fashion, home essentials, and everyday gadgets on ABU Marketplace.",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: "Collections — ABU Marketplace",
      description:
        "Browse curated collections of electronics, fashion, home essentials, and everyday gadgets on ABU Marketplace.",
    },
  };
}

const highlights = [
  {
    title: "New arrivals weekly",
    description: "Discover limited drops, seasonal essentials, and trend-first pieces from verified sellers.",
    icon: Sparkles,
  },
  {
    title: "Curated by category",
    description: "Shop electronics, fashion, home essentials, watches, and accessories in one organized experience.",
    icon: Compass,
  },
  {
    title: "Verified shopping experience",
    description: "Every storefront is built for confidence with secure checkout, authentic product discovery, and fast support.",
    icon: Store,
  },
];

const sections = [
  {
    title: "Popular collection themes",
    description: "Browse your next favorite pieces with search-ready filters and seller-led merchandising.",
    items: [
      "Everyday essentials and statement accessories",
      "Home, wellness, and lifestyle favorites",
      "Tech upgrades with trusted reviews and quick dispatch",
      "Gift-ready picks for every seasonal celebration",
    ],
  },
  {
    title: "Why shoppers love ABU",
    description: "We blend the discoverability of a major marketplace with the reliability of a trusted local platform.",
    items: [
      "Fast browsing with clear product details",
      "Personalized recommendations based on your interests",
      "Flexible shopping journeys from discovery to checkout",
      "Dedicated seller support for a smooth, reliable experience",
    ],
  },
];

export default function CollectionsPage() {
  return (
    <CommerceInfoPage
      eyebrow="Collections"
      title="Shop the best of ABU, organized for easy discovery."
      description="From everyday essentials to aspirational finds, our collections are designed to help customers move from inspiration to checkout in seconds."
      stats={[
        { value: "12+", label: "Curated collection themes" },
        { value: "4.9/5", label: "Average satisfaction" },
        { value: "24/7", label: "Support coverage" },
        { value: "Free", label: "Express shipping above threshold" },
      ]}
      highlights={highlights}
      sections={sections}
      primaryAction={{ label: "Explore the shop", href: "/shop" }}
      secondaryAction={{ label: "See best sellers", href: "/shop?sort=popular" }}
      footerTitle="Ready to browse a marketplace built for you?"
      footerDescription="The collections experience combines clear navigation, smooth browsing, and instantly shoppable categories for a reliable retail journey."
    />
  );
}
