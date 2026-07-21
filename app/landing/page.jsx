"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Star,
  Truck,
  Shield,
  Award,
  Play,
} from "lucide-react";
import marketplaceLogo from "@/assets/abu-marketplace-logo.png";

/* ─── Scroll Reveal Hook ─── */
function useScrollReveal(threshold = 0.1) {
  const ref = useRef(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setRevealed(true);
      },
      { threshold }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [threshold]);

  return [ref, revealed];
}

/* ─── Animated Counter ─── */
function AnimatedCounter({ end, suffix = "", duration = 2000 }) {
  const [count, setCount] = useState(0);
  const [ref, revealed] = useScrollReveal(0.5);

  useEffect(() => {
    if (!revealed) return;
    let start = 0;
    const increment = end / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [revealed, end, duration]);

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

/* ─── Product Data ─── */
const featuredProducts = [
  {
    id: 1,
    name: "Heritage Chronograph",
    category: "Watches",
    price: "SLe 2,499",
    rating: 4.9,
    reviews: 128,
    image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&h=750&fit=crop",
    badge: "Editor's Pick",
  },
  {
    id: 2,
    name: "Studio Pro Headphones",
    category: "Audio",
    price: "SLe 849",
    rating: 4.8,
    reviews: 342,
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&h=750&fit=crop",
    badge: null,
  },
  {
    id: 3,
    name: "Artisan Leather Tote",
    category: "Fashion",
    price: "SLe 1,299",
    rating: 4.7,
    reviews: 89,
    image: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&h=750&fit=crop",
    badge: "New",
  },
  {
    id: 4,
    name: "Lumina Mirrorless",
    category: "Photography",
    price: "SLe 5,999",
    rating: 4.9,
    reviews: 56,
    image: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600&h=750&fit=crop",
    badge: null,
  },
  {
    id: 5,
    name: "Sleek Urban Backpack",
    category: "Lifestyle",
    price: "SLe 699",
    rating: 4.8,
    reviews: 210,
    image: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=600&h=750&fit=crop",
    badge: "Best Seller",
  },
  {
    id: 6,
    name: "Asteria Smart Lamp",
    category: "Home",
    price: "SLe 399",
    rating: 4.6,
    reviews: 178,
    image: "https://images.unsplash.com/photo-1493666438817-866a91353ca9?w=600&h=750&fit=crop",
    badge: null,
  },
  {
    id: 7,
    name: "Silk Comfort Sheets",
    category: "Home",
    price: "SLe 1,099",
    rating: 4.9,
    reviews: 94,
    image: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=600&h=750&fit=crop",
    badge: "New",
  },
  {
    id: 8,
    name: "Voyage Leather Wallet",
    category: "Accessories",
    price: "SLe 249",
    rating: 4.7,
    reviews: 134,
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&h=750&fit=crop",
    badge: null,
  },
];

const editorialPicks = [
  {
    title: "The Art of Sound",
    subtitle: "Premium audio equipment curated for audiophiles",
    image: "https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=800&h=1000&fit=crop",
    href: "/shop?category=audio",
  },
  {
    title: "Timeless Elegance",
    subtitle: "Watches that transcend generations",
    image: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=600&h=600&fit=crop",
    href: "/shop?category=watches",
  },
  {
    title: "Modern Living",
    subtitle: "Smart home essentials reimagined",
    image: "https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?w=600&h=600&fit=crop",
    href: "/shop?category=home",
  },
];

const bentoCollections = [
  {
    title: "Performance Shoes",
    subtitle: "Running, training, and street-ready styles for every pace.",
    image: "https://images.unsplash.com/photo-1528701800489-5650f2fbf68f?w=3840&h=2160&fit=crop",
    href: "/shop?category=shoes",
    label: "Shop Shoes",
  },
  {
    title: "DIY Tools",
    subtitle: "High-impact gear for craftsmanship, repairs, and weekend projects.",
    image: "https://images.unsplash.com/photo-1515169067865-5387ec356754?w=3840&h=2160&fit=crop",
    href: "/shop?category=tools",
    label: "Build Better",
  },
  {
    title: "Safety Gear",
    subtitle: "Trusted protection for work, adventure, and everyday safety.",
    image: "https://images.unsplash.com/photo-1511974035430-5de47d3b95da?w=3840&h=2160&fit=crop",
    href: "/shop?category=safety",
    label: "Stay Protected",
  },
  {
    title: "Outdoor Essentials",
    subtitle: "Explorer-ready kits, footwear, and tools for every terrain.",
    image: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=3840&h=2160&fit=crop",
    href: "/shop?category=outdoors",
    label: "Discover More",
  },
];

const testimonials = [
  {
    name: "Amara Johnson",
    role: "Interior Designer",
    text: "ABU Marketplace has completely transformed how I source products for my clients. The curation is impeccable.",
    avatar: "A",
  },
  {
    name: "David Chen",
    role: "Tech Entrepreneur",
    text: "I've never experienced such seamless luxury shopping. Every detail, from packaging to delivery, is world-class.",
    avatar: "D",
  },
  {
    name: "Fatima Sesay",
    role: "Fashion Blogger",
    text: "The selection here is unmatched. I discover something extraordinary every time I browse.",
    avatar: "F",
  },
];

/* ─── Main Page ─── */
export default function LandingPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();

  useEffect(() => {
    if (isLoaded && user) {
      router.push("/");
    }
  }, [user, isLoaded, router]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF8F5]">
        <div className="w-8 h-8 border border-[#E8E2DB] border-t-[#C9A96E] animate-spin" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#FAF8F5]">
      {/* ═══════════════════════════════════════════════
          HERO — Asymmetric Magazine Cover Layout
         ═══════════════════════════════════════════════ */}
      <section className="relative min-h-[92vh] lg:min-h-screen">
        <div className="asymmetric-hero h-full min-h-[92vh] lg:min-h-screen">
          {/* Main Feature — Left (Magazine Cover) */}
          <div className="asymmetric-hero-main relative overflow-hidden">
            <Image
              src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&h=1400&fit=crop"
              alt="Luxury Collection"
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#1A1A1A]/60 via-[#1A1A1A]/20 to-transparent" />
            <div className="absolute inset-0 flex flex-col justify-end p-8 lg:p-16">
              <div className="max-w-xl">
                <p className="text-editorial text-white/70 mb-4">
                  Spring / Summer 2026
                </p>
                <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl xl:text-8xl text-white font-medium leading-[0.95] mb-6">
                  The Art of
                  <br />
                  <span className="italic">Curated</span>
                  <br />
                  Living
                </h1>
                <p className="text-white/80 text-lg max-w-md mb-8 leading-relaxed">
                  Discover extraordinary products from the world's most
                  discerning artisans and creators.
                </p>
                <div className="flex flex-wrap gap-4">
                  <Link
                    href="/shop"
                    className="btn-luxury bg-white text-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white"
                  >
                    <span>Explore Collection</span>
                  </Link>
                  <Link
                    href="/collections"
                    className="inline-flex items-center gap-2 text-white text-sm font-medium tracking-wide uppercase hover:text-[#C9A96E] transition"
                  >
                    <Play size={14} fill="currentColor" />
                    Watch the Film
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column — Stacked Editorial Cards */}
          <div className="hidden lg:flex flex-col">
            {/* Top Right — Category Card */}
            <Link
              href="/shop?category=watches"
              className="relative flex-1 overflow-hidden group magazine-card"
            >
              <Image
                src="https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=800&h=600&fit=crop"
                alt="Watches"
                fill
                className="object-cover"
              />
              <div className="magazine-card-content">
                <p className="text-editorial text-white/70 mb-2">Category</p>
                <h3 className="font-display text-3xl text-white font-medium">
                  Timepieces
                </h3>
                <p className="text-white/60 text-sm mt-2">128 Products</p>
              </div>
            </Link>

            {/* Bottom Right — Offset Card */}
            <Link
              href="/shop?category=audio"
              className="relative flex-1 overflow-hidden group magazine-card asymmetric-hero-offset"
            >
              <Image
                src="https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=800&h=600&fit=crop"
                alt="Audio"
                fill
                className="object-cover"
              />
              <div className="magazine-card-content">
                <p className="text-editorial text-white/70 mb-2">Trending</p>
                <h3 className="font-display text-3xl text-white font-medium">
                  Pure Audio
                </h3>
                <p className="text-white/60 text-sm mt-2">64 Products</p>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          TRUST BAR — Amazon-style efficiency
         ═══════════════════════════════════════════════ */}
      <div className="trust-row">
        <div className="trust-item">
          <Truck size={18} strokeWidth={1.5} />
          <span>Free Shipping Over SLe 500</span>
        </div>
        <div className="trust-item">
          <Shield size={18} strokeWidth={1.5} />
          <span>Authenticity Guaranteed</span>
        </div>
        <div className="trust-item">
          <Award size={18} strokeWidth={1.5} />
          <span>Curated by Experts</span>
        </div>
        <div className="trust-item">
          <Star size={18} strokeWidth={1.5} />
          <span>4.9 Average Rating</span>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════
          FEATURED PRODUCTS — Etsy-style Discovery Grid
         ═══════════════════════════════════════════════ */}
      <section className="section-clean">
        <div className="section-narrow">
          <div className="flex items-end justify-between mb-12">
            <div>
              <p className="text-editorial text-[#C9A96E] mb-3">Curated Selection</p>
              <h2 className="font-display text-4xl md:text-5xl text-[#1A1A1A] font-medium">
                Featured Products
              </h2>
            </div>
            <Link
              href="/shop"
              className="hidden md:inline-flex items-center gap-2 text-sm font-medium text-[#1A1A1A] hover:text-[#C9A96E] transition uppercase tracking-wide"
            >
              View All
              <ArrowRight size={16} />
            </Link>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {featuredProducts.map((product, i) => (
              <Link
                key={product.id}
                href={`/product/${product.id}`}
                className="group product-discovery"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="relative aspect-[3/4] overflow-hidden bg-[#F5F0EB]">
                  <Image
                    src={product.image}
                    alt={product.name}
                    fill
                    className="object-cover product-discovery-img"
                  />
                  {product.badge && (
                    <span className="product-discovery-badge">
                      {product.badge}
                    </span>
                  )}
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-[#1A1A1A]/0 group-hover:bg-[#1A1A1A]/10 transition-all duration-500" />
                </div>
                <div className="p-4">
                  <p className="text-[10px] tracking-[0.15em] uppercase text-[#9B9590] mb-1">
                    {product.category}
                  </p>
                  <h3 className="font-display text-lg text-[#1A1A1A] group-hover:text-[#C9A96E] transition-colors">
                    {product.name}
                  </h3>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm font-semibold text-[#1A1A1A]">
                      {product.price}
                    </span>
                    <div className="flex items-center gap-1">
                      <Star size={12} className="text-[#C9A96E] fill-[#C9A96E]" />
                      <span className="text-xs text-[#6B6560]">
                        {product.rating}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-8 text-center md:hidden">
            <Link
              href="/shop"
              className="btn-luxury-outline inline-flex"
            >
              View All Products
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          EDITORIAL SECTION — Asymmetric Magazine Layout
         ═══════════════════════════════════════════════ */}
      <section className="bg-white">
        <div className="asymmetric-editorial">
          {/* Feature — Large Left */}
          <Link
            href={editorialPicks[0].href}
            className="asymmetric-editorial-feature relative overflow-hidden group magazine-card"
          >
            <Image
              src={editorialPicks[0].image}
              alt={editorialPicks[0].title}
              fill
              className="object-cover"
            />
            <div className="magazine-card-content">
              <p className="text-editorial text-white/70 mb-3">Editorial</p>
              <h3 className="font-display text-4xl md:text-5xl text-white font-medium mb-3">
                {editorialPicks[0].title}
              </h3>
              <p className="text-white/70 text-lg max-w-md mb-6">
                {editorialPicks[0].subtitle}
              </p>
              <span className="inline-flex items-center gap-2 text-white text-sm font-medium tracking-wide uppercase group-hover:text-[#C9A96E] transition">
                Explore Collection
                <ArrowUpRight size={16} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              </span>
            </div>
          </Link>

          {/* Top Right */}
          <Link
            href={editorialPicks[1].href}
            className="relative overflow-hidden group magazine-card"
          >
            <Image
              src={editorialPicks[1].image}
              alt={editorialPicks[1].title}
              fill
              className="object-cover"
            />
            <div className="magazine-card-content">
              <p className="text-editorial text-white/70 mb-2">Collection</p>
              <h3 className="font-display text-2xl text-white font-medium">
                {editorialPicks[1].title}
              </h3>
            </div>
          </Link>

          {/* Bottom Right */}
          <Link
            href={editorialPicks[2].href}
            className="relative overflow-hidden group magazine-card"
          >
            <Image
              src={editorialPicks[2].image}
              alt={editorialPicks[2].title}
              fill
              className="object-cover"
            />
            <div className="magazine-card-content">
              <p className="text-editorial text-white/70 mb-2">Collection</p>
              <h3 className="font-display text-2xl text-white font-medium">
                {editorialPicks[2].title}
              </h3>
            </div>
          </Link>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          BENTO GRID — Premium Category Collections
         ═══════════════════════════════════════════════ */}
      <section className="section-clean bg-[#F7F5F1]">
        <div className="section-narrow">
          <div className="flex items-end justify-between mb-12">
            <div>
              <p className="text-editorial text-[#C9A96E] mb-3">Collections</p>
              <h2 className="font-display text-4xl md:text-5xl text-[#1A1A1A] font-medium">
                Shop Premium Categories
              </h2>
            </div>
            <Link
              href="/shop"
              className="hidden md:inline-flex items-center gap-2 text-sm font-medium text-[#1A1A1A] hover:text-[#C9A96E] transition uppercase tracking-wide"
            >
              Browse All
              <ArrowRight size={16} />
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8">
            {bentoCollections.map((collection, index) => (
              <Link
                key={collection.title}
                href={collection.href}
                className="group relative overflow-hidden rounded-[30px] bg-white shadow-[0_30px_60px_rgba(15,23,42,0.08)] transition-transform duration-500 hover:-translate-y-1"
                style={{ animationDelay: `${index * 80}ms` }}
              >
                <div className="relative aspect-[4/5] overflow-hidden">
                  <Image
                    src={collection.image}
                    alt={collection.title}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#1A1A1A]/70 via-[#1A1A1A]/20 to-transparent" />
                </div>
                <div className="p-6">
                  <p className="text-xs uppercase tracking-[0.3em] text-[#C9A96E] mb-3">
                    Featured
                  </p>
                  <h3 className="font-display text-2xl text-[#1A1A1A] mb-3">
                    {collection.title}
                  </h3>
                  <p className="text-sm leading-6 text-[#6B6560] mb-5">
                    {collection.subtitle}
                  </p>
                  <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#C9A96E] uppercase tracking-[0.2em]">
                    {collection.label}
                    <ArrowRight size={16} />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          STATS — Minimal Editorial Numbers
         ═══════════════════════════════════════════════ */}
      <section className="section-clean bg-[#1A1A1A]">
        <div className="section-narrow">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
            {[
              { value: 12500, suffix: "+", label: "Products" },
              { value: 8500, suffix: "+", label: "Happy Customers" },
              { value: 500, suffix: "+", label: "Artisan Brands" },
              { value: 99, suffix: "%", label: "Satisfaction" },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="font-display text-4xl md:text-5xl text-white font-medium mb-2">
                  <AnimatedCounter end={stat.value} suffix={stat.suffix} />
                </div>
                <p className="text-editorial text-white/50">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          TESTIMONIALS — Editorial Typography
         ═══════════════════════════════════════════════ */}
      <section className="section-clean">
        <div className="section-narrow">
          <div className="text-center mb-16">
            <p className="text-editorial text-[#C9A96E] mb-3">Testimonials</p>
            <h2 className="font-display text-4xl md:text-5xl text-[#1A1A1A] font-medium">
              What Our Community Says
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((t, i) => (
              <div
                key={i}
                className="relative p-8 bg-white border border-[#E8E2DB] hover:border-[#C9A96E]/30 transition-all duration-500"
              >
                <div className="font-display text-6xl text-[#C9A96E]/20 leading-none mb-4">
                  "
                </div>
                <p className="text-[#2D2D2D] leading-relaxed mb-6 text-[15px]">
                  {t.text}
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#1A1A1A] flex items-center justify-center text-white text-sm font-medium">
                    {t.avatar}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#1A1A1A]">{t.name}</p>
                    <p className="text-xs text-[#9B9590]">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          CTA — Split Screen Magazine Layout
         ═══════════════════════════════════════════════ */}
      <section className="relative">
        <div className="asymmetric-split">
          {/* Left — Content */}
          <div className="flex items-center bg-[#FAF8F5] p-8 lg:p-16 xl:p-24">
            <div className="max-w-md">
              <p className="text-editorial text-[#C9A96E] mb-4">Join Us</p>
              <h2 className="font-display text-4xl md:text-5xl lg:text-6xl text-[#1A1A1A] font-medium leading-[1.05] mb-6">
                Start Your
                <br />
                <span className="italic">Curated</span>
                <br />
                Journey
              </h2>
              <p className="text-[#6B6560] leading-relaxed mb-8">
                Create an account today and discover a world of extraordinary
                products, handpicked by our team of expert curators.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link href="/sign-up" className="btn-luxury">
                  <span>Get Started</span>
                </Link>
                <Link
                  href="/shop"
                  className="btn-luxury-outline"
                >
                  Browse Shop
                </Link>
              </div>
            </div>
          </div>

          {/* Right — Image */}
          <div className="relative hidden lg:block overflow-hidden">
            <Image
              src="https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=1000&h=1200&fit=crop"
              alt="Luxury Shopping"
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-l from-transparent to-[#FAF8F5]/20" />
          </div>
        </div>
      </section>
    </main>
  );
}

