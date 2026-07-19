"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Shield, Check, AlertTriangle, FileText, Lock, Eye, Cookie, Globe, MessageSquare, Scale, Ban, Gavel, ArrowRight } from "lucide-react";

const sections = [
  {
    id: "acceptance",
    icon: FileText,
    title: "1. Acceptance of Terms",
    content: `By accessing, browsing, or using ABU Marketplace ("the Platform", "we", "us", or "our"), you acknowledge that you have read, understood, and agree to be bound by these Terms and Conditions ("Terms"), our Privacy Policy, Cookie Policy, and Seller Agreement (if applicable). These Terms constitute a legally binding agreement between you and ABU Marketplace.

If you do not agree to all of these Terms, you are expressly prohibited from using the Platform and must discontinue use immediately. We reserve the right, in our sole discretion, to make changes or modifications to these Terms at any time and for any reason. We will alert you about any changes by updating the "Last Updated" date of these Terms, and you waive any right to receive specific notice of each such change.

It is your responsibility to periodically review these Terms to stay informed of updates. You will be subject to, and will be deemed to have been made aware of and to have accepted, the changes in any revised Terms by your continued use of the Platform after the date such revised Terms are posted.`,
  },
  {
    id: "eligibility",
    icon: Shield,
    title: "2. User Eligibility & Accounts",
    content: `You must be at least 18 years of age to use this Platform. By using the Platform, you represent and warrant that you are at least 18 years old and have the legal capacity to enter into a binding contract.

To access certain features of the Platform, you must register for an account. You agree to provide accurate, current, and complete information during the registration process and to update such information to keep it accurate, current, and complete. ABU Marketplace reserves the right to suspend or terminate your account if any information provided proves to be inaccurate, false, or outdated.

You are solely responsible for maintaining the confidentiality of your account credentials, including your password. You agree to accept responsibility for all activities that occur under your account. You must notify us immediately upon becoming aware of any breach of security or unauthorized use of your account.

We reserve the right to remove, reclaim, or change a username you select if we determine, in our sole discretion, that such username is inappropriate, obscene, or otherwise objectionable.`,
  },
  {
    id: "marketplace",
    icon: Globe,
    title: "3. Marketplace Rules & Conduct",
    content: `ABU Marketplace provides a platform for buyers and sellers to transact. We do not own, create, sell, resell, provide, control, or manage any products or services listed on the Platform. ABU Marketplace is not a party to any transaction between users.

As a buyer, you agree to:
• Provide accurate and complete information for all purchases
• Pay all charges incurred through your account at the prices in effect when such charges are incurred
• Not use the Platform for any illegal or unauthorized purpose
• Not attempt to circumvent any security measures or access unauthorized areas
• Not engage in fraudulent transactions, including chargebacks without cause

As a seller, you agree to:
• Only list products that you have the legal right to sell
• Ensure all product descriptions, images, and pricing are accurate and not misleading
• Fulfill orders in a timely manner as specified in your store policies
• Comply with all applicable laws, regulations, and tax obligations
• Not list prohibited items including counterfeit goods, illegal substances, weapons, or stolen property
• Maintain adequate inventory levels and promptly update stock availability

We reserve the right to remove any listing, suspend any account, or cancel any transaction that violates these Terms or that we determine, in our sole discretion, to be harmful to the Platform or its users.`,
  },
  {
    id: "payments",
    icon: Lock,
    title: "4. Payments, Fees & Refunds",
    content: `All payments on the Platform are processed through secure third-party payment processors. ABU Marketplace does not store your full payment card details. By making a purchase, you authorize us to charge your selected payment method for the total amount, including any applicable taxes and fees.

Pricing and Availability:
• All prices are listed in the currency displayed and are subject to change without notice
• We reserve the right to correct pricing errors and to cancel orders placed at incorrect prices
• Product availability is not guaranteed and may change without notice

Fees:
• Buyers: No additional platform fees beyond the listed product price, shipping, and applicable taxes
• Sellers: Commission fees as specified in the Seller Agreement, payable at the time of transaction completion
• Payment processing fees may apply and will be disclosed at checkout

Refunds and Returns:
• Return policies are set by individual sellers and must be clearly stated on product listings
• Buyers must initiate return requests within the timeframe specified by the seller's policy
• Refunds will be processed to the original payment method within 5-10 business days of return acceptance
• ABU Marketplace reserves the right to mediate disputes and issue refunds at our discretion in cases of fraud, misrepresentation, or failure to deliver

Chargebacks:
• Initiating a fraudulent chargeback will result in immediate account suspension
• We cooperate fully with payment processors and law enforcement in cases of payment fraud`,
  },
  {
    id: "privacy",
    icon: Eye,
    title: "5. Privacy & Data Protection",
    content: `Your privacy is critically important to us. Our Privacy Policy, which is incorporated into these Terms by reference, explains how we collect, use, store, and protect your personal information.

Key Data Practices:
• We collect personal information necessary to provide our services, including name, email, address, phone number, and payment information
• We use industry-standard encryption (256-bit SSL) to protect data in transit
• We do not sell your personal information to third parties
• We may share data with trusted service providers (payment processors, shipping carriers) solely for the purpose of fulfilling transactions
• We retain your data only as long as necessary for business purposes or as required by law

Your Rights:
• You have the right to access, correct, or delete your personal information
• You may opt out of marketing communications at any time
• You may request a copy of your data in a portable format
• You have the right to lodge a complaint with a data protection authority

Cookies and Tracking:
• We use cookies and similar technologies to enhance your experience, analyze usage, and personalize content
• You can manage cookie preferences through your browser settings or our Cookie Consent Banner
• Third-party analytics and advertising partners may also use cookies as described in our Cookie Policy`,
  },
  {
    id: "content",
    icon: FileText,
    title: "6. User-Generated Content",
    content: `The Platform may allow you to post, submit, publish, display, or transmit content including reviews, ratings, comments, photos, and videos ("User Content").

You retain ownership of your User Content, but by posting it on the Platform, you grant ABU Marketplace a non-exclusive, worldwide, royalty-free, perpetual, irrevocable, sublicensable, and transferable license to use, reproduce, modify, adapt, publish, translate, distribute, and display such User Content in connection with operating and promoting the Platform.

You represent and warrant that:
• You own or control all rights to your User Content
• Your User Content does not violate the rights of any third party, including copyright, trademark, privacy, or publicity rights
• Your User Content is accurate and not misleading
• Your User Content does not contain defamatory, obscene, abusive, or otherwise objectionable material

We reserve the right to remove, edit, or refuse to post any User Content for any reason, including violation of these Terms. We are not responsible for any User Content posted by users and do not endorse any opinions expressed therein.`,
  },
  {
    id: "prohibited",
    icon: Ban,
    title: "7. Prohibited Activities",
    content: `You are strictly prohibited from using the Platform for any of the following purposes:

• Violating any applicable local, state, national, or international law or regulation
• Infringing upon or violating our intellectual property rights or the intellectual property rights of others
• Harassing, abusing, or harming another person, or engaging in any form of hate speech or discrimination
• Transmitting spam, chain letters, or other unsolicited communications
• Impersonating another user, person, or entity, or misrepresenting your affiliation with any person or entity
• Attempting to bypass any measures of the Platform designed to prevent or restrict access
• Using any automated system, software, or device to scrape, crawl, spider, or mine data from the Platform
• Introducing viruses, trojans, worms, logic bombs, or other malicious or technologically harmful material
• Interfering with or disrupting the integrity or performance of the Platform or its underlying infrastructure
• Engaging in fraudulent activities, including payment fraud, identity theft, or misrepresentation of products
• Listing or selling prohibited items including: illegal drugs, weapons, counterfeit goods, stolen property, hazardous materials, or items that promote illegal activity

Violation of any of these prohibitions may result in immediate account termination, legal action, and referral to appropriate law enforcement authorities.`,
  },
  {
    id: "intellectual",
    icon: Scale,
    title: "8. Intellectual Property",
    content: `All content on the Platform, including but not limited to text, graphics, logos, icons, images, audio clips, digital downloads, data compilations, and software, is the property of ABU Marketplace or its content suppliers and is protected by international copyright, trademark, and other intellectual property laws.

The ABU Marketplace name, logo, and all related names, logos, product and service names, designs, and slogans are trademarks of ABU Marketplace. You must not use such marks without our prior written permission.

You are granted a limited, non-exclusive, non-transferable, revocable license to access and use the Platform for personal, non-commercial use. This license does not include:
• Any resale or commercial use of the Platform or its contents
• Any collection or use of product listings, descriptions, or prices for commercial purposes
• Any derivative use of the Platform or its contents
• Any use of data mining, robots, or similar data gathering and extraction tools
• Any downloading or copying of account information for the benefit of another merchant

All rights not expressly granted to you in these Terms remain reserved by ABU Marketplace.`,
  },
  {
    id: "liability",
    icon: AlertTriangle,
    title: "9. Limitation of Liability",
    content: `TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW, ABU MARKETPLACE AND ITS OFFICERS, DIRECTORS, EMPLOYEES, AGENTS, AFFILIATES, LICENSORS, AND SERVICE PROVIDERS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES, RESULTING FROM:

• YOUR ACCESS TO OR USE OF OR INABILITY TO ACCESS OR USE THE PLATFORM
• ANY CONDUCT OR CONTENT OF ANY THIRD PARTY ON THE PLATFORM
• ANY CONTENT OBTAINED FROM THE PLATFORM
• UNAUTHORIZED ACCESS, USE, OR ALTERATION OF YOUR TRANSMISSIONS OR CONTENT
• ANY TRANSACTION BETWEEN BUYERS AND SELLERS
• ANY PRODUCTS OR SERVICES PURCHASED THROUGH THE PLATFORM

IN NO EVENT SHALL OUR TOTAL LIABILITY TO YOU FOR ALL CLAIMS EXCEED THE AMOUNT YOU HAVE PAID TO US IN THE TWELVE (12) MONTHS PRIOR TO THE EVENT GIVING RISE TO LIABILITY, OR ONE HUNDRED UNITED STATES DOLLARS (USD $100), WHICHEVER IS GREATER.

THE PLATFORM IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS WITHOUT ANY WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT, OR COURSE OF PERFORMANCE.

We do not warrant that:
• The Platform will function uninterrupted, secure, or available at any particular time or location
• Any errors or defects will be corrected
• The Platform is free of viruses or other harmful components
• The results of using the Platform will meet your requirements`,
  },
  {
    id: "dispute",
    icon: Gavel,
    title: "10. Dispute Resolution & Governing Law",
    content: `These Terms shall be governed by and construed in accordance with the laws of Sierra Leone, without regard to its conflict of law provisions.

Any dispute, controversy, or claim arising out of or relating to these Terms, including the formation, interpretation, breach, termination, or validity thereof, shall be resolved through the following process:

1. Informal Resolution: Before filing any claim, you agree to attempt to resolve the dispute informally by contacting us at support@abumarketplace.shop with a detailed description of your complaint. We will attempt to resolve the dispute informally within 30 business days.

2. Mediation: If informal resolution fails, either party may initiate mediation through a mutually agreed-upon mediator. Mediation shall be conducted in Freetown, Sierra Leone, unless otherwise agreed.

3. Arbitration: If mediation fails, the dispute shall be finally resolved by binding arbitration administered by the Sierra Leone Arbitration Association in accordance with its Commercial Arbitration Rules. The arbitration shall be conducted in English in Freetown, Sierra Leone. The arbitrator's decision shall be final and binding, and judgment on the award may be entered in any court of competent jurisdiction.

4. Class Action Waiver: YOU AGREE THAT ANY PROCEEDINGS, WHETHER IN ARBITRATION OR COURT, WILL BE CONDUCTED ONLY ON AN INDIVIDUAL BASIS AND NOT IN A CLASS, CONSOLIDATED, OR REPRESENTATIVE ACTION. YOU WAIVE ANY RIGHT TO PARTICIPATE IN CLASS ACTIONS.

Notwithstanding the foregoing, either party may bring an individual action in small claims court or seek injunctive or other equitable relief in a court of competent jurisdiction to prevent the actual or threatened infringement, misappropriation, or violation of a party's copyrights, trademarks, trade secrets, patents, or other intellectual property rights.`,
  },
  {
    id: "termination",
    icon: Ban,
    title: "11. Termination & Account Closure",
    content: `We reserve the right to suspend or terminate your account and access to the Platform at our sole discretion, without notice, for any reason, including but not limited to violation of these Terms, fraudulent activity, or prolonged inactivity.

Upon termination:
• All licenses and rights granted to you under these Terms will immediately cease
• You must immediately cease all use of the Platform
• We may delete your account data and User Content, subject to our data retention policies
• Any pending transactions may be cancelled at our discretion
• You remain liable for all amounts due up to and including the date of termination

You may close your account at any time by contacting support@abumarketplace.shop. Account closure does not relieve you of any obligations incurred prior to closure, including payment obligations or pending disputes.

Sections 5 (Privacy), 8 (Intellectual Property), 9 (Limitation of Liability), 10 (Dispute Resolution), and any other provisions that by their nature should survive termination shall survive termination of these Terms.`,
  },
  {
    id: "misc",
    icon: MessageSquare,
    title: "12. Miscellaneous",
    content: `Entire Agreement: These Terms, together with our Privacy Policy, Cookie Policy, and Seller Agreement, constitute the entire agreement between you and ABU Marketplace regarding your use of the Platform and supersede all prior agreements and understandings.

Severability: If any provision of these Terms is held to be invalid, illegal, or unenforceable by a court of competent jurisdiction, such provision shall be modified to the minimum extent necessary to make it valid and enforceable, and the remaining provisions shall remain in full force and effect.

Waiver: No waiver of any provision of these Terms shall be effective unless in writing and signed by the party against whom the waiver is sought to be enforced. No failure or delay in exercising any right shall operate as a waiver thereof.

Assignment: You may not assign or transfer these Terms without our prior written consent. We may assign these Terms at any time without restriction.

Notices: All notices required or permitted under these Terms shall be in writing and delivered to the addresses specified by the parties, or via email to support@abumarketplace.shop.

Force Majeure: We shall not be liable for any failure or delay in performance due to circumstances beyond our reasonable control, including but not limited to acts of God, war, terrorism, riots, embargoes, acts of civil or military authorities, fire, floods, accidents, strikes, or shortages of transportation, facilities, fuel, energy, labor, or materials.

Contact Information:
ABU Marketplace
50 Pratt Street, Freetown, Sierra Leone
Email: support@abumarketplace.shop
Phone: +232 32 110 054

Last Updated: July 19, 2026`,
  },
];

