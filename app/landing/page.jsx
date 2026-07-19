"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Shield,
  Zap,
  Users,
  Star,
  TrendingUp,
  Package,
  Headphones,
  Watch,
  Smartphone,
  ChevronRight,
  Play,
  Sparkles,
  Award,
  Globe,
  Lock,
} from "lucide-react";
import marketplaceLogo from "@/assets/abu-marketplace-logo.png";

/* ─── Reusable Components ─── */

function AnimatedCounter({ end, suffix = "", duration = 2000 }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true);
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
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
  }, [visible, end, duration]);

  return (
    <span ref={ref}>
      {count.toLocaleString()}
      {suffix}
    </span>
  );
}

function ScrollReveal({ children, className = "", delay = 0 }) {
  const ref = useRef(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setRevealed(true);
      },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${className} ${
        revealed
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-8"
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/* ─── Main Page ─── */

export default function LandingPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const heroRef = useRef(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Redirect authenticated users
  useEffect(() => {
    if (isLoaded && user) {
      router.push("/");
    }
  }, [user, isLoaded, router]);

  // Parallax mouse effect
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (heroRef.current) {
        const rect = heroRef.current.getBoundingClientRect();
        setMousePos({
          x: (e.clientX - rect.left - rect.width / 2) / 50,
          y: (e.clientY - rect.top - rect.height / 2) / 50,
        });
      }
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B0F19]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
          <span className="text-slate-400">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#0B0F19] overflow-hidden">
      {/* ═══════════════════════════════════════
          HERO SECTION — Hero-centric + Parallax
         ═══════════════════════════════════════ */}
      <section
        ref={heroRef}
        className="relative min-h-screen flex items-center justify-center overflow-hidden"
      >
        {/* Animated background */}
        <div className="absolute inset-0">
          <div
            className="absolute inset-0 opacity-40"
            style={{
              background: `radial-gradient(ellipse at ${50 + mousePos.x}% ${40 + mousePos.y}%, rgba(245, 158, 11, 0.12) 0%, transparent 60%)`,
            }}
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(99,102,241,0.06),transparent_50%)]" />
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" />
        </div>

        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-32">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left: Content */}
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm font-medium">
                <Sparkles size={14} />
                Premium Marketplace Experience
              </div>

              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white leading-[1.1] tracking-tight">
                Shop
                <span className="text-gradient"> Smart.</span>
                <br />
                Live{" "}
                <span className="relative">
                  Better.
                  <svg
                    className="absolute -bottom-2 left-0 w-full"
                    viewBox="0 0 200 12"
                    fill="none"
                  >
                    <path
                      d="M2 10C50 2 150 2 198 10"
                      stroke="#F59E0B"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
              </h1>

              <p className="text-lg text-slate-400 max-w-lg leading-relaxed">
                Discover the best deals from trusted sellers in one secure
                marketplace. Buy and sell with confidence, backed by
                industry-leading protection.
              </p>

              <div className="flex flex-wrap gap-4">
                <Link
                  href="/sign-up"
                  className="group inline-flex items-center gap-2 px-8 py-4 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-2xl transition-all hover:shadow-xl hover:shadow-amber-500/20"
                >
                  Get Started
                  <ArrowRight
                    size={18}
                    className="group-hover:translate-x-1 transition-transform"
                  />
                </Link>
                <Link
                  href="/shop"
                  className="inline-flex items-center gap-2 px-8 py-4 border border-white/[0.08] text-white hover:bg-white/[0.04] font-semibold rounded-2xl transition-all"
                >
                  <Play size={18} className="text-amber-500" />
                  Browse Shop
                </Link>
              </div>

              {/* Stats row */}
              <div className="flex items-center gap-8 pt-4">
                {[
                  { value: 12500, suffix: "+", label: "Products" },
                  { value: 8500, suffix: "+", label: "Customers" },
                  { value: 99, suffix: "%", label: "Satisfaction" },
                ].map((stat, i) => (
                  <div key={i}>
                    <div className="text-2xl font-bold text-white">
                      <AnimatedCounter end={stat.value} suffix={stat.suffix} />
                    </div>
                    <div className="text-sm text-slate-500">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Visual */}
            <div className="relative hidden lg:block">
              <div
                className="relative"
                style={{
                  transform: `perspective(1000px) rotateY(${mousePos.x * 0.5}deg) rotateX(${-mousePos.y * 0.5}deg)`,
                  transition: "transform 0.1s ease-out",
                }}
              >
                {/* Glow */}
                <div className="absolute -inset-4 bg-amber-500/10 rounded-3xl blur-2xl" />

                {/* Main card */}
                <div className="relative rounded-3xl overflow-hidden border border-white/[0.08] bg-[#111827]/80 backdrop-blur-sm">
                  <Image
                    src={marketplaceLogo}
                    alt="ABU Marketplace"
                    width={600}
                    height={500}
                    className="w-full h-auto object-cover"
                    priority
                  />

                  {/* Floating badge */}
                  <div className="absolute top-6 right-6 flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/20 border border-green-500/30 text-green-400 text-sm font-medium backdrop-blur-sm">
                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    Live Now
                  </div>

                  {/* Bottom info bar */}
                  <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#0B0F19] to-transparent">
                    <div className="flex items-center gap-4">
                      <div className="flex -space-x-2">
                        {[1, 2, 3, 4].map((i) => (
                          <div
                            key={i}
                            className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 border-2 border-[#0B0F19] flex items-center justify-center text-xs font-bold text-black"
                          >
                            {String.fromCharCode(64 + i)}
                          </div>
                        ))}
                      </div>
                      <p className="text-sm text-slate-300">
                        <span className="text-white font-semibold">2,400+</span>{" "}
                        shoppers joined this week
                      </p>
                    </div>
                  </div>
                </div>

                {/* Floating cards */}
                <div className="absolute -left-8 top-1/4 p-4 rounded-2xl bg-[#111827]/90 border border-white/[0.06] backdrop-blur-sm animate-float">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                      <Package size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">Fast Delivery</p>
                      <p className="text-xs text-slate-500">2-3 days avg</p>
                    </div>
                  </div>
                </div>

                <div
                  className="absolute -right-4 bottom-1/4 p-4 rounded-2xl bg-[#111827]/90 border border-white/[0.06] backdrop-blur-sm animate-float"
                  style={{ animationDelay: "1s" }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-400">
                      <Shield size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">Secure Pay</p>
                      <p className="text-xs text-slate-500">256-bit SSL</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          BENTO GRID — Featured Categories
         ═══════════════════════════════════════ */}
      <section className="relative py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <ScrollReveal>
            <div className="text-center mb-16">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm font-medium mb-6">
                <TrendingUp size={14} />
                Trending Categories
              </span>
              <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4">
                Explore by Category
              </h2>
              <p className="text-slate-400 max-w-2xl mx-auto">
                Curated collections of premium products, handpicked for quality
                and innovation.
              </p>
            </div>
          </ScrollReveal>

          <div className="bento-grid">
            {/* Large featured — Smart Watches */}
            <ScrollReveal delay={0} className="bento-large">
              <Link
                href="/shop?search=watch"
                className="group relative block h-full rounded-3xl overflow-hidden border border-white/[0.06] bg-gradient-to-br from-[#111827] to-[#0a0f1a]"
              >
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&h=800&fit=crop')] bg-cover bg-center opacity-40 group-hover:opacity-50 group-hover:scale-105 transition-all duration-700" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F19] via-[#0B0F19]/50 to-transparent" />
                <div className="relative h-full flex flex-col justify-end p-8">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 mb-4">
                    <Watch size={24} />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">
                    Smart Watches
                  </h3>
                  <p className="text-slate-400 text-sm mb-4">
                    Premium timepieces with cutting-edge technology
                  </p>
                  <div className="flex items-center gap-2 text-amber-400 text-sm font-medium">
                    Explore
                    <ChevronRight
                      size={16}
                      className="group-hover:translate-x-1 transition-transform"
                    />
                  </div>
                </div>
              </Link>
            </ScrollReveal>

            {/* Medium — Headphones */}
            <ScrollReveal delay={100} className="bento-medium">
              <Link
                href="/shop?search=headphones"
                className="group relative block h-full rounded-3xl overflow-hidden border border-white/[0.06] bg-gradient-to-br from-[#111827] to-[#0a0f1a]"
              >
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&h=400&fit=crop')] bg-cover bg-center opacity-30 group-hover:opacity-40 group-hover:scale-105 transition-all duration-700" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F19] via-transparent to-transparent" />
                <div className="relative h-full flex flex-col justify-end p-6">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-3">
                    <Headphones size={20} />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-1">
                    Headphones
                  </h3>
                  <p className="text-slate-400 text-sm">
                    Immersive audio experience
                  </p>
                </div>
              </Link>
            </ScrollReveal>

            {/* Small stat card */}
            <ScrollReveal delay={200} className="bento-small">
              <div className="h-full rounded-3xl glass flex flex-col items-center justify-center text-center p-6">
                <div className="text-4xl font-bold text-amber-500 mb-1">
                  <AnimatedCounter end={500} suffix="+" />
                </div>
                <div className="text-sm text-slate-400">Brands</div>
              </div>
            </ScrollReveal>

            {/* Small — Smartphones */}
            <ScrollReveal delay={150} className="bento-small">
              <Link
                href="/shop?search=phone"
                className="group relative block h-full rounded-3xl overflow-hidden border border-white/[0.06] bg-gradient-to-br from-[#111827] to-[#0a0f1a]"
              >
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&h=400&fit=crop')] bg-cover bg-center opacity-30 group-hover:opacity-40 group-hover:scale-105 transition-all duration-700" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F19] to-transparent" />
                <div className="relative h-full flex flex-col justify-end p-5">
                  <Smartphone size={18} className="text-blue-400 mb-2" />
                  <h3 className="text-lg font-bold text-white">Phones</h3>
                </div>
              </Link>
            </ScrollReveal>

            {/* Medium — Accessories */}
            <ScrollReveal delay={200} className="bento-medium">
              <Link
                href="/shop?search=accessories"
                className="group relative block h-full rounded-3xl overflow-hidden border border-white/[0.06] bg-gradient-to-br from-[#111827] to-[#0a0f1a]"
              >
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800&h=400&fit=crop')] bg-cover bg-center opacity-30 group-hover:opacity-40 group-hover:scale-105 transition-all duration-700" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F19] via-transparent to-transparent" />
                <div className="relative h-full flex flex-col justify-end p-6">
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-medium mb-3 w-fit">
                    <Zap size={12} />
                    New Arrivals
                  </span>
                  <h3 className="text-xl font-bold text-white mb-1">
                    Accessories
                  </h3>
                  <p className="text-slate-400 text-sm">
                    Essential gadgets & gear
                  </p>
                </div>
              </Link>
            </ScrollReveal>

            {/* Small — Earbuds */}
            <ScrollReveal delay={250} className="bento-small">
              <Link
                href="/shop?search=earbuds"
                className="group relative block h-full rounded-3xl overflow-hidden border border-white/[0.06] bg-gradient-to-br from-[#111827] to-[#0a0f1a]"
              >
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400&h=400&fit=crop')] bg-cover bg-center opacity-30 group-hover:opacity-40 group-hover:scale-105 transition-all duration-700" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F19] to-transparent" />
                <div className="relative h-full flex flex-col justify-end p-5">
                  <Headphones size={18} className="text-pink-400 mb-2" />
                  <h3 className="text-lg font-bold text-white">Earbuds</h3>
                </div>
              </Link>
            </ScrollReveal>

            {/* Small stat card */}
            <ScrollReveal delay={300} className="bento-small">
              <div className="h-full rounded-3xl glass flex flex-col items-center justify-center text-center p-6">
                <div className="text-4xl font-bold text-amber-500 mb-1">
                  <AnimatedCounter end={4.9} suffix="" />
                </div>
                <div className="text-sm text-slate-400">Avg Rating</div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          FEATURES — Z-Pattern + Glassmorphism
         ═══════════════════════════════════════ */}
      <section className="relative py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <ScrollReveal>
            <div className="text-center mb-20">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm font-medium mb-6">
                <Award size={14} />
                Why Choose Us
              </span>
              <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4">
                Built for Trust
              </h2>
              <p className="text-slate-400 max-w-2xl mx-auto">
                Every feature designed with your security and satisfaction in mind.
              </p>
            </div>
          </ScrollReveal>

          <div className="space-y-24">
            {/* Feature 1 — Z-Pattern Left */}
            <div className="z-pattern">
              <ScrollReveal className="z-content">
                <div className="relative rounded-3xl overflow-hidden border border-white/[0.06]">
                  <div className="aspect-[4/3] bg-gradient-to-br from-amber-500/5 to-purple-500/5 flex items-center justify-center">
                    <div className="w-32 h-32 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                      <Shield size={64} className="text-amber-500" />
                    </div>
                  </div>
                </div>
              </ScrollReveal>
              <ScrollReveal delay={150} className="z-content">
                <div className="space-y-6">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                    <Lock size={28} />
                  </div>
                  <h3 className="text-3xl font-bold text-white">
                    Secure Shopping
                  </h3>
                  <p className="text-slate-400 text-lg leading-relaxed">
                    Your transactions are protected with 256-bit SSL encryption,
                    PCI-DSS compliant payment processing, and multi-factor
                    authentication. Every purchase is backed by our buyer
                    protection guarantee.
                  </p>
                  <ul className="space-y-3">
                    {[
                      "End-to-end encryption",
                      "Fraud detection AI",
                      "Secure payment tokens",
                    ].map((item, i) => (
                      <li
                        key={i}
                        className="flex items-center gap-3 text-slate-300"
                      >
                        <div className="w-5 h-5 rounded-full bg-green-500/10 flex items-center justify-center">
                          <div className="w-2 h-2 rounded-full bg-green-400" />
                        </div>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </ScrollReveal>
            </div>

            {/* Feature 2 — Z-Pattern Right (reversed) */}
            <div className="z-pattern">
              <ScrollReveal delay={150} className="z-content">
                <div className="space-y-6">
                  <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                    <Zap size={28} />
                  </div>
                  <h3 className="text-3xl font-bold text-white">
                    Lightning Fast Deals
                  </h3>
                  <p className="text-slate-400 text-lg leading-relaxed">
                    Access flash deals and exclusive offers from verified sellers
                    in real-time. Our smart notification system ensures you never
                    miss a deal on products you love.
                  </p>
                  <div className="flex gap-4">
                    <div className="px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                      <div className="text-2xl font-bold text-white">&lt;2s</div>
                      <div className="text-xs text-slate-500">Load Time</div>
                    </div>
                    <div className="px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                      <div className="text-2xl font-bold text-white">99.9%</div>
                      <div className="text-xs text-slate-500">Uptime</div>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
              <ScrollReveal className="z-content">
                <div className="relative rounded-3xl overflow-hidden border border-white/[0.06]">
                  <div className="aspect-[4/3] bg-gradient-to-br from-purple-500/5 to-blue-500/5 flex items-center justify-center">
                    <div className="w-32 h-32 rounded-3xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                      <Zap size={64} className="text-purple-400" />
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            </div>

            {/* Feature 3 — Z-Pattern Left */}
            <div className="z-pattern">
              <ScrollReveal className="z-content">
                <div className="relative rounded-3xl overflow-hidden border border-white/[0.06]">
                  <div className="aspect-[4/3] bg-gradient-to-br from-green-500/5 to-teal-500/5 flex items-center justify-center">
                    <div className="w-32 h-32 rounded-3xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                      <Users size={64} className="text-green-400" />
                    </div>
                  </div>
                </div>
              </ScrollReveal>
              <ScrollReveal delay={150} className="z-content">
                <div className="space-y-6">
                  <div className="w-14 h-14 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-400">
                    <Globe size={28} />
                  </div>
                  <h3 className="text-3xl font-bold text-white">
                    Trusted Community
                  </h3>
                  <p className="text-slate-400 text-lg leading-relaxed">
                    Join thousands of satisfied buyers and sellers in our
                    verified marketplace community. Every seller is vetted,
                    every review is authentic, every transaction is protected.
                  </p>
                  <div className="flex items-center gap-4">
                    <div className="flex -space-x-3">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div
                          key={i}
                          className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 border-2 border-[#0B0F19] flex items-center justify-center text-xs font-bold text-black"
                        >
                          {String.fromCharCode(64 + i)}
                        </div>
                      ))}
                    </div>
                    <p className="text-sm text-slate-400">
                      <span className="text-white font-semibold">8,500+</span>{" "}
                      active members
                    </p>
                  </div>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          TESTIMONIALS — Carousel/Slider Layout
         ═══════════════════════════════════════ */}
      <section className="relative py-24 border-y border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <ScrollReveal>
            <div className="text-center mb-16">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm font-medium mb-6">
                <Star size={14} />
                Loved by Thousands
              </span>
              <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4">
                What Our Users Say
              </h2>
            </div>
          </ScrollReveal>

          <div className="carousel-snap">
            {[
              {
                name: "Sarah Johnson",
                role: "Verified Buyer",
                text: "The most secure marketplace I've ever used. Fast shipping and authentic products every time.",
                rating: 5,
              },
              {
                name: "Michael Chen",
                role: "Store Owner",
                text: "As a seller, ABU Marketplace has transformed my business. The dashboard is intuitive and sales are booming.",
                rating: 5,
              },
              {
                name: "Amina Diallo",
                role: "Premium Member",
                text: "The Plus membership pays for itself. Exclusive deals and priority support are game changers.",
                rating: 5,
              },
              {
                name: "James Wilson",
                role: "Verified Buyer",
                text: "Customer support is incredible. Had an issue with an order and it was resolved within hours.",
                rating: 5,
              },
              {
                name: "Fatima Sesay",
                role: "Store Owner",
                text: "Love the analytics dashboard. It helps me understand my customers and optimize my listings.",
                rating: 5,
              },
            ].map((review, i) => (
              <ScrollReveal
                key={i}
                delay={i * 100}
                className="carousel-item w-[320px] sm:w-[380px]"
              >
                <div className="h-full p-6 rounded-3xl bg-[#111827]/60 border border-white/[0.06] backdrop-blur-sm hover:border-white/[0.1] transition-all">
                  <div className="flex gap-1 mb-4">
                    {Array(5)
                      .fill(null)
                      .map((_, idx) => (
                        <Star
                          key={idx}
                          size={16}
                          className={
                            idx < review.rating
                              ? "text-amber-500 fill-amber-500"
                              : "text-slate-600"
                          }
                        />
                      ))}
                  </div>
                  <p className="text-slate-300 mb-6 leading-relaxed">
                    "{review.text}"
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-sm font-bold text-black">
                      {review.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {review.name}
                      </p>
                      <p className="text-xs text-slate-500">{review.role}</p>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          CTA — Full-bleed + Split-screen hybrid
         ═══════════════════════════════════════ */}
      <section className="relative py-32 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-purple-500/5" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <ScrollReveal>
              <div className="space-y-8">
                <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight">
                  Ready to Start{" "}
                  <span className="text-gradient">Shopping?</span>
                </h2>
                <p className="text-lg text-slate-400 max-w-lg leading-relaxed">
                  Create your account now and join thousands of smart shoppers
                  who trust ABU Marketplace for their premium gadget needs.
                </p>
                <div className="flex flex-wrap gap-4">
                  <Link
                    href="/sign-up"
                    className="group inline-flex items-center gap-2 px-8 py-4 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-2xl transition-all hover:shadow-xl hover:shadow-amber-500/20"
                  >
                    Sign Up Free
                    <ArrowRight
                      size={18}
                      className="group-hover:translate-x-1 transition-transform"
                    />
                  </Link>
                  <Link
                    href="/shop"
                    className="inline-flex items-center gap-2 px-8 py-4 border border-white/[0.08] text-white hover:bg-white/[0.04] font-semibold rounded-2xl transition-all"
                  >
                    Browse Shop
                  </Link>
                </div>

                {/* Trust mini-bar */}
                <div className="flex flex-wrap items-center gap-6 pt-4">
                  {[
                    { icon: Shield, text: "Secure" },
                    { icon: Lock, text: "Encrypted" },
                    { icon: Award, text: "Verified" },
                  ].map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 text-sm text-slate-500"
                    >
                      <item.icon size={14} className="text-amber-500" />
                      {item.text}
                    </div>
                  ))}
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={200}>
              <div className="relative">
                <div className="absolute -inset-4 bg-amber-500/5 rounded-3xl blur-2xl" />
                <div className="relative grid grid-cols-2 gap-4">
                  {[
                    { label: "Products", value: "12,500+", icon: Package },
                    { label: "Happy Customers", value: "8,500+", icon: Users },
                    { label: "Avg Rating", value: "4.9/5", icon: Star },
                    { label: "Countries", value: "15+", icon: Globe },
                  ].map((stat, i) => (
                    <div
                      key={i}
                      className="p-6 rounded-2xl bg-[#111827]/80 border border-white/[0.06] backdrop-blur-sm hover:border-amber-500/20 transition-all"
                    >
                      <stat.icon
                        size={24}
                        className="text-amber-500 mb-3"
                      />
                      <div className="text-2xl font-bold text-white mb-1">
                        {stat.value}
                      </div>
                      <div className="text-sm text-slate-500">
                        {stat.label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>
    </main>
  );
}