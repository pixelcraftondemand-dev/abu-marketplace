"use client";

import Link from "next/link";
import { Mail, Phone, MapPin } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import { useTranslation } from "@/lib/i18n";

const socialLinks = [
  { label: "Instagram", href: "https://instagram.com/abumarketplace" },
  { label: "Twitter", href: "https://twitter.com/abumarketplace" },
  { label: "Facebook", href: "https://facebook.com/abumarketplace" },
  { label: "LinkedIn", href: "https://linkedin.com/company/abumarketplace" },
];

export default function Footer() {
  const { t } = useTranslation();

  const footerSections = [
    {
      title: t("footer.shop"),
      links: [
        { text: t("categories.newArrivals"), href: "/shop?sort=newest" },
        { text: t("categories.bestSellers"), href: "/shop?sort=popular" },
        { text: t("categories.electronics"), href: "/shop?category=electronics" },
      ],
    },
    {
      title: t("footer.support"),
      links: [
        { text: t("footer.helpCenter"), href: "/help" },
        { text: t("footer.contactUs"), href: "/contact" },
        { text: t("footer.returns"), href: "/returns" },
      ],
    },
    {
      title: t("footer.legal"),
      links: [
        { text: t("footer.terms"), href: "/terms-and-conditions" },
        { text: t("footer.privacy"), href: "/privacy-policy" },
        { text: t("footer.sellerAgreement"), href: "/seller-agreement" },
      ],
    },
  ];

  return (
    <footer className="bg-[#1A1A1A] text-white">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-16">
        <div className="grid gap-10 xl:grid-cols-[1.35fr_repeat(3,1fr)]">
          <div>
            <div className="mb-6">
              <BrandLogo
                className="text-white"
                brandClassName="text-white"
                taglineClassName="text-white/40"
                compact
              />
            </div>
            <p className="text-white/40 text-sm leading-relaxed max-w-xs mb-6">
              {t("footer.description")}
            </p>
            <div className="space-y-2 text-sm text-white/40">
              <a href="tel:+23232110054" className="flex items-center gap-2 hover:text-[#C9A96E] transition">
                <Phone size={14} />
                +232 32 110 054
              </a>
              <a href="mailto:abumarketplace.shop@gmail.com" className="flex items-center gap-2 hover:text-[#C9A96E] transition">
                <Mail size={16} />
                abumarketplace.shop@gmail.com
              </a>
              <span className="flex items-center gap-2">
                <MapPin size={14} />
                50 Pratt Street, Freetown
              </span>
            </div>
          </div>

          {footerSections.map((section) => (
            <div key={section.title}>
              <h4 className="text-editorial text-white/70 mb-5 uppercase tracking-[0.2em] text-xs">
                {section.title}
              </h4>
              <ul className="space-y-3 text-sm text-white/40">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="hover:text-[#C9A96E] transition">
                      {link.text}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <p className="text-xs text-white/30">
              {t("footer.rightsReserved", { year: 2026 })}
            </p>
            <div className="flex flex-wrap items-center gap-4 text-xs text-white/40">
              <span>{t("footer.encryptedPayments")}</span>
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="uppercase tracking-wide hover:text-[#C9A96E] transition"
                >
                  {social.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
