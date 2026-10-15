export interface LegalDocument {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  effectiveDate: string;
  version: string;
  category: 'consumer' | 'merchant' | 'privacy' | 'security';
  sections: {
    heading: string;
    content: string;
    bullets?: string[];
  }[];
}

export const LEGAL_DOCS: LegalDocument[] = [
  {
    id: 'terms-of-service',
    slug: 'terms',
    title: 'Terms of Service & Marketplace Agreement',
    shortDescription: 'Operating guidelines for buyers, merchants, and blue-collar artisans on ABU Marketplace in Sierra Leone.',
    effectiveDate: 'October 1, 2026',
    version: '2.4.0',
    category: 'consumer',
    sections: [
      {
        heading: '1. Acceptance of Terms & Eligibility',
        content: 'By accessing or using ABU Marketplace (the "Platform"), you agree to be bound by these Terms of Service. Users must be at least 18 years of age or possess legal parental/guardian consent under the laws of Sierra Leone. Access from any provincial territory (Western Area, Southern Province, Northern Province, Eastern Province) constitutes full agreement.'
      },
      {
        heading: '2. Marketplace Business Model & Merchant Independence',
        content: 'ABU Marketplace operates as a managed multi-vendor and blue-collar artisan connection marketplace. Independent merchants and certified service technicians list goods and services directly. ABU Marketplace verifies merchant credentials, inspects hub fulfillment, and provides provincial logistics coordination.',
        bullets: [
          'Merchants warrant that all listed goods are genuine, non-counterfeit, and in stock.',
          'Artisans (electricians, solar specialists, plumbers) warrant that they possess relevant certifications and adhere to technical safety standards.',
          'ABU Marketplace reserves the right to suspend or delist non-compliant shops or fraudulent products immediately.'
        ]
      },
      {
        heading: '3. Payment Terms — Pay on Delivery Policy',
        content: 'IMPORTANT: Pay on Delivery (Cash on Delivery) is the primary checkout and payment settlement method upon initial launch. Buyers inspect delivered items upon physical arrival before paying the authorized courier.',
        bullets: [
          'No mobile money transfers (Orange Money / Afrimoney) are required or processed during initial physical dispatch.',
          'All displayed product prices are in Sierra Leone New Leones (SLE) inclusive of standard provincial logistics charges shown at checkout.',
          'Invoices and physical receipts are delivered alongside physical consignments.'
        ]
      },
      {
        heading: '4. Returns, Replacements & Buyer Inspection Guarantee',
        content: 'Every order delivered via ABU Provincial Logistics is covered by our 7-Day Buyer Inspection Guarantee.',
        bullets: [
          'Customers are entitled to inspect the goods physically in the presence of the delivery courier.',
          'If an item is damaged, defective, or does not match its listing specifications, the buyer may refuse acceptance without fee.',
          'Approved returns within 7 calendar days receive a direct replacement from merchant stock or an immediate cash/voucher refund.'
        ]
      },
      {
        heading: '5. Limitation of Liability & Dispute Resolution',
        content: 'ABU Marketplace is governed by and construed in accordance with the Laws of the Republic of Sierra Leone. Any dispute arising under these Terms shall first be submitted to informal mediation via the ABU Freetown Customer Support Desk (Siaka Stevens Street, Freetown) before escalation to the High Court of Sierra Leone.'
      }
    ]
  },
  {
    id: 'privacy-policy',
    slug: 'privacy',
    title: 'Privacy Policy & Data Protection Statement',
    shortDescription: 'How ABU Marketplace collects, utilizes, safeguards, and isolates user personal data and order records.',
    effectiveDate: 'October 1, 2026',
    version: '2.1.0',
    category: 'privacy',
    sections: [
      {
        heading: '1. Information We Collect',
        content: 'We adhere to strict data minimization principles. We collect only the information necessary to fulfill orders, authenticate accounts, and arrange courier dispatch:',
        bullets: [
          'Account Details: Full name, verified mobile phone number (Orange or Africell), role (buyer, merchant, artisan, admin).',
          'Delivery Information: Delivery district (Western Area, Bo, Makeni, Kenema, Kono), street address, and nearby landmarks.',
          'Technical Logs: Session tokens, device browser user-agents, and cryptographically verified login OTP records.'
        ]
      },
      {
        heading: '2. Zero Selling of Personal Data',
        content: 'We do not sell, rent, monetize, or trade customer personal data to third parties. Customer contact details are shared only with the assigned provincial courier exclusively for dispatching the ordered merchandise.'
      },
      {
        heading: '3. Data Security & Buyer Privacy Protection',
        content: 'All database transactions and customer orders are safeguarded using enterprise encryption and strict tenant isolation controls. Merchants cannot view other merchants\' sales records or private customer addresses.',
        bullets: [
          'Buyer records are strictly private: only the purchasing customer and assigned courier can access order shipment details.',
          'Merchant records are isolated: vendors only access their own storefront catalog and orders.',
          'Administrator access requires multi-factor authentication with strict audit accountability.'
        ]
      },
      {
        heading: '4. User Data Rights & Erasure',
        content: 'Under national privacy regulations and international data standards, users have the right to inspect, export, or delete their profile and order history by contacting our Data Protection Officer at privacy@abu-marketplace.sl.'
      }
    ]
  },
  {
    id: 'merchant-terms',
    slug: 'merchant-terms',
    title: 'Merchant & Artisan Seller Agreement',
    shortDescription: 'Rules and standards for operating a verified shop, listing products, and providing trade services.',
    effectiveDate: 'October 1, 2026',
    version: '1.8.0',
    category: 'merchant',
    sections: [
      {
        heading: '1. Merchant Onboarding & Verification',
        content: 'To open a shop on ABU Marketplace, merchants must provide business registration details, a valid Sierra Leone phone number, physical shop address, and bank/payout credentials. All sellers undergo manual physical or digital verification before receiving the "Verified Merchant" badge.'
      },
      {
        heading: '2. Product Listing Standards & Warranty',
        content: 'Merchants agree to list only authentic, factory-inspected merchandise. Selling counterfeit, refurbished-as-new, or prohibited hazardous goods results in permanent suspension.',
        bullets: [
          'Solar & Electronics: Must include manufacturer specifications, voltage, and a minimum 6-month replacement warranty.',
          'Pricing: Prices must be published in Sierra Leone Leones (SLE) and represent genuine market value.',
          'Stock Accuracy: Merchants must promptly update stock counts to avoid canceled customer dispatches.'
        ]
      },
      {
        heading: '3. Order Fulfillment & Provincial Dispatch',
        content: 'When an order is received, merchants must package and stage items at the designated ABU Logistics Hub (Freetown CBD, Bo Clocktower, or Makeni Depot) within 12 business hours. Fulfillment failure rates exceeding 5% trigger merchant review.'
      },
      {
        heading: '4. Artisan Service Callout Standards',
        content: 'Blue-collar service providers (solar technicians, electricians, refrigeration mechanics) must arrive punctually for booked diagnostic appointments, provide itemized estimates, and honor their 30-day workmanship guarantee.'
      }
    ]
  }
];
