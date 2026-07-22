import CommerceInfoPage from "@/components/CommerceInfoPage";
import { Compass, Sparkles, Store, TrendingUp } from "lucide-react";

const highlights = [
  {
    title: "New arrivals weekly",
    description: "Discover limited drops, seasonal essentials, and trend-first pieces from trusted sellers.",
    icon: Sparkles,
  },
  {
    title: "Curated by category",
    description: "Shop electronics, fashion, home essentials, watches, and accessories in one refined experience.",
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
    description: "Browse your next favorite pieces with search-ready filters and designer-led merchandising.",
    items: [
      "Luxury essentials and statement accessories",
      "Everyday favorites for home, wellness, and style",
      "Tech upgrades with trusted reviews and quick dispatch",
      "Gift-ready picks for every seasonal celebration",
    ],
  },
  {
    title: "Why shoppers love ABU",
    description: "We blend the discoverability of a major marketplace with the warmth of a boutique destination.",
    items: [
      "Fast browsing with premium product storytelling",
      "Personalized recommendations based on your interests",
      "Flexible shopping journeys from discovery to checkout",
      "Dedicated seller support for a reliable, premium experience",
    ],
  },
];

export default function CollectionsPage() {
  return (
    <CommerceInfoPage
      eyebrow="Collections"
      title="Shop the best of ABU, organized for effortless discovery."
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
      footerTitle="Ready to browse like a top-tier marketplace?"
      footerDescription="The new collections experience combines rich storytelling, smooth navigation, and instantly shoppable categories for an elevated retail journey."
    />
  );
}
