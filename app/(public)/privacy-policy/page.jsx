import LegalPage from "@/components/privacypolicypage";

const sections = [
    {
        heading: "Information We Collect",
        body: [
            "We collect information you provide when you create an account, place an order, create a store, save an address, contact support, submit a rating, or use marketplace features.",
            "This may include your name, email address, phone number, delivery address, order details, payment status, store information, messages, reviews, and device or usage information needed to operate the site.",
        ],
    },
    {
        heading: "How We Use Information",
        body: [
            "We use information to process orders, manage accounts, support sellers, prevent fraud, improve product discovery, personalize shopping, send service updates, and measure marketplace performance.",
            "We may also use information to show relevant offers, coupons, store recommendations, and shopping features similar to modern marketplace experiences.",
        ],
    },
    {
        heading: "Sharing Information",
        body: [
            "We share only what is needed with sellers, delivery partners, payment providers, authentication providers, analytics tools, support services, and legal or safety authorities when required.",
            "We do not sell your personal information. Sellers receive order and delivery details only so they can fulfil and support your purchase.",
            "We may disclose account, order, payment, and transaction records to law enforcement, regulators, or other authorities when we are required or permitted to do so by law — for example, in response to a lawful request or for anti-money-laundering purposes.",
        ],
    },
    {
        heading: "Security and Retention",
        body: [
            "We use reasonable technical and organisational safeguards to protect your information. No online service can promise perfect security, so you should also keep your account credentials private.",
            "We keep information for as long as needed to provide the service, meet legal obligations, resolve disputes, prevent abuse, and maintain accurate marketplace records.",
            "When an account is closed, we retain the account and its transaction records (including orders, payments, wallet history, addresses, and reviews) for at least 5 years from the date of closure to comply with anti-money-laundering and financial record-keeping requirements and to respond to lawful requests from law enforcement or regulators.",
        ],
    },
    {
        heading: "Your Choices",
        body: [
            "You can update account information, manage saved addresses, choose whether to receive optional marketing, and contact us to ask about access, correction, or deletion where applicable.",
            "Some information must be kept for active orders, payment records, security logs, legal compliance, or seller/customer dispute resolution. In particular, closed-account records subject to our 5-year retention policy are kept to meet anti-money-laundering obligations and cannot be deleted before the retention period ends.",
        ],
    },
    {
        heading: "Contact",
        body: [
            "For privacy questions, contact ABU Marketplace at abumarketplace.shop@gmail.com.",
        ],
    },
];

export default function PrivacyPolicy() {
    return (
        <LegalPage
            title="Privacy Policy"
            updated="August 6, 2026"
            intro="This policy explains how ABU Marketplace collects, uses, shares, and protects information when you browse, shop, sell, or communicate with us."
            sections={sections}
        />
    );
}
