import LegalPage from "@/components/privacypolicypage";

const sections = [
    {
        heading: "Using ABU Marketplace",
        body: [
            "ABU Marketplace connects customers with stores that list products on the platform. You agree to use the site for lawful shopping, selling, browsing, and account activity only.",
            "You are responsible for keeping your account details accurate and for protecting your login credentials. If you believe your account has been used without permission, contact us quickly so we can help secure it.",
        ],
    },
    {
        heading: "Orders, Pricing, and Availability",
        body: [
            "Product prices, stock status, delivery options, coupons, and promotions may change. We try to keep listings accurate, but errors can happen and we may correct them before accepting or fulfilling an order.",
            "A checkout confirmation means we received your order request. The order is accepted when payment is approved where required and the seller confirms fulfilment.",
        ],
    },
    {
        heading: "Delivery and Returns",
        body: [
            "Delivery timing depends on the seller, destination, product availability, and payment method. Promotional delivery messages, such as free delivery thresholds, apply only when shown at checkout.",
            "Eligible items may be returned within the return window shown on the site, provided they are unused, complete, and in a returnable condition. Some goods may not be returnable for hygiene, digital, custom, or safety reasons.",
        ],
    },
    {
        heading: "Sellers and Product Listings",
        body: [
            "Sellers are responsible for the products, descriptions, images, prices, stock, warranties, and customer support commitments they publish. ABU Marketplace may review, suspend, or remove listings that appear misleading, unsafe, unlawful, or harmful to buyers.",
            "Sellers must not list counterfeit, stolen, restricted, unsafe, or infringing products. Repeated violations may lead to store suspension or account removal.",
        ],
    },
    {
        heading: "Payments, Coupons, and Membership",
        body: [
            "Payments may be handled by third-party payment providers. Coupons, discounts, free delivery offers, plus membership benefits, and other promotions may include limits, expiry dates, eligibility rules, and minimum order values.",
            "We may reject, cancel, or reverse promotional use that appears fraudulent, automated, duplicated, or inconsistent with the promotion rules.",
        ],
    },
    {
        heading: "Contact",
        body: [
            "For support, questions, or account issues, contact ABU Marketplace at abumarketplace.shop@gmail.com.",
        ],
    },
];

export default function TermsAndConditions() {
    return (
        <LegalPage
            title="Terms & Conditions"
            updated="July 10, 2026"
            intro="These terms explain the rules for using ABU Marketplace as a shopper, seller, or visitor. They are written to keep the marketplace fair, clear, and safe for everyone."
            sections={sections}
        />
    );
}
