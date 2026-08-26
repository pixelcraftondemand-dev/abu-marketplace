"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { useUser, useClerk } from "@clerk/nextjs";
import Link from "next/link";
import Image from "next/image";
import axios from "axios";
import {
  Search,
  ShoppingBag,
  Heart,
  Menu,
  X,
  User,
  ChevronDown,
  MapPin,
  HelpCircle,
  Zap,
} from "lucide-react";
import { setLanguage, setCurrency } from '@/lib/features/preferencesSlice'
import BrandLogo from "@/components/BrandLogo";
import CurrencyAmount from "@/components/CurrencyAmount";
import useWalletBalance from "@/lib/hooks/useWalletBalance";
import { useTranslation } from "@/lib/i18n";
import { getStoreLinkTarget } from "@/lib/storeNavigation";
import { FREE_DELIVERY_THRESHOLD } from "@/lib/paymentOptions";
import { supportedCountries, currencyOptions } from '@/lib/utils/currency'
import { languageToLocale, buildLocalizedPath, stripLocaleFromPath } from '@/lib/utils/locale'
import { openSignInModal } from '@/lib/features/signInModalSlice'

const searchCategories = [
  { label: "All", value: "" },
  { label: "Electronics", value: "electronics" },
  { label: "Fashion", value: "fashion" },
  { label: "Home", value: "home" },
  { label: "Watches", value: "watches" },
  { label: "Audio", value: "audio" },
];

const megaMenuGroups = [
  {
    title: "Featured",
    items: [
      { label: "New Arrivals", href: "/shop?sort=newest" },
      { label: "Best Sellers", href: "/shop?sort=popular" },
      { label: "Flash Deals ⚡", href: "/shop?deals=flash" },
    ],
  },
  {
    title: "Categories",
    items: [
      { label: "Electronics", href: "/shop?category=electronics" },
      { label: "Fashion", href: "/shop?category=fashion" },
      { label: "Beauty", href: "/shop?category=beauty" },
      { label: "Home & Living", href: "/shop?category=home" },
      { label: "Accessories", href: "/shop?category=accessories" },
      { label: "Gaming", href: "/shop?category=gaming" },
    ],
  },
  {
    title: "Services",
    items: [
      { label: "Browse Services", href: "/services" },
      { label: "Open a Store", href: "/create-store" },
    ],
  },
];

const popularSearches = [
  "Smart watch",
  "Wireless headphones",
  "Home theater",
  "African fashion",
];

