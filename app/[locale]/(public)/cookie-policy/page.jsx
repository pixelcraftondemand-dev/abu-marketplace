import LegalPage from "@/components/privacypolicypage";

const sections = [
    {
        heading: "What Cookies Are",
        body: [
            "Cookies and similar technologies are small files or browser storage items that help a website remember information about your visit, device, preferences, cart, and session.",
        ],
    },
    {
        heading: "How We Use Cookies",
        body: [
            "ABU Marketplace uses essential cookies for login, security, cart behaviour, checkout, account protection, and site reliability.",
            "We may also use preference, analytics, and promotional cookies to remember choices, understand popular products, improve search and recommendations, and measure how offers perform.",
        ],
    },
    {
        heading: "Types of Cookies",
        body: [
            "Essential cookies are required for core features such as authentication, cart, checkout, fraud prevention, and security.",
            "Preference cookies remember choices such as cookie consent and shopping settings. Analytics and promotional cookies help us improve product discovery, deals, and marketplace performance.",
        ],
    },
    {
        heading: "Managing Cookies",
        body: [
            "You can control cookies through your browser settings. Blocking essential cookies may prevent login, cart, checkout, or seller tools from working correctly.",
            "When a cookie notice is shown, you can accept cookies or keep only the essential experience. You can clear browser data at any time to reset your choice.",
        ],
    },
    {
        heading: "Contact",
        body: [
            "For cookie questions, contact ABU Marketplace at abumarketplace.shop@gmail.com.",
        ],
    },
];

export default function CookiePolicy() {
    return (
        <LegalPage
            title="Cookie Policy"
            updated="July 10, 2026"
            intro="This policy explains how ABU Marketplace uses cookies and similar browser technologies to keep the site secure, remember shopping choices, and improve the marketplace."
            sections={sections}
        />
    );
}