export default function TermsAndConditionsPage() {
  const [accepted, setAccepted] = useState(false);
  const [activeSection, setActiveSection] = useState(null);

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
              <FileText size={24} />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-white">
                Terms & Conditions
              </h1>
              <p className="text-sm text-slate-500">
                Last Updated: July 19, 2026
              </p>
            </div>
          </div>
          <p className="text-slate-400">
            Please read these Terms and Conditions carefully before using ABU
            Marketplace. By using our platform, you agree to be bound by these
            terms.
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
              <button
                key={section.id}
                onClick={() => {
                  setActiveSection(section.id);
                  document
                    .getElementById(section.id)
                    ?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-all ${
                  activeSection === section.id
                    ? "bg-amber-500/10 text-amber-400"
                    : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
                }`}
              >
                <section.icon size={14} />
                {section.title}
              </button>
            ))}
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-12">
          {sections.map((section) => (
            <section
              key={section.id}
              id={section.id}
              className="scroll-mt-24"
            >
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

        {/* Acceptance Checkbox */}
        <div className="mt-16 p-6 rounded-2xl bg-amber-500/5 border border-amber-500/20">
          <label className="flex items-start gap-4 cursor-pointer group">
            <div
              className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                accepted
                  ? "bg-amber-500 border-amber-500"
                  : "border-slate-600 group-hover:border-amber-500/50"
              }`}
              onClick={() => setAccepted(!accepted)}
            >
              {accepted && <Check size={14} className="text-black" />}
            </div>
            <div>
              <p className="text-white font-medium mb-1">
                I have read and agree to the Terms and Conditions
              </p>
              <p className="text-sm text-slate-400">
                By checking this box, you acknowledge that you have read,
                understood, and agree to be bound by these Terms and Conditions,
                Privacy Policy, and Cookie Policy. This agreement is legally
                binding and enforceable.
              </p>
            </div>
          </label>

          <div className="mt-6 flex flex-wrap gap-4">
            <Link
              href="/sign-up"
              className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${
                accepted
                  ? "bg-amber-500 hover:bg-amber-400 text-black hover:shadow-lg hover:shadow-amber-500/20"
                  : "bg-slate-800 text-slate-500 cursor-not-allowed"
              }`}
              onClick={(e) => !accepted && e.preventDefault()}
            >
              Continue to Sign Up
              <ArrowRight size={18} />
            </Link>
            <Link
              href="/privacy-policy"
              className="inline-flex items-center gap-2 px-6 py-3 border border-white/[0.08] text-slate-400 hover:text-white hover:bg-white/[0.04] rounded-xl transition"
            >
              Read Privacy Policy
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}