"use client";

import { useState, useEffect, useRef } from "react";
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
  ArrowRight,
  Wallet,
} from "lucide-react";
import { setCountry, setLanguage, setCurrency, setPreferences } from '@/lib/features/preferencesSlice'
import BrandLogo from "@/components/BrandLogo";
import CurrencyAmount from "@/components/CurrencyAmount";
import useWalletBalance from "@/lib/hooks/useWalletBalance";
import { useTranslation } from "@/lib/i18n";
import { getStoreLinkTarget } from "@/lib/storeNavigation";
import { africanCountries, westAfricanCurrencyOptions } from '@/lib/utils/currency'
import { languageToLocale, buildLocalizedPath, stripLocaleFromPath } from '@/lib/utils/locale'

const navLinkDefs = [
  { href: "/", labelKey: "nav.home" },
  { href: "/shop", labelKey: "nav.shop" },
  { href: "/collections", labelKey: "nav.collections" },
  { href: "/store", labelKey: "nav.store" },
  { href: "/about", labelKey: "nav.about" },
];

const shopCategoryDefs = [
  { labelKey: "categories.newArrivals", href: "/shop?sort=newest" },
  { labelKey: "categories.bestSellers", href: "/shop?sort=popular" },
  { labelKey: "categories.electronics", href: "/shop?category=electronics" },
  { labelKey: "categories.fashion", href: "/shop?category=fashion" },
  { labelKey: "categories.home", href: "/shop?category=home" },
  { labelKey: "categories.watches", href: "/shop?category=watches" },
  { labelKey: "categories.accessories", href: "/shop?category=accessories" },
];

