
"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { ArrowRight, Mail, Phone, MapPin } from "lucide-react";
import marketplaceLogo from "@/assets/abu-marketplace-logo.png";

const footerLinks = {
  shop: {
    title: "Shop",
    links: [
      { text: "New Arrivals", href: "/shop?sort=newest" },
      { text: "Best Sellers", href: "/shop?sort=popular" },
      { text: "Electronics", href: "/shop?category=electronics" },
      { text: "Fashion", href: "/shop?category=fashion" },
      { text: "Watches", href: "/shop?category=watches" },
      { text: "Home & Living", href: "/shop?category=home" },
    ],
  },
  company: {
    title: "Company",
    links: [
      { text: "About Us", href: "/about" },
      { text: "Our Story", href: "/about#story" },
      { text: "Careers", href: "/careers" },
      { text: "Press", href: "/press" },
      { text: "Sustainability", href: "/sustainability" },
    ],
  },
  support: {
    title: "Support",
    links: [
      { text: "Help Center", href: "/help" },
      { text: "Contact Us", href: "/contact" },
      { text: "Shipping Info", href: "/shipping" },
      { text: "Returns", href: "/returns" },
      { text: "FAQ", href: "/faq" },
    ],
  },
  legal: {
    title: "Legal",
    links: [
      { text: "Terms & Conditions", href: "/terms-and-conditions" },
      { text: "Privacy Policy", href: "/privacy-policy" },
      { text: "Cookie Policy", href: "/cookie-policy" },
      { text: "Seller Agreement", href: "/seller-agreement" },
    ],
  },
};

const socialLinks = [
  { label: "Instagram", href: "https://instagram.com/abumarketplace" },
  { label: "Twitter", href: "https://twitter.com/abumarketplace" },
  { label: "Facebook", href: "https://facebook.com/abumarketplace" },
  { label: "LinkedIn", href: "https://linkedin.com/company/abumarketplace" },
];

export default function Footer() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (email.trim()) {
      setSubscribed(true);
      setEmail("");
      setTimeout(() => setSubscribed(false), 4000);
    }
  };

  return (
    <footer className="bg-[#1A1A1A] text-white">
      {/* Newsletter — Magazine style */}
      <div className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-editorial text-[#C9A96E] mb-3">Newsletter</p>
              <h3 className="font-display text-3xl md:text-4xl font-medium leading-tight">
                Stay in the know
              </h3>
              <p className="text-white/50 mt-3 max-w-md">
                Be the first to discover new arrivals, exclusive offers, and
                stories from our community of artisans.
              </p>
            </div>
            <div>
              <form onSubmit={handleSubscribe} className="flex gap-3">
                <div className="flex-1 relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Your email address"
                    className="w-full px-4 py-4 bg-white/5 border border-white/10 text-white placeholder:text-white/30 outline-none focus:border-[#C9A96E]/50 transition text-sm"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="px-6 py-4 bg-[#C9A96E] hover:bg-[#D4B87A] text-[#1A1A1A] font-medium text-sm tracking-wide uppercase transition flex items-center gap-2 shrink-0"
                >
                  Subscribe
                  <ArrowRight size={16} />
                </button>
              </form>
              {subscribed && (
                <p className="text-[#C9A96E] text-sm mt-3 animate-fade-in">
                  Thank you for subscribing. Check your inbox.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-10">
          {/* Brand Column */}
          <div className="col-span-2">
            <Link href="/" className="inline-flex items-center gap-3 group mb-6">
              <div className="relative w-10 h-10 overflow-hidden">
                <Image
                  src={marketplaceLogo}
                  alt="ABU"
                  fill
                  className="object-cover"
                />
              </div>
              <div>
                <span className="font-display text-xl font-semibold text-white tracking-tight leading-none">
                  ABU
                </span>
                <span className="block text-[8px] tracking-[0.3em] uppercase text-white/40 font-medium -mt-0.5">
                  Marketplace
                </span>
              </div>
            </Link>
            <p className="text-white/40 text-sm leading-relaxed max-w-xs mb-6">
              Curating the world's finest products for discerning individuals
              who value quality, authenticity, and craftsmanship.
            </p>
            <div className="space-y-2 text-sm text-white/40">
              <a href="tel:+23232110054" className="flex items-center gap-2 hover:text-[#C9A96E] transition">
                <Phone size={14} />
                +232 32 110 054
              </a>
              <a href="mailto:hello@abumarketplace.shop" className="flex items-center gap-2 hover:text-[#C9A96E] transition">
                <Mail size={14} />
                hello@abumarketplace.shop
              </a>
              <span className="flex items-center gap-2">
                <MapPin size={14} />
                50 Pratt Street, Freetown
              </span>
            </div>
          </div>

          {/* Link Columns */}
          {Object.values(footerLinks).map((section) => (
            <div key={section.title}>
              <h4 className="text-editorial text-white/70 mb-5">
                {section.title}
              </h4>
              <ul className="space-y-3">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-white/40 hover:text-[#C9A96E] transition"
                    >
                      {link.text}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs text-white/30">
              © 2026 ABU Marketplace. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-white/30 hover:text-[#C9A96E] transition uppercase tracking-wide"
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

