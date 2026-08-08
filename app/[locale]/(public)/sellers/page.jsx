import CommerceInfoPage from "@/components/CommerceInfoPage";
import { BadgeCheck, Rocket, ShoppingBag, Users } from "lucide-react";

const highlights = [
  {
    title: "Launch quickly",
    description: "Open a storefront, upload products, and start selling with built-in onboarding and guidance.",
    icon: Rocket,
  },
  {
    title: "Reach premium buyers",
    description: "Be discovered by shoppers looking for quality, authenticity, and a refined buying experience.",
    icon: Users,
  },
  {
    title: "Grow with confidence",
    description: "Use analytics, order management, and support tools that keep your business running smoothly.",
    icon: ShoppingBag,
  },
];

const sections = [
  {
    title: "Why sellers choose ABU",
    description: "Create a store that feels as premium as the products you sell.",
    items: [
      "Simple store setup with a polished storefront experience",
      "Built-in visibility through curated collections and product discovery",
      "Seamless order and inventory management from one dashboard",
      "Support for promotions, discounts, and customer trust-building",
    ],
  },
  {
    title: "What you get",
    description: "ABU gives sellers the foundation for a modern brand presence without the complexity of enterprise tools.",
    items: [
      "Professional storefront design tailored for modern commerce",
      "Secure payments and trusted customer communications",
      "Flexible product management for single-item and large-scale catalogs",
      "A growth-minded marketplace that supports both new and established sellers",
    ],
  },
];

export default function SellersPage() {
  return (
    <CommerceInfoPage
      eyebrow="Sellers"
      title="Turn your brand into a thriving online destination."
      description="ABU Marketplace gives ambitious sellers the tools, audience, and polished storefront experience needed to compete with the biggest names in ecommerce."
      stats={[
        { value: "< 10 min", label: "Average store setup" },
        { value: "100%", label: "Creator-friendly onboarding" },
        { value: "Fast", label: "Order and support workflows" },
        { value: "Global", label: "Buyer reach and discovery" },
      ]}
      highlights={highlights}
      sections={sections}
      primaryAction={{ label: "Create your store", href: "/create-store" }}
      secondaryAction={{ label: "Browse the marketplace", href: "/shop" }}
      footerTitle="Your next great storefront starts here."
      footerDescription="Whether you are launching a first store or scaling a growing brand, ABU makes premium commerce feel simple and powerful."
    />
  );
}
