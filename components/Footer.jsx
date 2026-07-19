"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Mail, Phone, MapPin, Facebook, Instagram, Twitter, Linkedin, ArrowRight, Shield, Clock, BadgeCheck, Eye } from "lucide-react";
import marketplaceLogo from "@/assets/abu-marketplace-logo.png";

const footerLinks = {
  products: {
    title: "Products",
    links: [
      { text: "Earphones", href: "/shop?search=earbuds" },
      { text: "Headphones", href: "/shop?search=headphones" },
      { text: "Smart Watches", href: "/shop?search=watch" },
      { text: "Smart Home", href: "/shop?search=smart" },
      { text: "Accessories", href: "/shop?search=accessories" },
    ],
  },
  marketplace: {
    title: "Marketplace",
    links: [
      { text: "Home", href: "/" },
      { text: "Shop", href: "/shop" },
      { text: "Become Plus Member", href: "/pricing" },
      { text: "Create Your Store", href: "/create-store" },
      { text: "Sell on ABU", href: "/store" },
    ],
  },
  support: {
    title: "Support",
    links: [
      { text: "Help Center", href: "/help" },
      { text: "Contact Us", href: "/contact" },
      { text: "Shipping Info", href: "/shipping" },
      { text: "Returns & Refunds", href: "/returns" },
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
  { icon: Facebook, href: "https://www.facebook.com/abumarketplace", label: "Facebook" },
  { icon: Instagram, href: "https://www.instagram.com/abumarketplace", label: "Instagram" },
  { icon: Twitter, href: "https://twitter.com/abumarketplace", label: "Twitter" },
  { icon: Linkedin, href: "https://www.linkedin.com/company/abumarketplace", label: "LinkedIn" },
];

const trustBadges = [
  { icon: Shield, text: "Secure Payments" },
  { icon: Clock, text: "24/7 Support" },
  { icon: BadgeCheck, text: "Authentic Products" },
  { icon: Eye, text: "Verified Sellers" },
];

export default function Footer() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (email.trim()) {
      setSubscribed(true);
      setEmail("");
      setTimeout(() => setSubscribed(false), 3000);
    }
  };

  return (
    <footer className="relative border-t border-white/[0.06] bg-[#0B0F19]">
      {/* Trust Bar */}
      <div className="border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {trustBadges.map((badge, i) => (
              <div
                key={i}
                className="flex items-center gap-3 text-slate-400"
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500">
                  <badge.icon size={18} />
                </div>
                <span className="text-sm font-medium">{badge.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Brand Column */}
          <div className="lg:col-span-4 space-y-6">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="relative w-10 h-10 rounded-xl overflow-hidden ring-2 ring-amber-500/20 group-hover:ring-amber-500/40 transition-all">
                <Image
                  src={marketplaceLogo}
                  alt="ABU Marketplace"
                  fill
                  className="object-cover"
                />
              </div>
              <span className="text-2xl font-bold text-white tracking-tight">
                ABU<span className="text-amber-500">.</span>
              </span>
            </Link>
            <p className="text-slate-400 text-sm leading-relaxed max-w-sm">
              Your ultimate destination for premium gadgets and smart devices. 
              We bring you the best in innovation, all in one secure marketplace.
            </p>

            {/* Newsletter */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-white">Stay Updated</h4>
              <form onSubmit={handleSubscribe} className="flex gap-2">
                <div className="relative flex-1">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full pl-10 pr-4 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-sm text-white placeholder:text-slate-500 outline-none focus:border-amber-500/30 transition"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-black rounded-xl transition-all hover:shadow-lg hover:shadow-amber-500/20"
                >
                  <ArrowRight size={18} />
                </button>
              </form>
              {subscribed && (
                <p className="text-xs text-green-400 animate-fade-in">
                  Thanks for subscribing! Check your inbox.
                </p>
              )}
            </div>

            {/* Social Links */}
            <div className="flex items-center gap-3">
              {socialLinks.map((social, i) => (
                <a
                  key={i}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.06] text-slate-400 hover:text-amber-500 hover:border-amber-500/20 hover:bg-amber-500/5 transition-all"
                >
                  <social.icon size={18} />
                </a>
              ))}
            </div>
          </div>

          {/* Link Columns */}
          <div className="lg:col-span-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {Object.values(footerLinks).map((section) => (
                <div key={section.title}>
                  <h3 className="text-sm font-semibold text-white mb-4 tracking-wide">
                    {section.title}
                  </h3>
                  <ul className="space-y-3">
                    {section.links.map((link) => (
                      <li key={link.href}>
                        <Link
                          href={link.href}
                          className="text-sm text-slate-400 hover:text-amber-400 transition-colors"
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
        </div>
      </div>

      {/* Contact Bar */}
      <div className="border-t border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-slate-500">
            <a href="tel:+23232110054" className="flex items-center gap-2 hover:text-amber-400 transition">
              <Phone size={14} />
              +232 32 110 054
            </a>
            <a href="mailto:abumarketplace.shop@gmail.com" className="flex items-center gap-2 hover:text-amber-400 transition">
              <Mail size={14} />
              abumarketplace.shop@gmail.com
            </a>
            <span className="flex items-center gap-2">
              <MapPin size={14} />
              50 Pratt Street, Freetown
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500">
            <p>© 2026 ABU Marketplace. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <Link href="/terms-and-conditions" className="hover:text-amber-400 transition">
                Terms
              </Link>
              <Link href="/privacy-policy" className="hover:text-amber-400 transition">
                Privacy
              </Link>
              <Link href="/cookie-policy" className="hover:text-amber-400 transition">
                Cookies
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
