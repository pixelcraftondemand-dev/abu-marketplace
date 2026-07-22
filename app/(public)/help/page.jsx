import CommerceInfoPage from "@/components/CommerceInfoPage";
import { CircleHelp, MessageCircleMore, ShieldCheck, Truck } from "lucide-react";

const highlights = [
  {
    title: "Fast answers",
    description: "Get clear guidance for orders, payments, returns, and account support in a few taps.",
    icon: CircleHelp,
  },
  {
    title: "Real assistance",
    description: "Reach out through the support flow and receive help tailored to your order or account.",
    icon: MessageCircleMore,
  },
  {
    title: "Secure and reliable",
    description: "We protect customer information and keep every support journey transparent and accountable.",
    icon: ShieldCheck,
  },
];

const sections = [
  {
    title: "How we can help",
    description: "Support is available for shoppers, sellers, and anyone needing help navigating the marketplace.",
    items: [
      "Track orders and delivery updates",
      "Resolve payment, account, and sign-in issues",
      "Review returns, exchanges, and policy questions",
      "Get connected with sellers for product-specific concerns",
    ],
  },
  {
    title: "Popular support topics",
    description: "Most questions can be answered quickly through our support experience and buying policies.",
    items: [
      "Shipping estimates and fulfillment timing",
      "Order changes, cancellations, and confirmations",
      "Store support for seller-related questions",
      "Returns, refunds, and protected purchase guidance",
    ],
  },
];

export default function HelpPage() {
  return (
    <CommerceInfoPage
      eyebrow="Help center"
      title="Support that feels as premium as the marketplace itself."
      description="From account questions to order issues, our help experience is designed to keep every customer feeling informed and supported."
      stats={[
        { value: "24/7", label: "Assistance availability" },
        { value: "< 1 hr", label: "Typical response window" },
        { value: "3x", label: "Faster than standard support handoffs" },
        { value: "100%", label: "Policy-backed guidance" },
      ]}
      highlights={highlights}
      sections={sections}
      primaryAction={{ label: "Go to orders", href: "/orders" }}
      secondaryAction={{ label: "Browse the shop", href: "/shop" }}
      footerTitle="Need a hand? We’re ready to help."
      footerDescription="The ABU support experience brings together clear answers, helpful policies, and real assistance for every shopper and seller."
    />
  );
}