export default function Navbar() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [megaMenuOpen, setMegaMenuOpen] = useState(false);
  const [searchSuggestionsOpen, setSearchSuggestionsOpen] = useState(false);
  const [searchCategory, setSearchCategory] = useState("");
  const [storeHref, setStoreHref] = useState("/sign-in");
  const [storeLabelKey, setStoreLabelKey] = useState("nav.signIn");

  const dispatch = useDispatch();
  const { t } = useTranslation();

  const handleOpenSignIn = (e) => {
    e.preventDefault();
    dispatch(openSignInModal());
  };

  useEffect(() => {
    const resolveStoreHref = async () => {
      if (!isLoaded) return;
      if (!user) {
        setStoreHref("/sign-in");
        setStoreLabelKey("nav.signIn");
        return;
      }
      try {
        const { data } = await axios.get("/api/store/is-seller");
        setStoreHref(
          getStoreLinkTarget({
            isSignedIn: true,
            isSeller: Boolean(data.isSeller),
            storeUsername: data.storeInfo?.username || null,
          })
        );
        setStoreLabelKey(data.isSeller ? "nav.myStore" : "nav.openStore");
      } catch (error) {
        setStoreHref("/create-store");
        setStoreLabelKey("nav.openStore");
      }
    };
    resolveStoreHref();
  }, [isLoaded, user]);

  const selectedLanguage = useSelector((state) => state.preferences.selectedLanguage);
  const selectedCurrency = useSelector((state) => state.preferences.selectedCurrency);
  const cartCount = useSelector((state) => state.cart?.total || 0);
  const wishlistCount = useSelector((state) => state.wishlist?.items?.length || 0);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
    setMegaMenuOpen(false);
  }, [pathname]);



  const filteredSearchSuggestions = search
    ? popularSearches.filter((item) => item.toLowerCase().includes(search.toLowerCase()))
    : popularSearches;

  const handleSearch = (e) => {
    e.preventDefault();
    if (search.trim()) {
      const params = new URLSearchParams({ search: search.trim() });
      if (searchCategory) params.set("category", searchCategory);
      router.push(`/shop?${params.toString()}`);
      setSearch("");
      setSearchFocused(false);
      setSearchSuggestionsOpen(false);
    }
  };

  const handleSuggestionClick = (value) => {
    const params = new URLSearchParams({ search: value });
    if (searchCategory) params.set("category", searchCategory);
    router.push(`/shop?${params.toString()}`);
    setSearch("");
    setSearchFocused(false);
    setSearchSuggestionsOpen(false);
  };

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
    router.refresh();
  };

  const handleLanguageChange = (language) => {
    const locale = languageToLocale[language] || "en";
    dispatch(setLanguage(language));
    const rawPath = stripLocaleFromPath(pathname);
    const nextPath = buildLocalizedPath(rawPath, locale);
    const query = searchParams.toString();
    router.push(`${nextPath}${query ? `?${query}` : ''}`);
  };

  const handleCurrencyChange = (currency) => {
    dispatch(setCurrency(currency));
  };

  const isActive = (href) => {
    const [path] = href.split("?");
    const current = stripLocaleFromPath(pathname);
    if (path === "/") return current === "/";
    return current === path || current.startsWith(`${path}/`);
  };

  return (
    <>
      {/* ─── Utility Bar — Dark, hides on scroll ─── */}
      <div className={`hidden lg:block transition-all duration-500 ease-out ${scrolled ? "opacity-0 h-0 overflow-hidden" : "opacity-100"}`}>
        <div className="bg-gray-900 text-white/70 text-[11px]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-1.5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 hover:text-white transition-colors duration-200 cursor-default">
                <MapPin size={11} className="text-blue-400" />
                <span>Deliver to Freetown</span>
              </span>
              <span className="text-white/20">|</span>
              <span className="flex items-center gap-1.5 cursor-default">
                <Zap size={10} className="text-amber-400" />
                {t("nav.freeDelivery")} <CurrencyAmount amount={FREE_DELIVERY_THRESHOLD} />
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 cursor-default">
                {supportedCountries[0].country}
              </span>
              <span className="text-white/20">|</span>
              <select
                value={selectedLanguage}
                onChange={(event) => handleLanguageChange(event.target.value)}
                className="bg-transparent text-white/70 text-[11px] outline-none cursor-pointer hover:text-white transition-colors duration-200"
              >
                {Array.from(new Set(supportedCountries.flatMap(c => c.languages))).sort().map((language) => (
                  <option key={language} value={language} className="text-gray-900">{language}</option>
                ))}
              </select>
              <select
                value={selectedCurrency}
                onChange={(event) => handleCurrencyChange(event.target.value)}
                className="bg-transparent text-white/70 text-[11px] outline-none cursor-pointer hover:text-white transition-colors duration-200"
              >
                {currencyOptions.map((currency) => (
                  <option key={currency.code} value={currency.code} className="text-gray-900">{currency.code}</option>
                ))}
              </select>
              <span className="flex items-center gap-1 text-white/40 hover:text-white/70 transition-colors duration-200 cursor-default">
                <HelpCircle size={11} />
                Help
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Main Nav — Glassmorphism on scroll ─── */}
      <nav
        className={`sticky top-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-white/80 backdrop-blur-xl shadow-[0_1px_3px_rgba(0,0,0,0.08)] border-b border-gray-100"
            : "bg-white"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 h-14 lg:h-16">
            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 -ml-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors duration-200"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>

            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
              <BrandLogo compact showText={false} noLink />
              <span className="hidden sm:block text-lg font-bold text-gray-900 tracking-tight group-hover:text-[var(--color-primary)] transition-colors duration-200">ABU</span>
            </Link>

            {/* Desktop Search — Dominant, center-weighted */}
            <div className="hidden lg:flex flex-1 max-w-2xl mx-auto">
              <form onSubmit={handleSearch} className="flex w-full">
                {/* Category dropdown */}
                <div className="relative">
                  <select
                    value={searchCategory}
                    onChange={(e) => setSearchCategory(e.target.value)}
                    className="h-full px-3 bg-gray-50 border border-r-0 border-gray-200 rounded-l-xl text-xs text-gray-500 outline-none cursor-pointer appearance-none pr-7 hover:bg-gray-100 transition-colors duration-200"
                  >
                    {searchCategories.map((cat) => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                  <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>

                {/* Search input */}
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder={t("nav.searchPlaceholder")}
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setSearchSuggestionsOpen(true);
                    }}
                    onFocus={() => {
                      setSearchFocused(true);
                      setSearchSuggestionsOpen(true);
                    }}
                    onBlur={() => setTimeout(() => setSearchSuggestionsOpen(false), 200)}
                    className={`w-full h-full px-4 bg-white border text-sm text-gray-800 outline-none transition-all duration-200 ${
                      searchFocused
                        ? "border-blue-300 ring-2 ring-blue-500/10"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  />

                  {/* Search suggestions */}
                  {searchSuggestionsOpen && (
                    <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-gray-100 shadow-xl shadow-black/5 rounded-xl z-20 overflow-hidden animate-[scale-in_0.15s_ease-out]">
                      <div className="p-1.5">
                        {filteredSearchSuggestions.length > 0 ? (
                          filteredSearchSuggestions.map((item) => (
                            <button
                              key={item}
                              type="button"
                              onMouseDown={() => handleSuggestionClick(item)}
                              className="w-full text-left px-3 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-lg transition-colors duration-150 flex items-center gap-2"
                            >
                              <Search size={13} className="text-gray-300" />
                              {item}
                            </button>
                          ))
                        ) : (
                          <div className="px-3 py-3 text-sm text-gray-400">
                            {t("nav.noSuggestions")}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Search button */}
                <button
                  type="submit"
                  className="px-5 bg-[var(--color-primary)] text-white rounded-r-xl hover:bg-[var(--color-primary-hover)] transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/20"
                  aria-label="Search"
                >
                  <Search size={18} />
                </button>
              </form>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-0.5 ml-auto">
              {/* Mobile Search */}
              <button
                onClick={() => setSearchFocused(!searchFocused)}
                className="lg:hidden p-2.5 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                aria-label="Search"
              >
                <Search size={20} />
              </button>

              {/* Wishlist */}
              <Link href="/wishlist" className="relative p-2.5 text-gray-700 hover:text-[var(--color-primary)] hover:bg-blue-50 rounded-lg transition-all duration-200">
                <Heart size={20} strokeWidth={1.5} />
                {wishlistCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[9px] font-bold text-white bg-red-500 rounded-full shadow-sm shadow-red-500/30 animate-[scale-in_0.2s_ease-out]">
                    {wishlistCount}
                  </span>
                )}
              </Link>

              {/* Cart */}
              <Link href="/cart" className="relative p-2.5 text-gray-700 hover:text-[var(--color-primary)] hover:bg-blue-50 rounded-lg transition-all duration-200">
                <ShoppingBag size={20} strokeWidth={1.5} />
                {cartCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[9px] font-bold text-white bg-[var(--color-primary)] rounded-full shadow-sm shadow-blue-500/30 animate-[scale-in_0.2s_ease-out]">
                    {cartCount}
                  </span>
                )}
              </Link>

              {/* Auth */}
              {isLoaded && (
                <div className="hidden lg:block ml-1.5">
                  {!user ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={handleOpenSignIn}
                        className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors duration-200 px-3 py-2 hover:bg-gray-50 rounded-lg"
                      >
                        {t("nav.signIn")}
                      </button>
                      <Link
                        href="/sign-up"
                        className="bg-[var(--color-primary)] text-white text-[11px] font-semibold py-2 px-4 rounded-lg hover:bg-[var(--color-primary-hover)] transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/20"
                      >
                        {t("nav.signUp")}
                      </Link>
                    </div>
                  ) : (
                    <button
                      onClick={() => router.push("/account")}
                      className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors duration-200 px-2 py-1.5 hover:bg-gray-50 rounded-lg"
                    >
                      {user.imageUrl ? (
                        <Image src={user.imageUrl} alt="" width={28} height={28} className="rounded-full object-cover ring-2 ring-gray-100" />
                      ) : (
                        <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                          <User size={14} className="text-white" />
                        </div>
                      )}
                      <span className="max-w-[80px] truncate hidden xl:inline">
                        {user.firstName || t("nav.account")}
                      </span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Mobile Search Bar */}
          <div className={`lg:hidden overflow-hidden transition-all duration-300 ease-out ${searchFocused ? "max-h-[200px] pb-3 opacity-100" : "max-h-0 opacity-0"}`}>
            <form onSubmit={handleSearch} className="flex items-center border border-gray-200 rounded-xl overflow-hidden shadow-sm focus-within:ring-2 focus-within:ring-blue-500/10 focus-within:border-blue-300 transition-all duration-200">
              <Search size={16} className="text-gray-400 ml-3.5" />
              <input
                type="text"
                placeholder={t("nav.searchPlaceholderMobile")}
                value={search}
                onChange={(e) => { setSearch(e.target.value); setSearchSuggestionsOpen(true); }}
                className="w-full py-2.5 px-3 bg-transparent outline-none text-sm text-gray-800"
                autoFocus={searchFocused}
              />
              <button type="submit" className="px-4 bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] transition-colors duration-200">
                <Search size={16} />
              </button>
            </form>
            {searchSuggestionsOpen && (
              <div className="mt-2 bg-white border border-gray-100 rounded-xl p-1.5 shadow-lg shadow-black/5">
                {filteredSearchSuggestions.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onMouseDown={() => handleSuggestionClick(item)}
                    className="w-full text-left px-3 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-lg transition-colors duration-150"
                  >
                    {item}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ─── Category Navigation Bar ─── */}
        <div className="hidden lg:block border-t border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-6 h-11">
              {/* All categories with mega-menu */}
              <div
                className="relative"
                onMouseEnter={() => setMegaMenuOpen(true)}
                onMouseLeave={() => setMegaMenuOpen(false)}
              >
                <button className="flex items-center gap-2 text-sm font-semibold text-gray-800 hover:text-[var(--color-primary)] transition-colors duration-200 py-2">
                  <Menu size={14} />
                  All Categories
                  <ChevronDown size={12} className={`transition-transform duration-200 ${megaMenuOpen ? "rotate-180" : ""}`} />
                </button>

                {/* Mega Menu */}
                <div
                  className={`absolute top-full left-0 pt-2 transition-all duration-200 ease-out ${
                    megaMenuOpen
                      ? "opacity-100 translate-y-0 pointer-events-auto"
                      : "opacity-0 -translate-y-1 pointer-events-none"
                  }`}
                >
                  <div className="bg-white border border-gray-100 shadow-2xl shadow-black/8 rounded-2xl p-6 min-w-[520px]">
                    <div className="grid grid-cols-3 gap-8">
                      {megaMenuGroups.map((group) => (
                        <div key={group.title}>
                          <p className="text-[10px] uppercase tracking-[0.15em] text-gray-400 mb-3 font-semibold">
                            {group.title}
                          </p>
                          <div className="space-y-0.5">
                            {group.items.map((item) => (
                              <Link
                                key={item.href}
                                href={item.href}
                                className="block px-2.5 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-lg transition-colors duration-150"
                              >
                                {item.label}
                              </Link>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick category links */}
              <div className="flex items-center gap-5 overflow-x-auto no-scrollbar">
                {[
                  { label: "New Arrivals", href: "/shop?sort=newest" },
                  { label: "Best Sellers", href: "/shop?sort=popular" },
                  { label: "Flash Deals", href: "/shop?deals=flash", accent: true },
                  { label: "Electronics", href: "/shop?category=electronics" },
                  { label: "Fashion", href: "/shop?category=fashion" },
                  { label: "Halal Certified", href: "/shop?category=halal-certified" },
                ].map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`text-xs font-medium whitespace-nowrap transition-colors duration-200 ${
                      isActive(link.href)
                        ? "text-[var(--color-primary)]"
                        : link.accent
                          ? "text-amber-600 hover:text-amber-700"
                          : "text-gray-500 hover:text-gray-900"
                    }`}
                  >
                    {link.accent && <Zap size={10} className="inline mr-0.5 -mt-0.5" />}
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* ─── Mobile Menu — Slide-out drawer ─── */}
      <div
        className={`fixed inset-0 z-[60] lg:hidden transition-all duration-300 ${
          mobileMenuOpen ? "visible" : "invisible"
        }`}
      >
        {/* Backdrop */}
        <div
          className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${mobileMenuOpen ? "opacity-100" : "opacity-0"}`}
          onClick={() => setMobileMenuOpen(false)}
        />

        {/* Drawer */}
        <div className={`absolute left-0 top-0 h-full w-[300px] bg-white shadow-2xl transition-transform duration-300 ease-out ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"}`}>
          <div className="p-5">
            {/* Header */}              <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <BrandLogo compact showText={false} noLink />
                <span className="text-lg font-bold text-gray-900">ABU</span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-200"
              >
                <X size={20} />
              </button>
            </div>

            {/* Search in mobile menu */}
            <form onSubmit={handleSearch} className="flex items-center border border-gray-200 rounded-xl overflow-hidden mb-5 focus-within:ring-2 focus-within:ring-blue-500/10 focus-within:border-blue-300 transition-all duration-200">
              <Search size={16} className="text-gray-400 ml-3.5" />
              <input
                type="text"
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full py-2.5 px-3 bg-transparent outline-none text-sm text-gray-800"
              />
            </form>

            {/* Links */}
            <div className="space-y-0.5">
              {[
                { label: "Home", href: "/" },
                { label: "Shop All", href: "/shop" },
                { label: "Flash Deals ⚡", href: "/shop?deals=flash" },
                { label: "Services", href: "/services" },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block py-2.5 px-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                    isActive(link.href)
                      ? "bg-blue-50 text-[var(--color-primary)]"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            {/* Divider */}
            <div className="border-t border-gray-100 my-4" />

            {/* Quick links */}
            <div className="space-y-0.5">
              {[
                { label: "Wishlist", href: "/wishlist" },
                { label: "Cart", href: "/cart" },
                { label: "My Account", href: "/account" },
                { label: "Orders", href: "/orders" },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between py-2.5 px-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                    isActive(link.href)
                      ? "bg-blue-50 text-[var(--color-primary)]"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {link.label}
                  {(link.href === '/cart' && cartCount > 0) && (
                    <span className="text-[10px] font-bold text-white bg-[var(--color-primary)] px-1.5 py-0.5 rounded-full">{cartCount}</span>
                  )}
                  {(link.href === '/wishlist' && wishlistCount > 0) && (
                    <span className="text-[10px] font-bold text-white bg-red-500 px-1.5 py-0.5 rounded-full">{wishlistCount}</span>
                  )}
                </Link>
              ))}
            </div>

            {/* Categories */}
            <div className="mt-4">
              <p className="text-[10px] uppercase tracking-[0.15em] text-gray-400 mb-2 px-3 font-semibold">Categories</p>
              <div className="space-y-0.5">
                {searchCategories.filter(c => c.value).map((cat) => (
                  <Link
                    key={cat.value}
                    href={`/shop?category=${cat.value}`}
                    onClick={() => setMobileMenuOpen(false)}
                    className="block py-2 px-3 text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-800 rounded-lg transition-colors duration-200"
                  >
                    {cat.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Auth buttons */}
            <div className="mt-6 space-y-2.5">
              {isLoaded && !user ? (
                <>
                  <Link
                    href="/sign-up"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block w-full text-center py-3 bg-[var(--color-primary)] text-white text-sm font-semibold rounded-xl hover:bg-[var(--color-primary-hover)] transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/20"
                  >
                    {t("nav.signUp")}
                  </Link>
                  <button
                    onClick={(e) => { setMobileMenuOpen(false); handleOpenSignIn(e); }}
                    className="block w-full text-center py-3 border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-all duration-200"
                  >
                    {t("nav.signIn")}
                  </button>
                </>
              ) : isLoaded && user ? (
                <button
                  onClick={() => { setMobileMenuOpen(false); handleSignOut(); }}
                  className="block w-full text-center py-3 border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition-all duration-200"
                >
                  {t("nav.signOut")}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
