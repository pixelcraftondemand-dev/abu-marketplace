"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import axios from "axios";
import { useSelector } from 'react-redux'
import CurrencyAmount from '@/components/CurrencyAmount'
import { useTranslation } from '@/lib/i18n'
import {
  Search,
  SlidersHorizontal,
  Grid3X3,
  LayoutList,
  Star,
  Heart,
  ArrowUpDown,
  RotateCcw,
  X,
  ChevronDown,
} from "lucide-react";
import Loading from "@/components/Loading";
import { productDummyData } from "@/assets/assets";
import { getProductRating } from "@/lib/productUtils";
import SharedProductCard from "@/components/ProductCard";

const sortOptions = [
  { labelKey: "shop.sortFeatured", value: "featured" },
  { labelKey: "shop.sortNewest", value: "newest" },
  { labelKey: "shop.sortPriceAsc", value: "price_asc" },
  { labelKey: "shop.sortPriceDesc", value: "price_desc" },
  { labelKey: "shop.sortTopRated", value: "rating" },
  { labelKey: "shop.sortMostPopular", value: "popular" },
];

const categories = [
  { labelKey: "categories.all", value: "" },
  { labelKey: "categories.electronics", value: "electronics" },
  { labelKey: "categories.fashion", value: "fashion" },
  { labelKey: "categories.watches", value: "watches" },
  { labelKey: "categories.audio", value: "audio" },
  { labelKey: "categories.home", value: "home" },
  { labelKey: "categories.accessories", value: "accessories" },
  { labelKey: "categories.halalCertified", value: "halal-certified" },
];

