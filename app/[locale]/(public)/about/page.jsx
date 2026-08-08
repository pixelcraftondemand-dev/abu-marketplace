import CommerceInfoPage from "@/components/CommerceInfoPage";
import { HeartHandshake, Landmark, Sparkles, Target } from "lucide-react";

const highlights = [
  {
    title: "Crafted with intention",
    description: "We curate a marketplace that blends style, substance, and trust in every interaction.",
    icon: Sparkles,
  },
  {
    title: "Built for modern shoppers",
    description: "Every page is designed to feel intuitive, premium, and easy to navigate from first click to final delivery.",
    icon: Target,
  },
  {
    title: "Community-led growth",
    description: "We support sellers, buyers, and creators with tools that help everyone participate in a healthier digital commerce ecosystem.",
    icon: HeartHandshake,
  },
];

const sections = [
  {
    title: "Our story",
    description: "ABU Marketplace was created to connect exceptional products with shoppers who value quality and authenticity.",
    items: [
      "A premium marketplace experience rooted in discovery and trust",
      "Thoughtful support for both established brands and emerging sellers",
      "A commitment to elegant design and dependable shopping journeys",
    ],
  },
  {
    title: "Why it matters",
    description: "We believe commerce should feel inspiring, transparent, and rewarding for everyone involved.",
    items: [
      "Elevated product discovery without clutter or confusion",
      "Fast, helpful support that keeps customers informed",
      "A dependable foundation for stores ready to grow",
    ],
  },
];

export default function AboutPage() {
  return (
    <CommerceInfoPage
      eyebrow="About ABU"
      title="A marketplace designed with premium shopping in mind."
      description="We bring together trusted sellers, thoughtfully curated products, and a polished buying experience that feels as elevated as the brands it serves."
      stats={[
        { value: "1", label: "Unified marketplace vision" },
        { value: "100%", label: "Focus on customer confidence" },
        { value: "Fast", label: "Support and fulfillment coordination" },
        { value: "Premium", label: "Experience across every touchpoint" },
      ]}
      highlights={highlights}
      sections={sections}
      footerTitle="Commerce that feels elevated, trusted, and beautifully simple."
      footerDescription="ABU is building an ecosystem where discovery, support, and quality come together without compromise."
    />
  );
}