const popularSearches = [
  "Smart watch",
  "Wireless headphones",
  "Home theater",
  "Modern table lamp",
  "Apple wireless earbuds",
  "African fashion",
  "Halal certified",
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
  const [shopDropdownOpen, setShopDropdownOpen] = useState(false);
  const [searchSuggestionsOpen, setSearchSuggestionsOpen] = useState(false);
  const [storeHref, setStoreHref] = useState("/sign-in");
  const [now, setNow] = useState(() => Date.now());

  const dispatch = useDispatch();
  const { t } = useTranslation();
  useEffect(() => {
    const resolveStoreHref = async () => {
      if (!isLoaded) return;

      if (!user) {
        setStoreHref("/sign-in");
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
      } catch (error) {
        setStoreHref("/create-store");
      }
    };

    resolveStoreHref();
  }, [isLoaded, user]);

  const navLinks = navLinkDefs.map(({ href, labelKey }) => ({
    href: href === "/store" ? storeHref : href,
    label: t(labelKey),
  }));
  const shopCategories = shopCategoryDefs.map(({ href, labelKey }) => ({ href, label: t(labelKey) }));
  const shopMenuGroups = [
    {
      title: t("nav.featured"),
      items: [
        { label: t("categories.newArrivals"), href: "/shop?sort=newest" },
        { label: t("categories.bestSellers"), href: "/shop?sort=popular" },
        { label: t("categories.flashDeals"), href: "/shop?deals=flash" },
      ],
    },
    {
      title: t("nav.popularCategories"),
      items: [
        { label: t("categories.beauty"), href: "/shop?category=beauty" },
        { label: t("categories.electronics"), href: "/shop?category=electronics" },
        { label: t("categories.fashion"), href: "/shop?category=fashion" },
        { label: t("categories.accessories"), href: "/shop?category=accessories" },
        { label: t("categories.home"), href: "/shop?category=home" },
      ],
    },
  ];
  const selectedCountry = useSelector((state) => state.preferences.selectedCountry);
  const selectedLanguage = useSelector((state) => state.preferences.selectedLanguage);
  const selectedCurrency = useSelector((state) => state.preferences.selectedCurrency);
  const currencyStatus = useSelector((state) => state.currency);
  const cartCount = useSelector((state) => state.cart?.total || 0);
  const wishlistCount = useSelector((state) => state.wishlist?.items?.length || 0);
  const { balance: walletBalance, loading: walletLoading } = useWalletBalance();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Keep the exchange-rate "hours ago" badge fresh without calling Date.now()
  // during render (keeps the component pure).
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
    setShopDropdownOpen(false);
  }, [pathname]);

  const previousCountry = useRef(selectedCountry);

  useEffect(() => {
    // Apply a country's default language/currency only when the user actually
    // picks a new country — never on mount (persisted preferences win) and
    // never when the user manually changes language/currency.
    if (previousCountry.current === selectedCountry) return;
    previousCountry.current = selectedCountry;

    const countryData = africanCountries.find((entry) => entry.country === selectedCountry);
    if (!countryData) {
      dispatch(setPreferences({
        country: "Sierra Leone",
        language: "English",
        currency: "SLL",
      }))
      return;
    }

    if (!countryData.languages.includes(selectedLanguage)) {
      dispatch(setLanguage(countryData.languages[0]));
    }

    if (countryData.currency && selectedCurrency !== countryData.currency) {
      dispatch(setCurrency(countryData.currency));
    }
  }, [selectedCountry, selectedLanguage, selectedCurrency, dispatch]);

  const allLanguages = Array.from(new Set(africanCountries.flatMap(c => c.languages))).sort()
  const filteredSearchSuggestions = search
    ? popularSearches.filter((item) => item.toLowerCase().includes(search.toLowerCase()))
    : popularSearches;

  const handleSearch = (e) => {
    e.preventDefault();
    if (search.trim()) {
      router.push(`/shop?search=${encodeURIComponent(search.trim())}`);
      setSearch("");
      setSearchFocused(false);
      setSearchSuggestionsOpen(false);
    }
  };

  const handleSuggestionClick = (value) => {
    router.push(`/shop?search=${encodeURIComponent(value)}`);
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

  const handleNavLinkClick = () => {
    setMobileMenuOpen(false);
    setSearchFocused(false);
    setSearchSuggestionsOpen(false);
  };

  return (
    <>
      {/* ─── Top Bar — Trust signals (Amazon-style efficiency) ─── */}
      <div className={`hidden lg:block transition-all duration-500 ${scrolled ? "opacity-0 h-0 overflow-hidden" : "opacity-100"}`}>
        <div className="bg-[#111111] text-white/80 text-[11px] tracking-[0.3em] uppercase">
          <div className="max-w-7xl mx-auto px-8 py-2.5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-6 min-w-0">
              <span className="flex min-w-0 items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-[#C9A96E]" />
                <span className="truncate">{t("nav.freeDelivery")} <CurrencyAmount amount={500} /></span>
              </span>
              <span className="flex min-w-0 items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-[#C9A96E]" />
                <span className="truncate">{t("nav.authenticityGuaranteed")}</span>
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 justify-end">
              <label className="flex min-w-[120px] max-w-[200px] items-center gap-2 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-white/85">
                <span className="text-white/60">{t("nav.country")}</span>
                <select
                  value={selectedCountry}
                  onChange={(event) => dispatch(setCountry(event.target.value))}
                  className="min-w-[90px] max-w-[140px] bg-transparent pr-4 text-white outline-none"
                >
                  {africanCountries.map((item) => (
                    <option key={item.country} value={item.country} className="text-slate-900">
                      {item.country}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex min-w-[90px] max-w-[160px] items-center gap-2 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-white/85">
                <span className="text-white/60">{t("nav.language")}</span>
                <select
                  value={selectedLanguage}
                  onChange={(event) => handleLanguageChange(event.target.value)}
                  className="min-w-[70px] max-w-[140px] bg-transparent pr-4 text-white outline-none"
                >
                  {allLanguages.map((language) => (
                    <option key={language} value={language} className="text-slate-900">
                      {language}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex min-w-[100px] max-w-[160px] items-center gap-2 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-white/85">
                <span className="text-white/60">{t("nav.currency")}</span>
                <select
                  value={selectedCurrency}
                  onChange={(event) => handleCurrencyChange(event.target.value)}
                  className="min-w-[70px] max-w-[100px] bg-transparent pr-4 text-white outline-none"
                >
                  {westAfricanCurrencyOptions.map((currency) => (
                    <option key={currency.code} value={currency.code} className="text-slate-900">
                      {currency.code}
                    </option>
                  ))}
                </select>
              </label>
              <div className="text-[10px] text-white/60 uppercase tracking-[0.2em] min-w-[160px]">
                {currencyStatus.lastFetched ? (
                  <span>
                    {currencyStatus.stale ? t("nav.ratesStale") : t("nav.ratesUpdated")}{" "}
                    {Math.floor((now - currencyStatus.lastFetched) / 3600000)}h ago
                  </span>
                ) : (
                  <span>{t("nav.ratesLoading")}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Main Nav — Magazine minimal (Shopify + Etsy blend) ─── */}
      <nav
        className={`sticky top-0 z-50 transition-all duration-500 ${
          scrolled
            ? "bg-[#fdfaf4]/95 backdrop-blur-xl shadow-[0_1px_0_0_rgba(232,226,219,1)]"
            : "bg-[#f7efe5]"
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
            <BrandLogo className="group" brandClassName="text-[#1A1A1A]" taglineClassName="text-[#8f7d61]" compact={false} />

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
                        className={`absolute top-full left-0 pt-3 transition-all duration-300 ${
                          shopDropdownOpen
                            ? "opacity-100 translate-y-0 pointer-events-auto"
                            : "opacity-0 -translate-y-2 pointer-events-none"
                        }`}
                      >
                        <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-lg shadow-slate-200/40 min-w-[360px]">
                          <div className="grid gap-4 sm:grid-cols-2">
                            {shopMenuGroups.map((group) => (
                              <div key={group.title}>
                                <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500 mb-3 font-semibold">
                                  {group.title}
                                </p>
                                <div className="space-y-1">
                                  {group.items.map((item) => (
                                    <Link
                                      key={item.href}
                                      href={item.href}
                                      className="block rounded-xl px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50 hover:text-[#1A1A1A]"
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
              <div className="hidden lg:block relative">
                <form
                  onSubmit={handleSearch}
                  className={`flex items-center transition-all duration-300 ${
                    searchFocused
                      ? "w-80 border-[#C9A96E]"
                      : "w-64 border-[#E8E2DB]"
                  } border-b bg-transparent`}
                >
                  <Search size={16} className="text-[#9B9590] shrink-0" />
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
                    onBlur={() => setTimeout(() => setSearchSuggestionsOpen(false), 150)}
                    className="w-full py-3 px-3 bg-transparent outline-none text-sm text-[#1A1A1A] placeholder:text-[#9B9590]"
                  />
                  {search && (
                    <button type="button" onClick={() => setSearch("")} className="text-[#9B9590] hover:text-[#1A1A1A]">
                      <X size={14} />
                    </button>
                  )}
                </form>

                {searchSuggestionsOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1 rounded-2xl border border-slate-200/80 bg-white shadow-xl shadow-slate-200/30 z-20">
                    <div className="grid gap-1 p-3 sm:grid-cols-2">
                      {filteredSearchSuggestions.length > 0 ? (
                        filteredSearchSuggestions.map((item) => (
                          <button
                            key={item}
                            type="button"
                            onMouseDown={() => handleSuggestionClick(item)}
                            className="text-left rounded-xl px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                          >
                            {item}
                          </button>
                        ))
                      ) : (
                        <div className="col-span-full rounded-xl px-3 py-3 text-sm text-slate-500">
                          {t("nav.noSuggestions")}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Wallet balance chip */}
              {isLoaded && user && (
                <Link
                  href="/wallet"
                  className="hidden md:flex relative items-center gap-1.5 px-3 py-2 text-[#1A1A1A] hover:text-[#C9A96E] transition group"
                  title={t("wallet.balance")}
                >
                  <Wallet size={19} strokeWidth={1.5} />
                  <span className="text-[13px] font-medium tabular-nums">
                    {walletLoading && walletBalance == null ? (
                      "—"
                    ) : (
                      <CurrencyAmount amount={walletBalance ?? 0} />
                    )}
                  </span>
                </Link>
              )}

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
                        {t("nav.signIn")}
                      </Link>
                      <Link
                        href="/sign-up"
                        className="btn-gold text-[11px] py-2.5 px-5"
                      >
                        {t("nav.signUp")}
                      </Link>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => router.push("/account")}
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
                          {user.firstName || t("nav.account")}
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
              searchFocused ? "max-h-[280px] pb-4" : "max-h-0"
            }`}
          >
            <form onSubmit={handleSearch} className="flex items-center border-b border-[#E8E2DB]">
              <Search size={16} className="text-[#9B9590]" />
              <input
                type="text"
                placeholder={t("nav.searchPlaceholderMobile")}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setSearchSuggestionsOpen(true);
                }}
                className="w-full py-3 px-3 bg-transparent outline-none text-sm text-[#1A1A1A] placeholder:text-[#9B9590]"
                autoFocus={searchFocused}
              />
            </form>
            {searchSuggestionsOpen && (
              <div className="mt-3 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-lg shadow-slate-200/30">
                {filteredSearchSuggestions.length > 0 ? (
                  filteredSearchSuggestions.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onMouseDown={() => handleSuggestionClick(item)}
                      className="w-full text-left rounded-xl px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      {item}
                    </button>
                  ))
                ) : (
                  <div className="rounded-xl px-3 py-3 text-sm text-slate-500">
                    {t("nav.noSuggestions")}
                  </div>
                )}
              </div>
            )}
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
                  onClick={handleNavLinkClick}
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

            {/* Mobile Wallet */}
            {isLoaded && user && (
              <Link
                href="/wallet"
                onClick={handleNavLinkClick}
                className="flex items-center justify-between py-4 border-t border-[#E8E2DB]"
              >
                <span className="flex items-center gap-3 text-[#1A1A1A]">
                  <Wallet size={19} strokeWidth={1.5} />
                  <span className="font-medium">{t("wallet.balance")}</span>
                </span>
                <span className="font-semibold text-[#C9A96E]">
                  <CurrencyAmount amount={walletBalance ?? 0} />
                </span>
              </Link>
            )}

            {/* Mobile Categories */}
            <div className="border-t border-[#E8E2DB] pt-6 mb-6">
              <p className="text-[10px] tracking-[0.2em] uppercase text-[#9B9590] mb-4">
                {t("nav.popularCategories")}
              </p>
              <div className="flex flex-wrap gap-2">
                {shopCategories.slice(0, 5).map((cat) => (
                  <Link
                    key={cat.href}
                    href={cat.href}
                    onClick={handleNavLinkClick}
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
                    onClick={handleNavLinkClick}
                    className="block w-full text-center py-4 bg-[#1A1A1A] text-white text-sm font-medium tracking-wide uppercase"
                  >
                    {t("nav.signUp")}
                  </Link>
                  <Link
                    href="/sign-in"
                    onClick={handleNavLinkClick}
                    className="block w-full text-center py-4 border border-[#1A1A1A] text-[#1A1A1A] text-sm font-medium tracking-wide uppercase"
                  >
                    {t("nav.signIn")}
                  </Link>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    handleNavLinkClick();
                    handleSignOut();
                  }}
                  className="block w-full text-center py-4 border border-[#1A1A1A] text-[#1A1A1A] text-sm font-medium tracking-wide uppercase"
                >
                  {t("nav.signOut")}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
