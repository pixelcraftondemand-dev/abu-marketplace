import CommerceInfoPage from "@/components/CommerceInfoPage";
import { Mail, Phone, Send, Store } from "lucide-react";

const highlights = [
  {
    title: "Email support",
    description: "Send us your inquiry and our team will respond with the next best step.",
    icon: Mail,
  },
  {
    title: "Call us directly",
    description: "Speak with our team for urgent account, order, or seller support questions.",
    icon: Phone,
  },
  {
    title: "Store support",
    description: "We also help sellers keep their storefront experience running smoothly and professionally.",
    icon: Store,
  },
];

const sections = [
  {
    title: "Reach our team",
    description: "Whether you are a customer, seller, or partner, we are here to help with everyday and urgent questions.",
    items: [
      "Order and delivery questions",
      "Payment, returns, and account support",
      "Seller onboarding and storefront guidance",
      "General marketplace and partnership inquiries",
    ],
  },
  {
    title: "Contact details",
    description: "Use the options below to get in touch with the ABU Marketplace team.",
    items: [
      "Email: abumarketplace.shop@gmail.com",
      "Phone: +232 32 110 054",
      "Location: 50 Pratt Street, Freetown, Sierra Leone",
      "Response time: typically within one working day",
    ],
  },
];

export default function ContactPage() {
  return (
    <CommerceInfoPage
      eyebrow="Contact us"
      title="We’re here to help you shop, sell, and grow with confidence."
      description="Our support team is ready to assist with everything from a single order question to a larger seller or partnership request."
      stats={[
        { value: "1 day", label: "Typical response window" },
        { value: "100%", label: "Human support" },
        { value: "Fast", label: "Priority for urgent requests" },
        { value: "Multi-channel", label: "Email and phone support" },
      ]}
      highlights={highlights}
      sections={sections}
      primaryAction={{ label: "Email support", href: "mailto:abumarketplace.shop@gmail.com" }}
      secondaryAction={{ label: "View help center", href: "/help" }}
      footerTitle="We’re ready when you are."
      footerDescription="Use our contact experience to reach the right team quickly and keep your shopping or selling journey moving forward."
    />
  );
}
