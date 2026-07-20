"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import axios from "axios";
import toast from "react-hot-toast";
import {
  Search,
  SlidersHorizontal,
  Grid3X3,
  LayoutList,
  Star,
  Heart,
  ArrowUpDown,
  X,
  ChevronDown,
} from "lucide-react";
import Loading from "@/components/Loading";

const sortOptions = [
  { label: "Featured", value: "featured" },
  { label: "Newest", value: "newest" },
  { label: "Price: Low to High", value: "price_asc" },
  { label: "Price: High to Low", value: "price_desc" },
  { label: "Top Rated", value: "rating" },
  { label: "Most Popular", value: "popular" },
];

const categories = [
  { label: "All", value: "" },
  { label: "Electronics", value: "electronics" },
  { label: "Fashion", value: "fashion" },
  { label: "Watches", value: "watches" },
  { label: "Audio", value: "audio" },
  { label: "Home", value: "home" },
  { label: "Accessories", value: "accessories" },
];

const priceRanges = [
  { label: "Under SLe 500", min: 0, max: 500 },
  { label: "SLe 500 - 1,000", min: 500, max: 1000 },
  { label: "SLe 1,000 - 2,500", min: 1000, max: 2500 },
  { label: "SLe 2,500 - 5,000", min: 2500, max: 5000 },
  { label: "Over SLe 5,000", min: 5000, max: null },
];

