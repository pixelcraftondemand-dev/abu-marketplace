import CommerceInfoPage from "@/components/CommerceInfoPage";
import { CircleCheckBig, RefreshCw, ShieldAlert, ShoppingBag } from "lucide-react";

const highlights = [
  {
    title: "Clear return standards",
    description: "Each return is handled with visibility, expectations, and support from the first request onward.",
    icon: RefreshCw,
  },
  {
    title: "Easy resolution",
    description: "Whether it is a size issue, quality concern, or order mistake, we help you resolve it promptly.",
    icon: CircleCheckBig,
  },
  {
    title: "Protected purchases",
    description: "Eligible orders are backed by clear policies that give customers confidence in every purchase.",
    icon: ShieldAlert,
  },
];

const sections = [
  {
    title: "How returns work",
    description: "Returns are simple when the policy is clear and support is close at hand.",
    items: [
      "Review eligibility before submitting a return request",
      "Use the order support flow to request a return or exchange",
      "Provide the necessary order and product details for quick review",
      "Receive updates on the return status and next steps",
    ],
  },
  {
    title: "Things to know",
    description: "Return eligibility can depend on the item type, condition, and policy shown for that product.",
    items: [
      "Items must be unused, complete, and returned in the original condition where applicable",
      "Some goods may not be returnable for hygiene, digital, or custom reasons",
      "Refund timing can vary by payment method and seller processing",
      "Support is available if an item arrives damaged, incorrect, or not as described",
    ],
  },
];

export default function ReturnsPage() {
  return (
    <CommerceInfoPage
      eyebrow="Returns"
      title="Returns designed to feel simple and reassuring."
      description="ABU helps customers resolve issues quickly so shopping feels safe, even when a product is not quite right."
      stats={[
        { value: "Easy", label: "Return requests" },
        { value: "Fast", label: "Support follow-up" },
        { value: "Clear", label: "Policy guidance" },
        { value: "Secure", label: "Resolution handling" },
      ]}
      highlights={highlights}
      sections={sections}
      primaryAction={{ label: "View help center", href: "/help" }}
      secondaryAction={{ label: "Shop now", href: "/shop" }}
      footerTitle="A smooth resolution experience matters."
      footerDescription="Our return experience is built to protect customer confidence and keep every transaction feeling professional."
    />
  );
}
