"use client";

import Link from "next/link";
import { Mail, Phone, MapPin, Shield, Lock, ArrowUpRight } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import { useTranslation } from "@/lib/i18n";

const socialLinks = [
  { label: "Instagram", href: "https://instagram.com/abumarketplace", icon: "📷" },
  { label: "Twitter", href: "https://twitter.com/abumarketplace", icon: "𝕏" },
  { label: "Facebook", href: "https://facebook.com/abumarketplace", icon: "f" },
  { label: "LinkedIn", href: "https://linkedin.com/company/abumarketplace", icon: "in" },
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
        { text: t("categories.fashion"), href: "/shop?category=fashion" },
        { text: t("categories.halalCertified"), href: "/shop?category=halal-certified" },
      ],
    },
    {
      title: t("footer.account"),
      links: [
        { text: t("nav.myAccount"), href: "/account" },
        { text: t("nav.orders"), href: "/orders" },
        { text: t("nav.wishlist"), href: "/wishlist" },
        { text: t("nav.wallet"), href: "/wallet" },
      ],
    },
    {
      title: t("footer.support"),
      links: [
        { text: t("footer.helpCenter"), href: "/help" },
        { text: t("footer.contactUs"), href: "/contact" },
        { text: t("footer.returns"), href: "/returns" },
        { text: t("footer.shipping"), href: "/shipping" },
      ],
    },
    {
      title: t("footer.company"),
      links: [
        { text: t("footer.about"), href: "/about" },
        { text: t("footer.terms"), href: "/terms-and-conditions" },
        { text: t("footer.privacy"), href: "/privacy-policy" },
        { text: t("footer.sellerAgreement"), href: "/seller-agreement" },
      ],
    },
  ];

  return (
    <footer className="bg-gray-900 text-white">
      {/* Main footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-10">
        <div className="grid gap-10 xl:grid-cols-[1.4fr_repeat(4,1fr)]">
          {/* Brand column */}
          <div>
            <div className="mb-5">
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

            {/* Contact info */}
            <div className="space-y-3 text-sm text-white/40">
              <a href="tel:+23232110054" className="flex items-center gap-2.5 hover:text-white transition-colors duration-200 group">
                <span className="w-8 h-8 rounded-lg bg-white/5 group-hover:bg-white/10 flex items-center justify-center transition-colors duration-200">
                  <Phone size={14} className="text-blue-400" />
                </span>
                +232 32 110 054
              </a>
              <a href="mailto:abumarketplace.shop@gmail.com" className="flex items-center gap-2.5 hover:text-white transition-colors duration-200 group">
                <span className="w-8 h-8 rounded-lg bg-white/5 group-hover:bg-white/10 flex items-center justify-center transition-colors duration-200">
                  <Mail size={14} className="text-blue-400" />
                </span>
                abumarketplace.shop@gmail.com
              </a>
              <span className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                  <MapPin size={14} className="text-blue-400" />
                </span>
                50 Pratt Street, Freetown
              </span>
            </div>

            {/* Payment methods */}
            <div className="mt-8">
              <p className="text-[10px] uppercase tracking-[0.15em] text-white/30 mb-3 font-semibold">
                {t("footer.paymentMethods")}
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  { emoji: "💳", label: "Visa / MC" },
                  { emoji: "📱", label: "Orange Money" },
                  { emoji: "📱", label: "Afrimoney" },
                  { emoji: "🔒", label: "SSL Secure" },
                ].map((method) => (
                  <span key={method.label} className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 border border-white/5 px-3 py-2 text-[10px] font-medium text-white/60 hover:bg-white/10 hover:border-white/10 transition-all duration-200 cursor-default">
                    <span>{method.emoji}</span>
                    {method.label}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Link columns */}
          {footerSections.map((section) => (
            <div key={section.title}>
              <h4 className="text-[10px] uppercase tracking-[0.15em] text-white/40 mb-5 font-semibold">
                {section.title}
              </h4>
              <ul className="space-y-3 text-sm">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-white/40 hover:text-white transition-colors duration-200 flex items-center gap-1 group">
                      {link.text}
                      <ArrowUpRight size={11} className="opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <p className="text-xs text-white/25">
              © {new Date().getFullYear()} ABU Marketplace. {t("footer.rightsReserved", { year: 2026 })}
            </p>

            <div className="flex flex-wrap items-center gap-5">
              {/* Trust badges */}
              <div className="flex items-center gap-4 text-[10px] text-white/30">
                <span className="flex items-center gap-1">
                  <Shield size={11} className="text-green-500/60" />
                  Secure
                </span>
                <span className="flex items-center gap-1">
                  <Lock size={11} className="text-blue-400/60" />
                  Encrypted
                </span>
              </div>

              {/* Social links */}
              <div className="flex items-center gap-1">
                {socialLinks.map((social) => (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 text-[10px] font-bold text-white/40 hover:bg-white/10 hover:text-white transition-all duration-200"
                    aria-label={social.label}
                  >
                    {social.icon}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