export default function ShopPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("grid"); // grid | list
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);

  const searchQuery = searchParams.get("search") || "";
  const categoryFilter = searchParams.get("category") || "";
  const sortBy = searchParams.get("sort") || "featured";

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (searchQuery) params.set("search", searchQuery);
        if (categoryFilter) params.set("category", categoryFilter);
        if (sortBy) params.set("sort", sortBy);

        const res = await axios.get(`/api/products?${params.toString()}`);
        setProducts(res.data.products || []);
      } catch (err) {
        toast.error("Failed to load products");
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [searchQuery, categoryFilter, sortBy]);

  const updateFilter = (key, value) => {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/shop?${params.toString()}`);
  };

  const clearFilters = () => {
    router.push("/shop");
  };

  if (loading) return <Loading />;

  return (
    <main className="min-h-screen bg-[#FAF8F5]">
      {/* ─── Shop Header — Editorial Magazine Style ─── */}
      <div className="relative h-[40vh] min-h-[300px] overflow-hidden">
        <Image
          src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1600&h=600&fit=crop"
          alt="Shop"
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-[#1A1A1A]/40" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <p className="text-editorial text-white/70 mb-3">The Collection</p>
            <h1 className="font-display text-5xl md:text-6xl text-white font-medium">
              Shop
            </h1>
            {searchQuery && (
              <p className="text-white/60 mt-3 text-lg">
                Results for "{searchQuery}"
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ─── Filter Bar — Amazon + Etsy Efficiency ─── */}
      <div className="sticky top-[72px] lg:top-[88px] z-30 bg-white border-b border-[#E8E2DB]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            {/* Left — Categories (Etsy-style pills) */}
            <div className="hidden lg:flex items-center gap-1 overflow-x-auto no-scrollbar">
              {categories.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => updateFilter("category", cat.value)}
                  className={`px-4 py-1.5 text-[13px] font-medium transition whitespace-nowrap ${
                    categoryFilter === cat.value || (!categoryFilter && !cat.value)
                      ? "text-[#1A1A1A] border-b-2 border-[#C9A96E]"
                      : "text-[#9B9590] hover:text-[#1A1A1A]"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Mobile Category Toggle */}
            <button
              onClick={() => setFilterOpen(!filterOpen)}
              className="lg:hidden flex items-center gap-2 text-sm text-[#1A1A1A]"
            >
              <SlidersHorizontal size={16} />
              Filters
            </button>

            {/* Right — Sort + View Toggle */}
            <div className="flex items-center gap-4">
              {/* Results count */}
              <span className="hidden sm:block text-sm text-[#9B9590]">
                {products.length} results
              </span>

              {/* Sort Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setSortOpen(!sortOpen)}
                  className="flex items-center gap-2 text-sm text-[#1A1A1A] hover:text-[#C9A96E] transition"
                >
                  <ArrowUpDown size={14} />
                  <span className="hidden sm:inline">
                    {sortOptions.find((s) => s.value === sortBy)?.label || "Sort"}
                  </span>
                  <ChevronDown size={12} className={`transition-transform ${sortOpen ? "rotate-180" : ""}`} />
                </button>
                {sortOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-[#E8E2DB] shadow-xl z-50">
                    {sortOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          updateFilter("sort", option.value);
                          setSortOpen(false);
                        }}
                        className={`w-full text-left px-4 py-3 text-sm transition ${
                          sortBy === option.value
                            ? "bg-[#FAF8F5] text-[#C9A96E] font-medium"
                            : "text-[#2D2D2D] hover:bg-[#FAF8F5]"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* View Toggle */}
              <div className="hidden sm:flex items-center border border-[#E8E2DB]">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-2 transition ${viewMode === "grid" ? "bg-[#1A1A1A] text-white" : "text-[#9B9590] hover:text-[#1A1A1A]"}`}
                >
                  <Grid3X3 size={16} />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-2 transition ${viewMode === "list" ? "bg-[#1A1A1A] text-white" : "text-[#9B9590] hover:text-[#1A1A1A]"}`}
                >
                  <LayoutList size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Active Filters */}
        {(searchQuery || categoryFilter) && (
          <div className="max-w-7xl mx-auto px-6 lg:px-8 pb-3">
            <div className="flex items-center gap-2 flex-wrap">
              {searchQuery && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-[#1A1A1A] text-white text-xs">
                  Search: {searchQuery}
                  <button onClick={() => updateFilter("search", "")}>
                    <X size={12} />
                  </button>
                </span>
              )}
              {categoryFilter && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-[#1A1A1A] text-white text-xs">
                  {categories.find((c) => c.value === categoryFilter)?.label}
                  <button onClick={() => updateFilter("category", "")}>
                    <X size={12} />
                  </button>
                </span>
              )}
              <button
                onClick={clearFilters}
                className="text-xs text-[#9B9590] hover:text-[#C9A96E] transition underline"
              >
                Clear all
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─── Mobile Filter Panel ─── */}
      {filterOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-white">
          <div className="p-6">
            <div className="flex items-center justify-between mb-8">
              <h3 className="font-display text-2xl text-[#1A1A1A]">Filters</h3>
              <button onClick={() => setFilterOpen(false)}>
                <X size={24} />
              </button>
            </div>
            <div className="space-y-6">
              <div>
                <p className="text-editorial text-[#9B9590] mb-3">Categories</p>
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
                          ? "text-[#C9A96E] font-medium"
                          : "text-[#2D2D2D]"
                      }`}
                    >
                      {cat.label}
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
        {products.length === 0 ? (
          <div className="text-center py-24">
            <p className="font-display text-2xl text-[#1A1A1A] mb-2">No products found</p>
            <p className="text-[#9B9590]">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div
            className={
              viewMode === "grid"
                ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6"
                : "space-y-6"
            }
          >
            {products.map((product, i) => (
              <ProductCard
                key={product.id || i}
                product={product}
                viewMode={viewMode}
                index={i}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function ProductCard({ product, viewMode, index }) {
  const [liked, setLiked] = useState(false);
  const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || "SLe";

  if (viewMode === "list") {
    return (
      <Link
        href={`/product/${product.id}`}
        className="group flex gap-6 p-4 bg-white border border-[#E8E2DB] hover:border-[#C9A96E]/30 transition-all duration-500"
      >
        <div className="relative w-40 h-48 shrink-0 overflow-hidden bg-[#F5F0EB]">
          <Image
            src={product.image || "/placeholder.jpg"}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-700"
          />
        </div>
        <div className="flex-1 py-2">
          <p className="text-[10px] tracking-[0.15em] uppercase text-[#9B9590] mb-1">
            {product.category || "General"}
          </p>
          <h3 className="font-display text-xl text-[#1A1A1A] group-hover:text-[#C9A96E] transition-colors mb-2">
            {product.name}
          </h3>
          <p className="text-sm text-[#6B6560] line-clamp-2 mb-3">
            {product.description}
          </p>
          <div className="flex items-center gap-4">
            <span className="text-lg font-semibold text-[#1A1A1A]">
              {currency}{product.price?.toLocaleString()}
            </span>
            {product.originalPrice && (
              <span className="text-sm text-[#9B9590] line-through">
                {currency}{product.originalPrice?.toLocaleString()}
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
        <div className="relative aspect-[3/4] overflow-hidden bg-[#F5F0EB]">
          <Image
            src={product.image || "/placeholder.jpg"}
            alt={product.name}
            fill
            className="object-cover product-discovery-img"
          />
          {product.badge && (
            <span className="product-discovery-badge">{product.badge}</span>
          )}
          {/* Wishlist button */}
          <button
            onClick={(e) => {
              e.preventDefault();
              setLiked(!liked);
            }}
            className="absolute top-3 right-3 w-9 h-9 bg-white/90 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-white"
          >
            <Heart
              size={16}
              className={liked ? "text-red-500 fill-red-500" : "text-[#1A1A1A]"}
            />
          </button>
        </div>
        <div className="p-4">
          <p className="text-[10px] tracking-[0.15em] uppercase text-[#9B9590] mb-1">
            {product.category || "General"}
          </p>
          <h3 className="font-display text-[17px] text-[#1A1A1A] group-hover:text-[#C9A96E] transition-colors leading-snug">
            {product.name}
          </h3>
          <div className="flex items-center justify-between mt-2">
            <span className="text-sm font-semibold text-[#1A1A1A]">
              {currency}{product.price?.toLocaleString()}
            </span>
            {product.rating && (
              <div className="flex items-center gap-1">
                <Star size={12} className="text-[#C9A96E] fill-[#C9A96E]" />
                <span className="text-xs text-[#6B6560]">{product.rating}</span>
              </div>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
}

