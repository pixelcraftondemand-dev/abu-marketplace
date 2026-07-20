"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSelector } from "react-redux";
import { useUser, useClerk } from "@clerk/nextjs";
import Link from "next/link";
import Image from "next/image";
import {
  Search,
  ShoppingBag,
  Heart,
  Menu,
  X,
  User,
  ChevronDown,
  ArrowRight,
} from "lucide-react";
import marketplaceLogo from "@/assets/abu-marketplace-logo.png";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Shop" },
  { href: "/collections", label: "Collections" },
  { href: "/sellers", label: "Sellers" },
  { href: "/about", label: "About" },
];

const shopCategories = [
  { label: "New Arrivals", href: "/shop?sort=newest" },
  { label: "Best Sellers", href: "/shop?sort=popular" },
  { label: "Electronics", href: "/shop?category=electronics" },
  { label: "Fashion", href: "/shop?category=fashion" },
  { label: "Home & Living", href: "/shop?category=home" },
  { label: "Watches", href: "/shop?category=watches" },
  { label: "Accessories", href: "/shop?category=accessories" },
];

export default function Navbar() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const pathname = usePathname();

  const [search, setSearch] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [shopDropdownOpen, setShopDropdownOpen] = useState(false);

  const cartCount = useSelector((state) => state.cart?.total || 0);
  const wishlistCount = useSelector((state) => state.wishlist?.items?.length || 0);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
    setShopDropdownOpen(false);
  }, [pathname]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (search.trim()) {
      router.push(`/shop?search=${encodeURIComponent(search.trim())}`);
      setSearch("");
      setSearchFocused(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
    router.refresh();
  };

  const isActive = (href) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* ─── Top Bar — Trust signals (Amazon-style efficiency) ─── */}
      <div className={`hidden lg:block transition-all duration-500 ${scrolled ? "opacity-0 h-0 overflow-hidden" : "opacity-100"}`}>
        <div className="bg-[#1A1A1A] text-white/80 text-[11px] tracking-widest uppercase">
          <div className="max-w-7xl mx-auto px-8 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <span className="flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-[#C9A96E]" />
                Free Shipping on Orders Over SLe 500
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-[#C9A96E]" />
                Authenticity Guaranteed
              </span>
            </div>
            <div className="flex items-center gap-6">
              <Link href="/help" className="hover:text-[#C9A96E] transition">Help</Link>
              <Link href="/orders" className="hover:text-[#C9A96E] transition">Track Order</Link>
              <span className="text-white/30">|</span>
              <span className="text-[#C9A96E]">SL</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Main Nav — Magazine minimal (Shopify + Etsy blend) ─── */}
      <nav
        className={`sticky top-0 z-50 transition-all duration-500 ${
          scrolled
            ? "bg-white/90 backdrop-blur-xl shadow-[0_1px_0_0_rgba(232,226,219,1)]"
            : "bg-[#FAF8F5]"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-20 lg:h-24">
            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 -ml-2 text-[#1A1A1A] hover:text-[#C9A96E] transition"
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>

            {/* Logo — Magazine style */}
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative w-10 h-10 overflow-hidden">
                <Image
                  src={marketplaceLogo}
                  alt="ABU"
                  fill
                  className="object-cover"
                  priority
                />
              </div>
              <div className="hidden sm:block">
                <span className="font-display text-2xl font-semibold text-[#1A1A1A] tracking-tight leading-none">
                  ABU
                </span>
                <span className="block text-[9px] tracking-[0.3em] uppercase text-[#9B9590] font-medium -mt-0.5">
                  Marketplace
                </span>
              </div>
            </Link>

            {/* Desktop Navigation — Clean editorial */}
            <div className="hidden lg:flex items-center gap-8">
              {navLinks.map((link) => (
                <div key={link.href} className="relative">
                  {link.href === "/shop" ? (
                    <div
                      className="relative"
                      onMouseEnter={() => setShopDropdownOpen(true)}
                      onMouseLeave={() => setShopDropdownOpen(false)}
                    >
                      <button
                        className={`flex items-center gap-1 text-[13px] font-medium tracking-wide uppercase transition-colors pb-1 ${
                          isActive(link.href)
                            ? "text-[#1A1A1A]"
                            : "text-[#6B6560] hover:text-[#1A1A1A]"
                        }`}
                      >
                        {link.label}
                        <ChevronDown size={12} className={`transition-transform ${shopDropdownOpen ? "rotate-180" : ""}`} />
                      </button>
                      {/* Dropdown — Glassmorphism */}
                      <div
                        className={`absolute top-full left-0 pt-4 transition-all duration-300 ${
                          shopDropdownOpen
                            ? "opacity-100 translate-y-0 pointer-events-auto"
                            : "opacity-0 -translate-y-2 pointer-events-none"
                        }`}
                      >
                        <div className="glass-strong rounded-lg shadow-2xl shadow-black/5 p-6 min-w-[280px]">
                          <p className="text-[10px] tracking-[0.2em] uppercase text-[#9B9590] mb-4 font-medium">
                            Browse Categories
                          </p>
                          <div className="space-y-1">
                            {shopCategories.map((cat) => (
                              <Link
                                key={cat.href}
                                href={cat.href}
                                className="flex items-center justify-between py-2 text-sm text-[#2D2D2D] hover:text-[#C9A96E] transition-colors group"
                              >
                                {cat.label}
                                <ArrowRight size={14} className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                              </Link>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <Link
                      href={link.href}
                      className={`text-[13px] font-medium tracking-wide uppercase transition-colors pb-1 border-b-2 ${
                        isActive(link.href)
                          ? "text-[#1A1A1A] border-[#C9A96E]"
                          : "text-[#6B6560] border-transparent hover:text-[#1A1A1A] hover:border-[#E8E2DB]"
                      }`}
                    >
                      {link.label}
                    </Link>
                  )}
                </div>
              ))}
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-1">
              {/* Search Toggle (Mobile) */}
              <button
                onClick={() => setSearchFocused(!searchFocused)}
                className="lg:hidden p-2 text-[#1A1A1A] hover:text-[#C9A96E] transition"
              >
                <Search size={20} />
              </button>

              {/* Desktop Search */}
              <form
                onSubmit={handleSearch}
                className={`hidden lg:flex items-center transition-all duration-300 ${
                  searchFocused
                    ? "w-72 border-[#C9A96E]"
                    : "w-56 border-[#E8E2DB]"
                } border-b bg-transparent`}
              >
                <Search size={16} className="text-[#9B9590] shrink-0" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                  className="w-full py-3 px-3 bg-transparent outline-none text-sm text-[#1A1A1A] placeholder:text-[#9B9590]"
                />
                {search && (
                  <button type="button" onClick={() => setSearch("")} className="text-[#9B9590] hover:text-[#1A1A1A]">
                    <X size={14} />
                  </button>
                )}
              </form>

              {/* Wishlist */}
              <Link
                href="/wishlist"
                className="relative p-3 text-[#1A1A1A] hover:text-[#C9A96E] transition"
              >
                <Heart size={20} strokeWidth={1.5} />
                {wishlistCount > 0 && (
                  <span className="absolute top-1.5 right-1 flex items-center justify-center min-w-[16px] h-[16px] px-1 text-[9px] font-bold text-white bg-[#C9A96E]">
                    {wishlistCount}
                  </span>
                )}
              </Link>

              {/* Cart */}
              <Link
                href="/cart"
                className="relative p-3 text-[#1A1A1A] hover:text-[#C9A96E] transition"
              >
                <ShoppingBag size={20} strokeWidth={1.5} />
                {cartCount > 0 && (
                  <span className="absolute top-1.5 right-1 flex items-center justify-center min-w-[16px] h-[16px] px-1 text-[9px] font-bold text-white bg-[#1A1A1A]">
                    {cartCount}
                  </span>
                )}
              </Link>

              {/* Auth */}
              {isLoaded && (
                <div className="hidden lg:block ml-2">
                  {!user ? (
                    <div className="flex items-center gap-3">
                      <Link
                        href="/sign-in"
                        className="text-[13px] font-medium text-[#6B6560] hover:text-[#1A1A1A] transition uppercase tracking-wide"
                      >
                        Sign In
                      </Link>
                      <Link
                        href="/sign-up"
                        className="btn-gold text-[11px] py-2.5 px-5"
                      >
                        Get Started
                      </Link>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => router.push("/orders")}
                        className="flex items-center gap-2 text-[13px] font-medium text-[#6B6560] hover:text-[#1A1A1A] transition"
                      >
                        {user.imageUrl ? (
                          <Image
                            src={user.imageUrl}
                            alt={user.fullName || ""}
                            width={28}
                            height={28}
                            className="object-cover"
                          />
                        ) : (
                          <User size={18} strokeWidth={1.5} />
                        )}
                        <span className="max-w-[80px] truncate hidden xl:inline">
                          {user.firstName || "Account"}
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Mobile Search Bar */}
          <div
            className={`lg:hidden overflow-hidden transition-all duration-300 ${
              searchFocused ? "max-h-20 pb-4" : "max-h-0"
            }`}
          >
            <form onSubmit={handleSearch} className="flex items-center border-b border-[#E8E2DB]">
              <Search size={16} className="text-[#9B9590]" />
              <input
                type="text"
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full py-3 px-3 bg-transparent outline-none text-sm text-[#1A1A1A] placeholder:text-[#9B9590]"
                autoFocus={searchFocused}
              />
            </form>
          </div>
        </div>
      </nav>

      {/* ─── Mobile Menu — Full screen editorial ─── */}
      <div
        className={`fixed inset-0 z-40 lg:hidden transition-all duration-500 ${
          mobileMenuOpen ? "visible" : "invisible"
        }`}
      >
        <div
          className={`absolute inset-0 bg-[#FAF8F5] transition-opacity duration-500 ${
            mobileMenuOpen ? "opacity-100" : "opacity-0"
          }`}
        >
          <div className="h-full flex flex-col pt-24 px-8 pb-8">
            {/* Mobile Nav Links */}
            <div className="flex-1 space-y-1">
              {navLinks.map((link, i) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`block py-4 font-display text-4xl transition-all ${
                    isActive(link.href)
                      ? "text-[#C9A96E]"
                      : "text-[#1A1A1A] hover:text-[#C9A96E]"
                  }`}
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            {/* Mobile Categories */}
            <div className="border-t border-[#E8E2DB] pt-6 mb-6">
              <p className="text-[10px] tracking-[0.2em] uppercase text-[#9B9590] mb-4">
                Popular Categories
              </p>
              <div className="flex flex-wrap gap-2">
                {shopCategories.slice(0, 5).map((cat) => (
                  <Link
                    key={cat.href}
                    href={cat.href}
                    className="px-4 py-2 bg-white border border-[#E8E2DB] text-sm text-[#2D2D2D] hover:border-[#C9A96E] hover:text-[#C9A96E] transition"
                  >
                    {cat.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Mobile Auth */}
            <div className="space-y-3">
              {isLoaded && !user ? (
                <>
                  <Link
                    href="/sign-up"
                    className="block w-full text-center py-4 bg-[#1A1A1A] text-white text-sm font-medium tracking-wide uppercase"
                  >
                    Get Started
                  </Link>
                  <Link
                    href="/sign-in"
                    className="block w-full text-center py-4 border border-[#1A1A1A] text-[#1A1A1A] text-sm font-medium tracking-wide uppercase"
                  >
                    Sign In
                  </Link>
                </>
              ) : (
                <button
                  onClick={handleSignOut}
                  className="block w-full text-center py-4 border border-[#1A1A1A] text-[#1A1A1A] text-sm font-medium tracking-wide uppercase"
                >
                  Sign Out
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
