"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import axios from "axios";
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
  const [viewMode, setViewMode] = useState("grid");
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [loadError, setLoadError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [priceRange, setPriceRange] = useState({ min: "", max: "" });
  const [minRating, setMinRating] = useState("");
  const [inStockOnly, setInStockOnly] = useState(false);
  const { t } = useTranslation();

  const searchQuery = searchParams.get("search") || "";
  const categoryFilter = searchParams.get("category") || "";
  const sortBy = searchParams.get("sort") || "featured";

  const showFallbackProducts = !loading && products.length === 0 && !searchQuery && !categoryFilter;
  const displayedProducts = showFallbackProducts ? productDummyData : products;

  useEffect(() => {
    setSearchTerm(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
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
    setPriceRange({ min: "", max: "" });
    setMinRating("");
    setInStockOnly(false);
  };

  // Client-side filtering for sidebar filters
  let filteredProducts = displayedProducts;
  if (priceRange.min) filteredProducts = filteredProducts.filter(p => p.price >= Number(priceRange.min));
  if (priceRange.max) filteredProducts = filteredProducts.filter(p => p.price <= Number(priceRange.max));
  if (minRating) filteredProducts = filteredProducts.filter(p => {
    const { rating } = getProductRating(p);
    return rating >= Number(minRating);
  });
  if (inStockOnly) filteredProducts = filteredProducts.filter(p => p.inStock !== false);

  const activeFilterCount = [priceRange.min, priceRange.max, minRating, inStockOnly].filter(Boolean).length;

  if (loading) return <Loading />;

  return (
    <main className="min-h-screen bg-[var(--bg-primary)]">
      {/* ─── Shop Header — Clean, utilitarian ─── */}
      <div className="bg-[var(--bg-topbar)] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-2xl font-bold">{t('shop.title')}</h1>
          {searchQuery && (
            <p className="text-white/60 mt-1 text-sm">
              {t('shop.resultsFor', { query: searchQuery })}
            </p>
          )}
        </div>
      </div>

      {/* ─── Filter Bar ─── */}
      <div className="sticky top-[72px] lg:top-[88px] z-30 bg-[var(--bg-surface)] border-b border-[var(--border-primary)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-12">
            <div className="flex items-center gap-3">
              <span className="text-sm text-[var(--text-secondary)]">
                {filteredProducts.length} {t('shop.results', { count: filteredProducts.length }).split(' ')[1] || 'products'}
              </span>
            </div>

            <div className="flex items-center gap-3">
              {/* Sort Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setSortOpen(!sortOpen)}
                  className="flex items-center gap-1.5 text-sm text-[var(--text-primary)] hover:text-[var(--accent)] transition"
                >
                  <ArrowUpDown size={14} />
                  <span className="hidden sm:inline">
                    {t(sortOptions.find((s) => s.value === sortBy)?.labelKey || 'shop.sort')}
                  </span>
                  <ChevronDown size={12} className={`transition-transform ${sortOpen ? "rotate-180" : ""}`} />
                </button>
                {sortOpen && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-[var(--bg-surface)] border border-[var(--border-primary)] shadow-lg z-50 rounded-lg overflow-hidden">
                    {sortOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          updateFilter("sort", option.value);
                          setSortOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2.5 text-sm transition ${
                          sortBy === option.value
                            ? "bg-[var(--accent)]/10 text-[var(--accent)] font-medium"
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
              <div className="hidden sm:flex items-center border border-[var(--border-primary)] rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-2 transition ${viewMode === "grid" ? "bg-[var(--accent)] text-white" : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"}`}
                >
                  <Grid3X3 size={14} />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-2 transition ${viewMode === "list" ? "bg-[var(--accent)] text-white" : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"}`}
                >
                  <LayoutList size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Main Content — Sidebar + Grid ─── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-6">
          {/* Sidebar Filters — Desktop */}
          <aside className="hidden lg:block w-56 shrink-0">
            <div className="sticky top-[140px] space-y-6">
              {/* Categories */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-3">
                  {t('shop.categories')}
                </h3>
                <div className="space-y-1">
                  {categories.map((cat) => (
                    <button
                      key={cat.value}
                      onClick={() => updateFilter("category", cat.value)}
                      className={`block w-full text-left px-3 py-1.5 text-sm rounded transition ${
                        categoryFilter === cat.value || (!categoryFilter && !cat.value)
                          ? "bg-[var(--accent)]/10 text-[var(--accent)] font-medium"
                          : "text-[var(--text-primary)] hover:bg-[var(--bg-muted)]"
                      }`}
                    >
                      {t(cat.labelKey)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price Range */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-3">
                  {t('shop.priceRange')}
                </h3>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={priceRange.min}
                    onChange={(e) => setPriceRange({ ...priceRange, min: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-sm border border-[var(--border-primary)] rounded bg-[var(--bg-surface)] outline-none focus:border-[var(--accent)]"
                  />
                  <span className="text-[var(--text-tertiary)]">–</span>
                  <input
                    type="number"
                    placeholder="Max"
                    value={priceRange.max}
                    onChange={(e) => setPriceRange({ ...priceRange, max: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-sm border border-[var(--border-primary)] rounded bg-[var(--bg-surface)] outline-none focus:border-[var(--accent)]"
                  />
                </div>
              </div>

              {/* Rating */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-3">
                  {t('shop.minRating')}
                </h3>
                <div className="space-y-1">
                  {[4, 3, 2].map((r) => (
                    <button
                      key={r}
                      onClick={() => setMinRating(minRating === String(r) ? "" : String(r))}
                      className={`flex items-center gap-1.5 w-full text-left px-3 py-1.5 text-sm rounded transition ${
                        minRating === String(r)
                          ? "bg-[var(--accent)]/10 text-[var(--accent)] font-medium"
                          : "text-[var(--text-primary)] hover:bg-[var(--bg-muted)]"
                      }`}
                    >
                      {Array(5).fill("").map((_, i) => (
                        <Star key={i} size={11} fill={i < r ? "#F59E0B" : "#D1D5DB"} className="text-transparent" />
                      ))}
                      <span className="text-xs text-[var(--text-tertiary)]">& up</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* In Stock */}
              <div>
                <label className="flex items-center gap-2 text-sm text-[var(--text-primary)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={inStockOnly}
                    onChange={(e) => setInStockOnly(e.target.checked)}
                    className="rounded border-[var(--border-primary)] text-[var(--accent)] focus:ring-[var(--accent)]"
                  />
                  {t('shop.inStockOnly')}
                </label>
              </div>

              {activeFilterCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="text-sm text-[var(--accent)] hover:text-[var(--accent-hover)] transition font-medium"
                >
                  {t('shop.clearAll')}
                </button>
              )}
            </div>
          </aside>

          {/* Product Grid */}
          <div className="flex-1 min-w-0">
            {/* Active filter tags */}
            {(searchQuery || categoryFilter) && (
              <div className="flex items-center gap-2 flex-wrap mb-4">
                {searchQuery && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-[var(--accent)]/10 text-[var(--accent)] text-xs font-medium rounded">
                    "{searchQuery}"
                    <button onClick={() => updateFilter("search", "")}>
                      <X size={12} />
                    </button>
                  </span>
                )}
                {categoryFilter && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-[var(--accent)]/10 text-[var(--accent)] text-xs font-medium rounded">
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
            )}

            {/* Halal certified banner */}
            {categoryFilter === "halal-certified" && (
              <div className="mb-6 rounded-lg border border-[var(--border-primary)] bg-[var(--accent)]/5 p-4">
                <p className="text-[10px] tracking-[0.2em] uppercase text-[var(--accent)] mb-1 font-semibold">{t('shop.featuredCollection')}</p>
                <h2 className="text-lg font-bold text-[var(--text-primary)]">{t('shop.halalCertifiedProducts')}</h2>
                <p className="text-xs text-[var(--text-secondary)] mt-1">{t('shop.halalCertifiedText')}</p>
              </div>
            )}

            {/* Error state */}
            {loadError ? (
              <div className="text-center py-20">
                <p className="text-lg font-bold text-[var(--text-primary)] mb-2">{t('shop.failedToLoad')}</p>
                <p className="text-sm text-[var(--text-tertiary)] mb-6">{t('shop.retryText')}</p>
                <button
                  type="button"
                  onClick={() => setRetryCount((count) => count + 1)}
                  className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)]"
                >
                  <RotateCcw size={14} />
                  {t('shop.retry')}
                </button>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-lg font-bold text-[var(--text-primary)] mb-2">{t('shop.noProductsFound')}</p>
                <p className="text-sm text-[var(--text-tertiary)]">{t('shop.tryAdjusting')}</p>
              </div>
            ) : (
              <div
                className={
                  viewMode === "grid"
                    ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2 sm:gap-3"
                    : "space-y-3"
                }
              >
                {viewMode === "grid"
                  ? filteredProducts.map((product, i) => (
                      <SharedProductCard key={product.id || i} product={product} />
                    ))
                  : filteredProducts.map((product, i) => (
                      <ProductCard key={product.id || i} product={product} viewMode={viewMode} index={i} />
                    ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Mobile Filter Panel ─── */}
      {filterOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-[var(--bg-surface)]">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-[var(--text-primary)]">{t('shop.filters')}</h3>
              <button onClick={() => setFilterOpen(false)}>
                <X size={24} />
              </button>
            </div>
            <div className="space-y-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-3">{t('shop.categories')}</p>
                <div className="space-y-1">
                  {categories.map((cat) => (
                    <button
                      key={cat.value}
                      onClick={() => {
                        updateFilter("category", cat.value);
                        setFilterOpen(false);
                      }}
                      className={`block w-full text-left py-2 text-sm rounded transition ${
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
        className="group flex gap-4 p-3 bg-[var(--bg-surface)] border border-[var(--border-primary)] rounded-lg hover:border-[var(--accent)]/30 transition"
      >
        <div className="relative w-32 h-36 shrink-0 overflow-hidden bg-[var(--bg-muted)] rounded">
          <Image
            src={product.image || "/placeholder.jpg"}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
        <div className="flex-1 py-1 min-w-0">
          <h3 className="text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors line-clamp-2">
            {product.name}
          </h3>
          <p className="text-xs text-[var(--text-secondary)] line-clamp-1 mt-1">
            {product.description}
          </p>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-base font-bold text-[var(--text-primary)] tabular-nums">
              <CurrencyAmount amount={product.price} />
            </span>
            {product.originalPrice && (
              <span className="text-xs text-[var(--text-tertiary)] line-through">
                <CurrencyAmount amount={product.originalPrice} />
              </span>
            )}
          </div>
          {ratingCount > 0 && (
            <div className="flex items-center gap-1 mt-1">
              <Star size={11} fill="#F59E0B" className="text-transparent" />
              <span className="text-[11px] text-[var(--text-secondary)]">{ratingValue} ({ratingCount})</span>
            </div>
          )}
        </div>
      </Link>
    );
  }

  return (
    <div className="group product-discovery" style={{ animationDelay: `${index * 50}ms` }}>
      <Link href={`/product/${product.id}`}>
        <div className="relative aspect-square overflow-hidden bg-[var(--bg-muted)]">
          <Image
            src={product.images?.[0] || product.image || "/placeholder.jpg"}
            alt={product.name}
            fill
            className="object-cover product-discovery-img"
          />
          {product.badge && (
            <span className="product-discovery-badge">
              {product.badge}
            </span>
          )}
          <button
            onClick={(e) => { e.preventDefault(); setLiked(!liked); }}
            className="absolute top-2 right-2 w-7 h-7 bg-[var(--bg-surface)]/90 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all rounded"
          >
            <Heart size={13} className={liked ? "text-red-500 fill-red-500" : "text-[var(--text-primary)]"} />
          </button>
        </div>
        <div className="p-2.5">
          <h3 className="text-[13px] font-medium text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors line-clamp-2 leading-snug">
            {product.name}
          </h3>
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-sm font-bold text-[var(--text-primary)] tabular-nums">
              <CurrencyAmount amount={product.price} />
            </span>
            {ratingCount > 0 && (
              <div className="flex items-center gap-0.5">
                <Star size={10} fill="#F59E0B" className="text-transparent" />
                <span className="text-[10px] text-[var(--text-secondary)]">{ratingValue}</span>
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
