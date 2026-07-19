"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSelector } from "react-redux";
import { useUser, useClerk } from "@clerk/nextjs";
import Link from "next/link";
import Image from "next/image";
import {
  Search,
  ShoppingCart,
  Heart,
  LogOut,
  Menu,
  X,
  PackageIcon,
  User,
  ChevronDown,
  Sparkles,
} from "lucide-react";
import marketplaceLogo from "@/assets/abu-marketplace-logo.png";

const navLinks = [
  { href: "/", label: "Home", icon: null },
  { href: "/shop", label: "Shop", icon: null },
  { href: "/about", label: "About", icon: null },
  { href: "/contact", label: "Contact", icon: null },
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

  const cartCount = useSelector((state) => state.cart?.total || 0);
  const wishlistCount = useSelector((state) => state.wishlist?.items?.length || 0);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (search.trim()) {
      router.push(`/shop?search=${encodeURIComponent(search.trim())}`);
      setSearch("");
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
    router.refresh();
  };

  const isActive = (href) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-[#0B0F19]/90 backdrop-blur-xl border-b border-white/[0.06] shadow-lg shadow-black/20"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16 lg:h-18">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="relative w-9 h-9 rounded-xl overflow-hidden ring-2 ring-amber-500/20 group-hover:ring-amber-500/40 transition-all">
                <Image
                  src={marketplaceLogo}
                  alt="ABU Marketplace"
                  fill
                  className="object-cover"
                  priority
                />
              </div>
              <span className="text-xl font-bold text-white tracking-tight">
                ABU<span className="text-amber-500">.</span>
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                    isActive(link.href)
                      ? "text-amber-400 bg-amber-500/10"
                      : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
                  }`}
                >
                  {link.label}
                  {isActive(link.href) && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-amber-500" />
                  )}
                </Link>
              ))}
            </div>

            {/* Search Bar - Desktop */}
            <form
              onSubmit={handleSearch}
              className={`hidden xl:flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-300 ${
                searchFocused
                  ? "bg-white/[0.08] border border-amber-500/30 w-80"
                  : "bg-white/[0.03] border border-white/[0.06] w-64"
              }`}
            >
              <Search size={16} className="text-slate-500 shrink-0" />
              <input
                type="text"
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                className="w-full bg-transparent outline-none text-sm text-white placeholder:text-slate-500"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="text-slate-500 hover:text-white transition"
                >
                  <X size={14} />
                </button>
              )}
            </form>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {/* Wishlist */}
              <Link
                href="/wishlist"
                className="relative hidden sm:flex items-center justify-center w-10 h-10 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.06] transition-all"
                aria-label="Wishlist"
              >
                <Heart size={18} />
                {wishlistCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-black bg-amber-500 rounded-full">
                    {wishlistCount > 99 ? "99+" : wishlistCount}
                  </span>
                )}
              </Link>

              {/* Cart */}
              <Link
                href="/cart"
                className="relative hidden sm:flex items-center justify-center w-10 h-10 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.06] transition-all"
                aria-label="Cart"
              >
                <ShoppingCart size={18} />
                {cartCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-slate-700 rounded-full">
                    {cartCount > 99 ? "99+" : cartCount}
                  </span>
                )}
              </Link>

              {/* User / Auth */}
              {isLoaded && (
                <>
                  {!user ? (
                    <div className="hidden sm:flex items-center gap-2">
                      <Link
                        href="/sign-in"
                        className="px-5 py-2 text-sm font-medium text-slate-300 hover:text-white transition"
                      >
                        Sign In
                      </Link>
                      <Link
                        href="/sign-up"
                        className="px-5 py-2 text-sm font-medium text-black bg-amber-500 hover:bg-amber-400 rounded-xl transition-all hover:shadow-lg hover:shadow-amber-500/20"
                      >
                        Get Started
                      </Link>
                    </div>
                  ) : (
                    <div className="hidden sm:flex items-center gap-2">
                      <button
                        onClick={() => router.push("/orders")}
                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-300 hover:text-white hover:bg-white/[0.06] rounded-xl transition"
                      >
                        {user.imageUrl ? (
                          <Image
                            src={user.imageUrl}
                            alt={user.fullName || "User"}
                            width={28}
                            height={28}
                            className="rounded-full ring-2 ring-white/[0.08]"
                          />
                        ) : (
                          <User size={18} />
                        )}
                        <span className="max-w-[100px] truncate">
                          {user.firstName || "Account"}
                        </span>
                      </button>
                      <button
                        onClick={handleSignOut}
                        className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition"
                        title="Sign out"
                      >
                        <LogOut size={18} />
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* Mobile Menu Toggle */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden flex items-center justify-center w-10 h-10 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.06] transition"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      <div
        className={`fixed inset-0 z-40 lg:hidden transition-all duration-300 ${
          mobileMenuOpen ? "visible" : "invisible"
        }`}
      >
        {/* Backdrop */}
        <div
          className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity ${
            mobileMenuOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setMobileMenuOpen(false)}
        />

        {/* Panel */}
        <div
          className={`absolute top-16 right-0 w-full max-w-sm bg-[#0B0F19] border-l border-white/[0.06] h-[calc(100vh-4rem)] overflow-y-auto transition-transform duration-300 ${
            mobileMenuOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="p-6 space-y-6">
            {/* Mobile Search */}
            <form onSubmit={handleSearch} className="flex items-center gap-2 px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl">
              <Search size={16} className="text-slate-500 shrink-0" />
              <input
                type="text"
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-transparent outline-none text-sm text-white placeholder:text-slate-500"
              />
            </form>

            {/* Mobile Nav Links */}
            <div className="space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    isActive(link.href)
                      ? "text-amber-400 bg-amber-500/10"
                      : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
                  }`}
                >
                  {link.label}
                  {isActive(link.href) && <Sparkles size={14} className="ml-auto text-amber-500" />}
                </Link>
              ))}
            </div>

            <div className="border-t border-white/[0.06] pt-6 space-y-3">
              <Link
                href="/wishlist"
                className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white hover:bg-white/[0.04] rounded-xl transition"
              >
                <Heart size={18} />
                Wishlist
                {wishlistCount > 0 && (
                  <span className="ml-auto text-xs font-bold text-amber-500">{wishlistCount}</span>
                )}
              </Link>
              <Link
                href="/cart"
                className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white hover:bg-white/[0.04] rounded-xl transition"
              >
                <ShoppingCart size={18} />
                Cart
                {cartCount > 0 && (
                  <span className="ml-auto text-xs font-bold text-slate-300">{cartCount}</span>
                )}
              </Link>
            </div>

            {/* Mobile Auth */}
            <div className="border-t border-white/[0.06] pt-6">
              {isLoaded && !user ? (
                <div className="space-y-3">
                  <Link
                    href="/sign-in"
                    className="block w-full text-center px-5 py-3 text-sm font-medium text-slate-300 border border-white/[0.06] rounded-xl hover:bg-white/[0.04] transition"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/sign-up"
                    className="block w-full text-center px-5 py-3 text-sm font-medium text-black bg-amber-500 hover:bg-amber-400 rounded-xl transition"
                  >
                    Get Started
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  <button
                    onClick={() => router.push("/orders")}
                    className="flex items-center gap-3 w-full px-4 py-3 text-slate-300 hover:text-white hover:bg-white/[0.04] rounded-xl transition"
                  >
                    <PackageIcon size={18} />
                    My Orders
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="flex items-center gap-3 w-full px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-xl transition"
                  >
                    <LogOut size={18} />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}