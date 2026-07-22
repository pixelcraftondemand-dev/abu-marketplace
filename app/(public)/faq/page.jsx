import CommerceInfoPage from "@/components/CommerceInfoPage";
import { HelpCircle, MessageCircleQuestion, ShieldCheck, Sparkles } from "lucide-react";

const highlights = [
  {
    title: "Popular questions",
    description: "Find concise answers for payments, delivery, returns, sign-in, and seller support.",
    icon: HelpCircle,
  },
  {
    title: "Practical guidance",
    description: "Every answer is written to help shoppers and sellers make confident decisions quickly.",
    icon: MessageCircleQuestion,
  },
  {
    title: "Trusted support",
    description: "When you need more help, our team is ready to take over and resolve the issue.",
    icon: ShieldCheck,
  },
];

const sections = [
  {
    title: "Frequently asked questions",
    description: "These answers cover the most common questions customers and sellers ask on ABU Marketplace.",
    items: [
      "How do I track an order? Use the orders area to view current status and delivery updates.",
      "Can I create a store? Yes — sellers can launch a storefront from the create store experience.",
      "How do refunds work? Refunds are handled according to the order, payment method, and return policy.",
      "What if I need help with a seller? Contact support and we will help coordinate the next step.",
    ],
  },
  {
    title: "Still need help?",
    description: "The support team can help with any question not covered below.",
    items: [
      "Email support at abumarketplace.shop@gmail.com",
      "Call our support team at +232 32 110 054",
      "Visit the help center for more guidance and policy details",
    ],
  },
];

export default function FAQPage() {
  return (
    <CommerceInfoPage
      eyebrow="FAQ"
      title="Answers that make shopping and selling feel effortless."
      description="Browse the most common questions about orders, products, support, and seller features on ABU Marketplace."
      stats={[
        { value: "4.9/5", label: "Customer confidence" },
        { value: "Fast", label: "Support handoff" },
        { value: "Clear", label: "Policy answers" },
        { value: "Expert", label: "Seller guidance" },
      ]}
      highlights={highlights}
      sections={sections}
      primaryAction={{ label: "Open help center", href: "/help" }}
      secondaryAction={{ label: "Contact support", href: "/contact" }}
      footerTitle="Everything you need should be easy to find."
      footerDescription="ABU combines clear product information, helpful policies, and support that keeps the shopping journey moving."
    />
  );
}
