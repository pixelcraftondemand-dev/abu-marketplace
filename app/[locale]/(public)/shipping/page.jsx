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
    title: "Delivery options",
    description: "Delivery details vary by seller and product type, with clear expectations for every order.",
    items: [
      "Free delivery thresholds shown at checkout",
      "Estimated dispatch and delivery windows provided on eligible products",
      "Support for order tracking and delivery follow-up",
      "Flexible handling for high-priority and local orders",
    ],
  },
  {
    title: "What to expect",
    description: "Our delivery service is designed to be predictable and easy to understand.",
    items: [
      "Transparent delivery timelines before checkout",
      "Fast communication if there is a delay or exception",
      "Reliable handling for fragile, premium, and time-sensitive products",
      "Friendly support for delivery questions or missing items",
    ],
  },
];

export default function DeliveryPage() {
  return (
    <CommerceInfoPage
      eyebrow="Delivery"
      title="Delivery made clear and convenient."
      description="From the moment you place an order to the day it arrives, ABU helps make delivery smooth and straightforward."
      stats={[
        { value: "Fast", label: "Dispatch windows" },
        { value: "Tracked", label: "Delivery updates" },
        { value: "Secure", label: "Order protection" },
        { value: "Flexible", label: "Local delivery support" },
      ]}
      highlights={highlights}
      sections={sections}
      primaryAction={{ label: "Explore products", href: "/shop" }}
      secondaryAction={{ label: "View returns", href: "/returns" }}
      footerTitle="A clear, convenient delivery experience."
      footerDescription="ABU brings together efficient fulfilment and clear customer support from order to delivery."
    />
  );
}
