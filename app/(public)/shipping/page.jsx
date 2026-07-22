import CommerceInfoPage from "@/components/CommerceInfoPage";
import { PackageCheck, ShieldCheck, Truck, Zap } from "lucide-react";

const highlights = [
  {
    title: "Reliable delivery",
    description: "We work with sellers and carriers to make delivery expectations clear and dependable.",
    icon: Truck,
  },
  {
    title: "Fast fulfilment",
    description: "Many orders are prepared for dispatch quickly so shoppers receive their items without delays.",
    icon: Zap,
  },
  {
    title: "Protected orders",
    description: "Your purchase is backed by transparent policies and support when delivery issues happen.",
    icon: ShieldCheck,
  },
];

const sections = [
  {
    title: "Shipping options",
    description: "Delivery details vary by seller, region, and product type, but every order is supported with clear expectations.",
    items: [
      "Free shipping thresholds shown at checkout",
      "Estimated dispatch and delivery windows provided on eligible products",
      "Support for order tracking and delivery follow-up",
      "Flexible handling for high-priority and regional orders",
    ],
  },
  {
    title: "What to expect",
    description: "Our shipping experience is designed to feel modern, predictable, and easy to understand.",
    items: [
      "Transparent delivery timelines before checkout",
      "Fast communication if there is a delay or exception",
      "Reliable handling for fragile, premium, and time-sensitive products",
      "Friendly support for delivery questions or missing items",
    ],
  },
];

export default function ShippingPage() {
  return (
    <CommerceInfoPage
      eyebrow="Shipping"
      title="Shipping that feels designed for premium ecommerce."
      description="From the moment you place an order to the day it arrives, ABU helps deliver a smooth and trustworthy experience."
      stats={[
        { value: "Fast", label: "Dispatch windows" },
        { value: "Tracked", label: "Delivery updates" },
        { value: "Secure", label: "Order protection" },
        { value: "Flexible", label: "Regional delivery support" },
      ]}
      highlights={highlights}
      sections={sections}
      primaryAction={{ label: "Explore products", href: "/shop" }}
      secondaryAction={{ label: "View returns", href: "/returns" }}
      footerTitle="Your order should feel as polished as the product inside."
      footerDescription="ABU brings together efficient fulfillment and clear customer support so delivery feels dependable from start to finish."
    />
  );
}
