"use client";

import Link from "next/link";
import { ArrowLeft, Shield, Eye, Lock, Database, Share2, Cookie, UserCheck, Mail, Globe, Trash2 } from "lucide-react";

const sections = [
  {
    id: "overview",
    icon: Shield,
    title: "1. Overview",
    content: `ABU Marketplace ("we", "us", "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website abumarketplace.shop (the "Site") and use our services.

Please read this privacy policy carefully. If you do not agree with the terms of this privacy policy, please do not access the site.

We reserve the right to make changes to this Privacy Policy at any time and for any reason. We will alert you about any changes by updating the "Last Updated" date of this Privacy Policy. You are encouraged to periodically review this Privacy Policy to stay informed of updates.`,
  },
  {
    id: "collection",
    icon: Database,
    title: "2. Information We Collect",
    content: `We collect information that you provide directly to us when you:
• Register for an account
• Make a purchase or sale
• List products for sale
• Contact customer support
• Subscribe to newsletters
• Participate in surveys or promotions

Personal Information:
• Name, email address, phone number, and mailing address
• Payment information (processed securely by third-party processors)
• Profile picture and bio (optional)
• Government-issued ID (for seller verification only)

Automatically Collected Information:
• IP address and device information
• Browser type and operating system
• Pages visited and time spent on the Site
• Referring website or application
• Click patterns and search queries

Cookies and Tracking Technologies:
We use cookies, web beacons, tracking pixels, and other tracking technologies to help customize the Site and improve your experience.`,
  },
  {
    id: "usage",
    icon: Eye,
    title: "3. How We Use Your Information",
    content: `We use the information we collect to:
• Provide, operate, and maintain our services
• Process and fulfill orders and transactions
• Verify seller identity and prevent fraud
• Communicate with you about orders, account updates, and promotions
• Improve our website, products, and services
• Personalize your experience and deliver relevant content
• Analyze usage patterns and trends
• Comply with legal obligations and enforce our terms
• Protect the security and integrity of our platform

We will never sell your personal information to third parties for marketing purposes.`,
  },
  {
    id: "sharing",
    icon: Share2,
    title: "4. Information Sharing",
    content: `We may share your information with:

Service Providers:
• Payment processors (Stripe, PayPal) for transaction processing
• Shipping carriers for order fulfillment
• Cloud hosting providers for infrastructure
• Analytics providers for usage analysis
• Email service providers for communications

These providers are contractually obligated to protect your information and only use it for the specified purposes.

Business Transfers:
If we are involved in a merger, acquisition, or sale of all or a portion of our assets, your information may be transferred as part of that transaction.

Legal Requirements:
We may disclose your information if required to do so by law or in response to valid requests by public authorities (e.g., court orders, subpoenas).

With Your Consent:
We may share your information with third parties when you have given us your consent to do so.`,
  },
  {
    id: "security",
    icon: Lock,
    title: "5. Data Security",
    content: `We implement appropriate technical and organizational measures to protect your personal information:

• 256-bit SSL/TLS encryption for all data in transit
• AES-256 encryption for sensitive data at rest
• Regular security audits and penetration testing
• Multi-factor authentication for account access
• Role-based access controls for staff
• Automated threat detection and prevention
• Regular backup and disaster recovery procedures

While we have taken reasonable steps to secure the personal information you provide to us, please be aware that despite our efforts, no security measures are perfect or impenetrable, and no method of data transmission can be guaranteed against any interception or other type of misuse.`,
  },
  {
    id: "cookies",
    icon: Cookie,
    title: "6. Cookies & Tracking",
    content: `We use the following types of cookies:

Essential Cookies:
Necessary for the website to function properly. These cannot be disabled.

Functional Cookies:
Enable enhanced functionality and personalization, such as remembering your preferences.

Analytics Cookies:
Help us understand how visitors interact with our website by collecting and reporting information anonymously.

Marketing Cookies:
Used to track visitors across websites to display relevant advertisements.

You can manage your cookie preferences through our Cookie Consent Banner or your browser settings. Please note that disabling certain cookies may affect the functionality of the Site.`,
  },
  {
    id: "rights",
    icon: UserCheck,
    title: "7. Your Rights",
    content: `Depending on your location, you may have the following rights regarding your personal information:

• Right to Access: Request a copy of the personal information we hold about you
• Right to Rectification: Request correction of inaccurate or incomplete information
• Right to Erasure: Request deletion of your personal information ("right to be forgotten")
• Right to Restrict Processing: Request limitation on how we use your data
• Right to Data Portability: Request transfer of your data to another service
• Right to Object: Object to processing based on legitimate interests or direct marketing
• Right to Withdraw Consent: Withdraw consent at any time where processing is based on consent

To exercise these rights, please contact us at abumarketplace.shop@gmail.com. We will respond to your request within 30 days.`,
  },
  {
    id: "retention",
    icon: Trash2,
    title: "8. Data Retention",
    content: `We retain your personal information only for as long as necessary to fulfill the purposes for which it was collected:

• Account information: Retained until you delete your account or for 7 years after last activity (whichever comes first)
• Transaction records: Retained for 7 years for tax and legal compliance
• Communication records: Retained for 3 years
• Analytics data: Retained for 2 years (anonymized after 1 year)
• Cookie data: Retained according to cookie type (session or persistent)

After the retention period expires, your data will be securely deleted or anonymized.`,
  },
  {
    id: "international",
    icon: Globe,
    title: "9. International Transfers",
    content: `Your information may be transferred to — and maintained on — computers located outside of your state, province, country, or other governmental jurisdiction where the data protection laws may differ from those in your jurisdiction.

If you are located outside Sierra Leone and choose to provide information to us, please note that we transfer the information, including personal information, to Sierra Leone and process it there.

Your consent to this Privacy Policy followed by your submission of such information represents your agreement to that transfer. We will take all steps reasonably necessary to ensure that your data is treated securely and in accordance with this Privacy Policy.`,
  },
  {
    id: "children",
    icon: Shield,
    title: "10. Children's Privacy",
    content: `Our services are not intended for individuals under the age of 18. We do not knowingly collect personal information from children under 18. If we learn that we have collected personal information from a child under 18, we will delete that information as quickly as possible.

If you believe we might have any information from or about a child under 18, please contact us immediately at abumarketplace.shop@gmail.com.`,
  },
  {
    id: "contact",
    icon: Mail,
    title: "11. Contact Us",
    content: `If you have any questions about this Privacy Policy, please contact us:

ABU Marketplace
50 Pratt Street, Freetown, Sierra Leone
Email: abumarketplace.shop@gmail.com
Phone: +232 32 110 054

Data Protection Officer: dpo@abumarketplace.shop

If you are not satisfied with our response, you have the right to lodge a complaint with your local data protection authority.

Last Updated: July 19, 2026`,
  }
];

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-[#0B0F19]">
      {/* Header */}
      <div className="border-b border-white/[0.06]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-slate-400 hover:text-amber-400 transition mb-6"
          >
            <ArrowLeft size={18} />
            Back to Home
          </Link>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
              <Shield size={24} />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-white">
                Privacy Policy
              </h1>
              <p className="text-sm text-slate-500">
                Last Updated: July 19, 2026
              </p>
            </div>
          </div>
          <p className="text-slate-400">
            Your privacy is our priority. This policy explains how we collect,
            use, and protect your personal information.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        {/* Table of Contents */}
        <div className="mb-12 p-6 rounded-2xl bg-[#111827]/60 border border-white/[0.06]">
          <h2 className="text-lg font-semibold text-white mb-4">
            Table of Contents
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {sections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-white/[0.04] transition-all"
              >
                <section.icon size={14} />
                {section.title}
              </a>
            ))}
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-12">
          {sections.map((section) => (
            <section key={section.id} id={section.id} className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                  <section.icon size={18} />
                </div>
                <h2 className="text-xl font-bold text-white">
                  {section.title}
                </h2>
              </div>
              <div className="pl-13 ml-13">
                <div className="p-6 rounded-2xl bg-[#111827]/40 border border-white/[0.04]">
                  <div className="prose prose-invert prose-sm max-w-none">
                    {section.content.split("\n\n").map((paragraph, i) => (
                      <p
                        key={i}
                        className="text-slate-300 leading-relaxed mb-4 last:mb-0 whitespace-pre-line"
                      >
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}