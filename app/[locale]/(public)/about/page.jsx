import CommerceInfoPage from "@/components/CommerceInfoPage";
import { HeartHandshake, Landmark, Sparkles, Target } from "lucide-react";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  return {
    title: "About ABU Marketplace",
    description:
      "Learn about ABU Marketplace — a trusted online marketplace for electronics, fashion, home essentials, and everyday gadgets in Sierra Leone.",
    alternates: { canonical: `https://www.abumarketplace.shop/${locale}/about` },
    openGraph: {
      title: "About ABU Marketplace",
      description:
        "Learn about ABU Marketplace — a trusted online marketplace for electronics, fashion, home essentials, and everyday gadgets in Sierra Leone.",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: "About ABU Marketplace",
      description:
        "Learn about ABU Marketplace — a trusted online marketplace for electronics, fashion, home essentials, and everyday gadgets in Sierra Leone.",
    },
  };
}

const highlights = [
  {
    title: "Built for trust",
    description: "We build a marketplace that blends verified sellers, secure checkout, and honest pricing in every interaction.",
    icon: Sparkles,
  },
  {
    title: "Built for modern shoppers",
    description: "Every page is designed to feel intuitive, fast, and easy to navigate from first click to final delivery.",
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
    description: "ABU Marketplace was created to connect everyday products with shoppers who value quality, affordability, and trust.",
    items: [
      "A trusted marketplace experience rooted in discovery and value",
      "Thoughtful support for both established brands and emerging sellers",
      "A commitment to dependable design and smooth shopping journeys",
    ],
  },
  {
    title: "Why it matters",
    description: "We believe commerce should feel transparent, fast, and rewarding for everyone involved.",
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
      title="A marketplace designed for trusted, everyday shopping."
      description="We bring together verified sellers, quality products, and a smooth buying experience that gives customers confidence from browse to delivery."
      stats={[
        { value: "1", label: "Unified marketplace vision" },
        { value: "100%", label: "Focus on customer confidence" },
        { value: "Fast", label: "Support and fulfillment coordination" },
        { value: "Secure", label: "Checkout across every touchpoint" },
      ]}
      highlights={highlights}
      sections={sections}
      footerTitle="Commerce that feels trusted, fast, and reliable."
      footerDescription="ABU is building an ecosystem where discovery, support, and quality come together without compromise."
    />
  );
}
