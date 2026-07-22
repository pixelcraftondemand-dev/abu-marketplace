import CommerceInfoPage from "@/components/CommerceInfoPage";
import { BriefcaseBusiness, ShieldCheck, Store, TrendingUp } from "lucide-react";

const highlights = [
  {
    title: "Seller readiness",
    description: "Set up your store with clear expectations, professional standards, and modern commerce tools.",
    icon: BriefcaseBusiness,
  },
  {
    title: "Trust and safety",
    description: "We expect transparent, lawful, and customer-first selling practices from every seller.",
    icon: ShieldCheck,
  },
  {
    title: "Growth support",
    description: "We provide the infrastructure and support needed for sellers to scale smoothly.",
    icon: TrendingUp,
  },
];

const sections = [
  {
    title: "Agreement overview",
    description: "This agreement outlines the expectations for sellers operating on ABU Marketplace.",
    items: [
      "Sellers must provide accurate product information and truthful storefront content",
      "All products and promotional materials must comply with applicable laws and platform rules",
      "Sellers are responsible for fulfilment, customer support, and order accuracy",
      "ABU may review or remove listings that violate platform standards or consumer expectations",
    ],
  },
  {
    title: "What this means for you",
    description: "The seller agreement is designed to protect customers and help your business build lasting trust.",
    items: [
      "Run a professional store with confidence and clear standards",
      "Protect customer trust through secure operations and transparent communication",
      "Build a premium presence that aligns with the ABU marketplace experience",
    ],
  },
];

export default function SellerAgreementPage() {
  return (
    <CommerceInfoPage
      eyebrow="Seller agreement"
      title="A clear framework for premium selling."
      description="Our seller agreement helps create a trustworthy, high-standard marketplace where brands can grow confidently."
      stats={[
        { value: "Clear", label: "seller expectations" },
        { value: "Protected", label: "customer trust" },
        { value: "Support", label: "for growth" },
        { value: "Professional", label: "storefront standards" },
      ]}
      highlights={highlights}
      sections={sections}
      primaryAction={{ label: "Create your store", href: "/create-store" }}
      secondaryAction={{ label: "View sellers", href: "/sellers" }}
      footerTitle="Ready to sell with confidence?"
      footerDescription="ABU gives sellers a polished environment for building a premium brand presence and trusted customer relationships."
    />
  );
}