function ShopPageContent({ initialProducts = [] }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [products, setProducts] = useState(initialProducts);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState("grid"); // grid | list
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [loadError, setLoadError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const { t } = useTranslation();

  const searchQuery = searchParams.get("search") || "";
  const categoryFilter = searchParams.get("category") || "";
  const sortBy = searchParams.get("sort") || "featured";

  const showFallbackProducts = !loading && products.length === 0 && !searchQuery && !categoryFilter;
  const displayedProducts = showFallbackProducts ? productDummyData : products;

  useEffect(() => {
    setSearchTerm(searchQuery);
  }, [searchQuery]);

  // Only fetch client-side on retry or when search params change after initial load
  useEffect(() => {
    // Skip if we have server-rendered products and this is the initial render
    if (initialProducts.length > 0 && retryCount === 0) return;

    const fetchProducts = async () => {
      try {
        setLoading(true);
        setLoadError(false);
        const params = new URLSearchParams();
        if (searchQuery) params.set("search", searchQuery);
        if (categoryFilter) params.set("category", categoryFilter);
        if (sortBy) params.set("sort", sortBy);

        const res = await axios.get(`/api/products?${params.toString()}`);
        setProducts(res.data.products || []);
      } catch (err) {
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [searchQuery, categoryFilter, sortBy, retryCount]);

  const updateFilter = (key, value) => {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/shop?${params.toString()}`);
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    updateFilter("search", searchTerm.trim());
  };

  const clearFilters = () => {
    router.push("/shop");
  };

  if (loading) return <Loading />;

  return (
    <main className="min-h-screen bg-[var(--bg-primary)]">
      {/* ─── Shop Header — Editorial Magazine Style ─── */}
      <div className="relative h-[40vh] min-h-[300px] overflow-hidden">
        <Image
          src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1600&h=600&fit=crop"
          alt="Shop"
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-[var(--text-primary)]/40" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <p className="text-editorial text-white/70 mb-3">{t('shop.theCollection')}</p>
            <h1 className="font-display text-5xl md:text-6xl text-white font-medium">
              {t('shop.title')}
            </h1>
            {searchQuery && (
              <p className="text-white/60 mt-3 text-lg">
                {t('shop.resultsFor', { query: searchQuery })}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ─── Filter Bar — Amazon + Etsy Efficiency ─── */}
      <div className="sticky top-[72px] lg:top-[88px] z-30 bg-[var(--bg-surface)] border-b border-[var(--border-primary)]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            {/* Left — Search and categories */}
            <div className="hidden lg:flex items-center gap-4">
              <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 rounded-full border border-[var(--border-primary)] bg-[var(--bg-muted)] px-4 py-2">
                <Search size={16} className="text-[var(--text-tertiary)]" />
                <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={t("nav.searchPlaceholder")}
                  className="w-72 bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]"
                />
              </form>

              <div className="hidden xl:flex items-center gap-1 overflow-x-auto no-scrollbar">
                {categories.map((cat) => (
                  <button
                    key={cat.value}
                    onClick={() => updateFilter("category", cat.value)}
                    className={`px-4 py-1.5 text-[13px] font-medium transition whitespace-nowrap ${
                      categoryFilter === cat.value || (!categoryFilter && !cat.value)
                        ? "text-[var(--text-primary)] border-b-2 border-[var(--accent)]"
                        : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    {t(cat.labelKey)}
                  </button>
                ))}
              </div>
            </div>

            {/* Mobile Category Toggle */}
            <button
              onClick={() => setFilterOpen(!filterOpen)}
              className="lg:hidden flex items-center gap-2 text-sm text-[var(--text-primary)]"
            >
              <SlidersHorizontal size={16} />
              {t('shop.filters')}
            </button>

            {/* Right — Sort + View Toggle */}
            <div className="flex items-center gap-4">
              {/* Results count */}
              <span className="hidden sm:block text-sm text-[var(--text-tertiary)]">
                {t('shop.results', { count: loadError ? 0 : displayedProducts.length })}
              </span>

              {/* Sort Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setSortOpen(!sortOpen)}
                  className="flex items-center gap-2 text-sm text-[var(--text-primary)] hover:text-[var(--accent)] transition"
                >
                  <ArrowUpDown size={14} />
                  <span className="hidden sm:inline">
                    {t(sortOptions.find((s) => s.value === sortBy)?.labelKey || 'shop.sort')}
                  </span>
                  <ChevronDown size={12} className={`transition-transform ${sortOpen ? "rotate-180" : ""}`} />
                </button>
                {sortOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-[var(--bg-surface)] border border-[var(--border-primary)] shadow-xl z-50">
                    {sortOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          updateFilter("sort", option.value);
                          setSortOpen(false);
                        }}
                        className={`w-full text-left px-4 py-3 text-sm transition ${
                          sortBy === option.value
                            ? "bg-[var(--bg-muted)] text-[var(--accent)] font-medium"
                            : "text-[var(--text-primary)] hover:bg-[var(--bg-muted)]"
                        }`}
                      >
                        {t(option.labelKey)}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* View Toggle */}
              <div className="hidden sm:flex items-center border border-[var(--border-primary)]">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-2 transition ${viewMode === "grid" ? "bg-[var(--text-primary)] text-[var(--bg-primary)]" : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"}`}
                >
                  <Grid3X3 size={16} />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-2 transition ${viewMode === "list" ? "bg-[var(--text-primary)] text-[var(--bg-primary)]" : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"}`}
                >
                  <LayoutList size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Active Filters */}
        {!loadError && showFallbackProducts && (
          <div className="max-w-7xl mx-auto px-6 lg:px-8 pb-3">
            <div className="rounded-3xl border border-[var(--border-primary)] bg-[var(--accent-brand-light)] p-5 text-sm text-[var(--text-secondary)]">
              <strong className="block font-semibold text-[var(--text-primary)] mb-1">{t('shop.sampleProducts')}</strong>
              {t('shop.sampleProductsText')}
            </div>
          </div>
        )}
        {(searchQuery || categoryFilter) && (
          <div className="max-w-7xl mx-auto px-6 lg:px-8 pb-3">
            <div className="flex items-center gap-2 flex-wrap">
              {searchQuery && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-[var(--text-primary)] text-[var(--bg-primary)] text-xs">
                  {t('shop.search', { query: searchQuery })}
                  <button onClick={() => updateFilter("search", "")}>
                    <X size={12} />
                  </button>
                </span>
              )}
              {categoryFilter && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-[var(--text-primary)] text-[var(--bg-primary)] text-xs">
                  {t(categories.find((c) => c.value === categoryFilter)?.labelKey || "")}
                  <button onClick={() => updateFilter("category", "")}>
                    <X size={12} />
                  </button>
                </span>
              )}
              <button
                onClick={clearFilters}
                className="text-xs text-[var(--text-tertiary)] hover:text-[var(--accent)] transition underline"
              >
                {t('shop.clearAll')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─── Mobile Filter Panel ─── */}
      {filterOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-[var(--bg-surface)]">
          <div className="p-6">
            <div className="flex items-center justify-between mb-8">
              <h3 className="font-display text-2xl text-[var(--text-primary)]">{t('shop.filters')}</h3>
              <button onClick={() => setFilterOpen(false)}>
                <X size={24} />
              </button>
            </div>
            <div className="space-y-6">
              <div>
                <p className="text-editorial text-[var(--text-tertiary)] mb-3">{t('shop.categories')}</p>
                <div className="space-y-2">
                  {categories.map((cat) => (
                    <button
                      key={cat.value}
                      onClick={() => {
                        updateFilter("category", cat.value);
                        setFilterOpen(false);
                      }}
                      className={`block w-full text-left py-2 text-sm ${
                        categoryFilter === cat.value
                          ? "text-[var(--accent)] font-medium"
                          : "text-[var(--text-primary)]"
                      }`}
                    >
                      {t(cat.labelKey)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Product Grid — Etsy Discovery + Shopify Clean ─── */}
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
        {categoryFilter === "halal-certified" && (
          <div className="mb-8 rounded-2xl border border-[var(--border-primary)] bg-[var(--bg-surface)]/80 p-6 shadow-sm">
            <p className="text-[10px] tracking-[0.24em] uppercase text-[var(--accent)] mb-2">{t('shop.featuredCollection')}</p>
            <h2 className="font-display text-2xl text-[var(--text-primary)] mb-2">{t('shop.halalCertifiedProducts')}</h2>
            <p className="max-w-2xl text-sm text-[var(--text-secondary)]">
              {t('shop.halalCertifiedText')}
            </p>
          </div>
        )}

        {loadError ? (
          <div className="text-center py-24">
            <p className="font-display text-2xl text-[var(--text-primary)] mb-2">{t('shop.failedToLoad')}</p>
            <p className="text-[var(--text-tertiary)] mb-8">{t('shop.retryText')}</p>
            <button
              type="button"
              onClick={() => setRetryCount((count) => count + 1)}
              className="inline-flex items-center gap-2 rounded-full bg-[var(--text-primary)] px-6 py-3 text-sm font-semibold text-[var(--bg-primary)] transition hover:bg-[var(--accent)]"
            >
              <RotateCcw size={16} />
              {t('shop.retry')}
            </button>
          </div>
        ) : displayedProducts.length === 0 ? (
          <div className="text-center py-24">
            <p className="font-display text-2xl text-[var(--text-primary)] mb-2">{t('shop.noProductsFound')}</p>
            <p className="text-[var(--text-tertiary)]">{t('shop.tryAdjusting')}</p>
          </div>
        ) : (
          <div
            className={
              viewMode === "grid"
                ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6"
                : "space-y-6"
            }
          >
            {viewMode === "grid"
              ? displayedProducts.map((product, i) => (
                  <SharedProductCard key={product.id || i} product={product} />
                ))
              : displayedProducts.map((product, i) => (
                  <ProductCard key={product.id || i} product={product} viewMode={viewMode} index={i} />
                ))}
          </div>
        )}
      </div>
    </main>
  );
}

function ProductCard({ product, viewMode, index }) {
  const [liked, setLiked] = useState(false);
  const { rating: ratingValue, count: ratingCount } = getProductRating(product);

  if (viewMode === "list") {
    return (
      <Link
        href={`/product/${product.id}`}
        className="group flex gap-6 p-4 bg-[var(--bg-surface)] border border-[var(--border-primary)] hover:border-[var(--accent)]/30 transition-all duration-500"
      >
        <div className="relative w-40 h-48 shrink-0 overflow-hidden bg-[var(--bg-muted)]">
          <Image
            src={product.image || "/placeholder.jpg"}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-700"
          />
        </div>
        <div className="flex-1 py-2">
          <p className="text-[10px] tracking-[0.15em] uppercase text-[var(--text-tertiary)] mb-1">
            {product.category || "General"}
          </p>
          <h3 className="font-display text-xl text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors mb-2">
            {product.name}
          </h3>
          <p className="text-sm text-[var(--text-secondary)] line-clamp-2 mb-3">
            {product.description}
          </p>
          <div className="flex items-center gap-4">
            <span className="text-lg font-semibold text-[var(--text-primary)]">
              <CurrencyAmount amount={product.price} />
            </span>
            {product.originalPrice && (
              <span className="text-sm text-[var(--text-tertiary)] line-through">
                <CurrencyAmount amount={product.originalPrice} />
              </span>
            )}
          </div>
        </div>
      </Link>
    );
  }

  return (
    <div
      className="group product-discovery"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <Link href={`/product/${product.id}`}>
        <div className="relative aspect-[3/4] overflow-hidden bg-[var(--bg-muted)]">
          <Image
            src={product.images?.[0] || product.image || "/placeholder.jpg"}
            alt={product.name}
            fill
            className="object-cover product-discovery-img"
          />
          {product.badge && (
            <span className="product-discovery-badge bg-[var(--accent)] text-white border-transparent">
              {product.badge}
            </span>
          )}
          {/* Wishlist button */}
          <button
            onClick={(e) => {
              e.preventDefault();
              setLiked(!liked);
            }}
            className="absolute top-3 right-3 w-9 h-9 bg-[var(--bg-surface)]/90 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-[var(--bg-surface)]"
          >
            <Heart
              size={16}
              className={liked ? "text-red-500 fill-red-500" : "text-[var(--text-primary)]"}
            />
          </button>
        </div>
        <div className="p-4">
          <p className="text-[10px] tracking-[0.15em] uppercase text-[var(--text-tertiary)] mb-1">
            {product.category || "General"}
          </p>
          <h3 className="font-display text-[17px] text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors leading-snug">
            {product.name}
          </h3>
          <div className="flex items-center justify-between mt-2">
            <span className="text-sm font-semibold text-[var(--text-primary)]">
              <CurrencyAmount amount={product.price} />
            </span>
            {ratingCount > 0 && (
              <div className="flex items-center gap-1">
                <Star size={12} className="text-[var(--accent)] fill-[var(--accent)]" />
                <span className="text-xs text-[var(--text-secondary)]">{ratingValue}</span>
              </div>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
}

export default function ShopPage({ initialProducts = [] }) {
  return (
    <Suspense fallback={<Loading />}>
      <ShopPageContent initialProducts={initialProducts} />
    </Suspense>
  );
}
