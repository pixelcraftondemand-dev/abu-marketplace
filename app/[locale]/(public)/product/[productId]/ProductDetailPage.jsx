"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import Image from "next/image";
import Link from "next/link";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import CurrencyAmount from '@/components/CurrencyAmount'
import { useTranslation } from '@/lib/i18n'
import {
  Heart,
  Share2,
  Truck,
  Shield,
  RotateCcw,
  Star,
  ChevronRight,
  Minus,
  Plus,
  Check,
  Zap,
  BadgeCheck,
} from "lucide-react";
import Loading from "@/components/Loading";
import { addToCart } from "@/lib/features/cart/cartSlice";
import { toggleWishlist } from "@/lib/features/wishlist/wishlistSlice";
import { emitAddedToCart } from "@/lib/cartEvents";
import { getProductDiscount } from "@/lib/productUtils";
import { FREE_DELIVERY_THRESHOLD } from "@/lib/paymentOptions";
import ProductCard from "@/components/ProductCard";

export default function ProductDetailPage() {
  const { productId } = useParams();
  const dispatch = useDispatch();
  const router = useRouter();
  const { t } = useTranslation();
  const wishlistItems = useSelector((state) => state.wishlist.items);

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [liked, setLiked] = useState(false);
  const [activeTab, setActiveTab] = useState("description");

  useEffect(() => {
    if (!productId) return;

    const fetchProduct = async () => {
      setLoading(true);
      setLoadError(false);
      setNotFound(false);
      try {
        const res = await axios.get(`/api/products/${productId}`);
        setProduct(res.data.product);
      } catch (err) {
        // 4xx means the product genuinely doesn't exist — no point retrying.
        if (err?.response?.status && err.response.status >= 400 && err.response.status < 500) {
          setNotFound(true);
        } else {
          setLoadError(true);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [productId, retryCount]);

  const handleAddToCart = () => {
    if (!product.inStock) {
      toast.error(t('product.outOfStock'));
      return;
    }
    for (let i = 0; i < quantity; i++) {
      dispatch(addToCart({ productId: product.id }));
    }
    emitAddedToCart(product, quantity);
  };

  const handleBuyNow = () => {
    if (!product.inStock) {
      toast.error(t('product.outOfStock'));
      return;
    }
    for (let i = 0; i < quantity; i++) {
      dispatch(addToCart({ productId: product.id }));
    }
    emitAddedToCart(product, quantity);
    router.push("/cart");
  };

  const handleAddToWishlist = () => {
    dispatch(toggleWishlist(product.id));
    setLiked(!wishlistItems.includes(product.id));
  };

  if (loading) return <Loading />;

  // Unknown/invalid product (4xx) — show a clear dead-link state.
  if (notFound) {
    return (
      <main className="min-h-screen bg-[#FAF8F5] flex items-center justify-center px-6">
        <div className="max-w-md w-full text-center py-20">
          <h1 className="font-display text-2xl text-[#1A1A1A] font-medium mb-2">
            {t('productPage.productNotFound')}
          </h1>
          <p className="text-sm text-[#6B6560] leading-relaxed mb-8">
            {t('productPage.notFoundText')}
          </p>
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 bg-[#1A1A1A] text-white px-8 py-3.5 text-sm font-medium tracking-wide uppercase transition hover:bg-[#C9A96E]"
          >
            {t('productPage.continueShopping')}
          </Link>
        </div>
      </main>
    );
  }

  // A failed load keeps the user on the page with a clear retry action
  // instead of a fleeting toast + redirect to a blank shop.
  if (loadError) {
    return (
      <main className="min-h-screen bg-[#FAF8F5] flex items-center justify-center px-6">
        <div className="max-w-md w-full text-center py-20">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#F5F0EB]">
            <RotateCcw size={28} className="text-[#C9A96E]" />
          </div>
          <h1 className="font-display text-2xl text-[#1A1A1A] font-medium mb-2">
            {t('productPage.loadFailed')}
          </h1>
          <p className="text-sm text-[#6B6560] leading-relaxed mb-8">
            {t('productPage.loadFailedText')}
          </p>
          <button
            onClick={() => setRetryCount((n) => n + 1)}
            className="inline-flex items-center gap-2 bg-[#1A1A1A] text-white px-8 py-3.5 text-sm font-medium tracking-wide uppercase transition hover:bg-[#C9A96E]"
          >
            <RotateCcw size={15} />
            {t('productPage.retry')}
          </button>
        </div>
      </main>
    );
  }

  if (!product) return null;

  const images = Array.isArray(product.images) && product.images.length
    ? product.images
    : [product.image];
  const relatedProducts = product.related || [];

  return (
    <main className="min-h-screen bg-[#FAF8F5]">
      {/* Breadcrumb — Amazon-style efficiency */}
      <div className="border-b border-[#E8E2DB]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-3">
          <div className="flex items-center gap-2 text-xs text-[#9B9590]">
            <Link href="/" className="hover:text-[#C9A96E] transition">{t('productPage.home')}</Link>
            <ChevronRight size={12} />
            <Link href="/shop" className="hover:text-[#C9A96E] transition">{t('productPage.shop')}</Link>
            <ChevronRight size={12} />
            <Link href={`/shop?category=${product.category}`} className="hover:text-[#C9A96E] transition">
              {product.category}
            </Link>
            <ChevronRight size={12} />
            <span className="text-[#1A1A1A]">{product.name}</span>
          </div>
        </div>
      </div>

      {/* ─── Product Hero — Asymmetric Magazine Layout ─── */}
      <section className="max-w-7xl mx-auto px-6 lg:px-8 py-8 lg:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16">
          {/* Left — Images */}
          <div className="space-y-4">
            {/* Main Image */}
            <div className="relative aspect-square overflow-hidden bg-[#F5F0EB]">
              <Image
                src={images[selectedImage]}
                alt={product.name}
                fill
                className="object-cover"
                priority
              />
              {product.badge && (
                <span className="absolute top-4 left-4 px-3 py-1.5 bg-[#C9A96E] text-white text-[10px] font-semibold tracking-widest uppercase">
                  {product.badge}
                </span>
              )}
            </div>
            {/* Thumbnails */}
            {images.length > 1 && (
              <div className="flex gap-3">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(i)}
                    className={`relative w-20 h-20 overflow-hidden bg-[#F5F0EB] border-2 transition ${
                      selectedImage === i ? "border-[#C9A96E]" : "border-transparent"
                    }`}
                  >
                    <Image src={img} alt="" fill className="object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right — Product Info — Shopify Clean */}
          <div className="lg:py-8">
            <p className="text-editorial text-[#C9A96E] mb-2">{product.category}</p>
            <h1 className="font-display text-3xl md:text-4xl text-[#1A1A1A] font-medium leading-tight mb-4">
              {product.name}
            </h1>

            {/* Rating — Jumia-style stars + review count */}
            <div className="flex items-center gap-3 mb-6">
              <div className="flex items-center gap-1">
                {Array(5).fill(null).map((_, i) => (
                  <Star
                    key={i}
                    size={14}
                    className={i < Math.floor(product.rating || 0) ? "text-[#C9A96E] fill-[#C9A96E]" : "text-[#E8E2DB]"}
                  />
                ))}
              </div>
              <span className="text-sm text-[#6B6560]">
                {Number(product.rating || 0).toFixed(1)} ({t('productPage.reviews', { count: product.reviewCount || 0 })})
              </span>
            </div>

            {/* Price — discounted price vs crossed-out list price */}
            <div className="flex items-baseline gap-3 mb-6">
              <span className="font-display text-3xl text-[#1A1A1A] font-medium">
                <CurrencyAmount amount={product.price} />
              </span>
              {(product.originalPrice || product.mrp) && (product.originalPrice || product.mrp) > product.price && (
                <span className="text-lg text-[#9B9590] line-through">
                  <CurrencyAmount amount={product.originalPrice || product.mrp} />
                </span>
              )}
              {getProductDiscount(product) > 0 && (
                <span className="px-2 py-1 bg-[#1A1A1A] text-white text-xs font-medium">
                  {t('productPage.percentOff', { percent: getProductDiscount(product) })}
                </span>
              )}
            </div>

            {/* Short Description */}
            <p className="text-[#6B6560] leading-relaxed mb-8">
              {product.shortDescription || product.description?.slice(0, 200)}
            </p>

            {/* Quantity + Actions */}
            <div className="space-y-4 mb-8">
              {/* Quantity */}
              <div className="flex items-center gap-4">
                <span className="text-sm text-[#6B6560]">{t('productPage.quantity')}</span>
                <div className="flex items-center border border-[#E8E2DB]">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="p-3 hover:bg-[#F5F0EB] transition"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="w-12 text-center text-sm font-medium">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="p-3 hover:bg-[#F5F0EB] transition"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>

              {/* Buttons — Jumia-style Add to Cart + Buy Now split */}
              <div className="flex gap-3">
                <button
                  onClick={handleAddToCart}
                  className="flex-1 border-2 border-[#1A1A1A] py-4 text-sm font-medium uppercase tracking-wide transition hover:bg-[#1A1A1A] hover:text-white"
                >
                  <span>{t('productPage.addToCart')}</span>
                </button>
                <button
                  onClick={handleBuyNow}
                  className="flex items-center justify-center gap-2 flex-1 btn-luxury py-4"
                >
                  <Zap size={16} />
                  <span>{t('productPage.buyNow')}</span>
                </button>
                <button
                  onClick={handleAddToWishlist}
                  aria-label={t('productPage.addedToWishlist')}
                  className={`p-4 border transition ${
                    liked
                      ? "border-red-200 bg-red-50 text-red-500"
                      : "border-[#E8E2DB] text-[#1A1A1A] hover:border-[#C9A96E]"
                  }`}
                >
                  <Heart size={20} className={liked ? "fill-red-500" : ""} />
                </button>
              </div>
            </div>

            {/* Trust Badges — Amazon-style */}
            <div className="grid grid-cols-2 gap-3 mb-8">
              <div className="flex items-center gap-2 p-3 bg-white border border-[#E8E2DB]">
                <Truck size={16} className="text-[#C9A96E]" />
                <span className="text-xs text-[#6B6560]">{t('productPage.freeShipping')}</span>
              </div>
              <div className="flex items-center gap-2 p-3 bg-white border border-[#E8E2DB]">
                <Shield size={16} className="text-[#C9A96E]" />
                <span className="text-xs text-[#6B6560]">{t('productPage.authenticityGuaranteed')}</span>
              </div>
              <div className="flex items-center gap-2 p-3 bg-white border border-[#E8E2DB]">
                <RotateCcw size={16} className="text-[#C9A96E]" />
                <span className="text-xs text-[#6B6560]">{t('productPage.returns30')}</span>
              </div>
              <div className="flex items-center gap-2 p-3 bg-white border border-[#E8E2DB]">
                <Check size={16} className="text-[#C9A96E]" />
                <span className="text-xs text-[#6B6560]">{t('productPage.secureCheckout')}</span>
              </div>
            </div>

            {/* Seller Info — Jumia "Sold by · Official Store" trust card */}
            {product.store && (
              <div className="p-4 bg-white border border-[#E8E2DB]">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {product.store.logo ? (
                      <Image src={product.store.logo} alt="" width={40} height={40} className="size-10 rounded-full object-cover" />
                    ) : (
                      <div className="flex size-10 items-center justify-center rounded-full bg-[#1A1A1A] text-sm font-semibold text-white">
                        {(product.store.name || "S").charAt(0)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs text-[#9B9590] mb-0.5">{t('productPage.soldBy')}</p>
                      <p className="flex items-center gap-1.5 text-sm font-medium text-[#1A1A1A] truncate">
                        {product.store.name}
                        {product.store.halalCertified && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#C9A96E]/10 px-2 py-0.5 text-[10px] font-semibold text-[#A88B52]">
                            <BadgeCheck size={11} />
                            {t('product.halalCertified')}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <Link
                    href={product.store.username ? `/shop/${product.store.username}` : `/store/${product.store.id}`}
                    className="shrink-0 text-xs text-[#C9A96E] hover:text-[#A88B52] transition">{t('productPage.viewStore')}
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ─── Tabs — Editorial Content ─── */}
      <section className="border-t border-[#E8E2DB]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          {/* Tab Navigation */}
          <div className="flex border-b border-[#E8E2DB]">
            {["description", "specifications", "reviews", "shipping"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-4 text-sm font-medium tracking-wide uppercase transition border-b-2 ${
                  activeTab === tab
                    ? "text-[#1A1A1A] border-[#C9A96E]"
                    : "text-[#9B9590] border-transparent hover:text-[#1A1A1A]"
                }`}
              >
                {t('productPage.tab' + tab[0].toUpperCase() + tab.slice(1))}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="py-8 max-w-3xl">
            {activeTab === "description" && (
              <div className="prose prose-lg max-w-none">
                <p className="text-[#2D2D2D] leading-relaxed whitespace-pre-line">
                  {product.description || t('productPage.noDescription')}
                </p>
              </div>
            )}
            {activeTab === "specifications" && (
              <div className="space-y-4">
                {(product.specifications || []).map((spec, i) => (
                  <div key={i} className="flex py-3 border-b border-[#E8E2DB]">
                    <span className="w-1/3 text-sm text-[#9B9590]">{spec.label}</span>
                    <span className="w-2/3 text-sm text-[#1A1A1A]">{spec.value}</span>
                  </div>
                ))}
                {(!product.specifications || product.specifications.length === 0) && (
                  <p className="text-[#9B9590]">{t('productPage.noSpecifications')}</p>
                )}
              </div>
            )}
            {activeTab === "reviews" && (
              <div className="space-y-6">
                {(product.reviews || []).map((review, i) => (
                  <div key={i} className="p-6 bg-white border border-[#E8E2DB]">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-[#1A1A1A] flex items-center justify-center text-white text-sm font-medium">
                        {(review.user?.name || "U").charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#1A1A1A]">{review.user?.name}</p>
                        <div className="flex items-center gap-1">
                          {Array(5).fill(null).map((_, idx) => (
                            <Star
                              key={idx}
                              size={12}
                              className={idx < review.rating ? "text-[#C9A96E] fill-[#C9A96E]" : "text-[#E8E2DB]"}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-[#6B6560] leading-relaxed">{review.text}</p>
                  </div>
                ))}
                {(!product.reviews || product.reviews.length === 0) && (
                  <p className="text-[#9B9590]">{t('productPage.noReviews')}</p>
                )}
              </div>
            )}
            {activeTab === "shipping" && (
              <div className="space-y-4 text-[#2D2D2D]">
                <p>{t('productPage.shippingOptions')}</p>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <Truck size={18} className="text-[#C9A96E] mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium">{t('productPage.standardShipping')}</p>
                      <p className="text-sm text-[#6B6560]">{t('productPage.standardNote')} <CurrencyAmount amount={FREE_DELIVERY_THRESHOLD} /></p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <Truck size={18} className="text-[#C9A96E] mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium">{t('productPage.expressShipping')}</p>
                      <p className="text-sm text-[#6B6560]">{t('productPage.expressNote')} <CurrencyAmount amount={150} /></p>
                    </div>
                  </li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ─── Related Products — same shared ProductCard as the shop ─── */}
      {relatedProducts.length > 0 && (
        <section className="border-t border-[#E8E2DB] py-16">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="mb-8">
              <p className="text-editorial mb-2 text-[#C9A96E]">{t('productPage.youMayAlsoLikeEyebrow')}</p>
              <h2 className="font-display text-2xl text-[#1A1A1A] font-medium sm:text-3xl">
                {t('productPage.youMayAlsoLike')}
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
              {relatedProducts.map((item) => (
                <ProductCard key={item.id} product={item} />
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
