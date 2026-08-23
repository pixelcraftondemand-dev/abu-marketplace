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

export default function ProductDetailPage({ product: serverProduct }) {
  const { productId } = useParams();
  const dispatch = useDispatch();
  const router = useRouter();
  const { t } = useTranslation();
  const wishlistItems = useSelector((state) => state.wishlist.items);

  const [product, setProduct] = useState(serverProduct || null);
  const [loading, setLoading] = useState(!serverProduct);
  const [loadError, setLoadError] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [liked, setLiked] = useState(false);
  const [activeTab, setActiveTab] = useState("description");

  // Only fetch client-side on retry (or if no server data was provided)
  useEffect(() => {
    if (serverProduct && retryCount === 0) return;
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
  }, [productId, retryCount, serverProduct]);

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
      <main className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center px-6">
        <div className="max-w-md w-full text-center py-20">
          <h1 className="font-display text-2xl text-[var(--text-primary)] font-medium mb-2">
            {t('productPage.productNotFound')}
          </h1>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-8">
            {t('productPage.notFoundText')}
          </p>
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 bg-[var(--text-primary)] text-[var(--bg-primary)] px-8 py-3.5 text-sm font-medium tracking-wide uppercase transition hover:bg-[var(--accent)]"
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
      <main className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center px-6">
        <div className="max-w-md w-full text-center py-20">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--bg-muted)]">
            <RotateCcw size={28} className="text-[var(--accent)]" />
          </div>
          <h1 className="font-display text-2xl text-[var(--text-primary)] font-medium mb-2">
            {t('productPage.loadFailed')}
          </h1>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-8">
            {t('productPage.loadFailedText')}
          </p>
          <button
            onClick={() => setRetryCount((n) => n + 1)}
            className="inline-flex items-center gap-2 bg-[var(--text-primary)] text-[var(--bg-primary)] px-8 py-3.5 text-sm font-medium tracking-wide uppercase transition hover:bg-[var(--accent)]"
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
    <main className="min-h-screen bg-[var(--bg-primary)]">
      {/* Breadcrumb — Amazon-style efficiency */}
      <div className="border-b border-[var(--border-primary)]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-3">
          <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
            <Link href="/" className="hover:text-[var(--accent)] transition">{t('productPage.home')}</Link>
            <ChevronRight size={12} />
            <Link href="/shop" className="hover:text-[var(--accent)] transition">{t('productPage.shop')}</Link>
            <ChevronRight size={12} />
            <Link href={`/shop?category=${product.category}`} className="hover:text-[var(--accent)] transition">
              {product.category}
            </Link>
            <ChevronRight size={12} />
            <span className="text-[var(--text-primary)]">{product.name}</span>
          </div>
        </div>
      </div>

      {/* ─── Product Hero — Asymmetric Magazine Layout ─── */}
      <section className="max-w-7xl mx-auto px-6 lg:px-8 py-8 lg:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16">
          {/* Left — Images */}
          <div className="space-y-4">
            {/* Main Image */}
            <div className="relative aspect-square overflow-hidden bg-[var(--bg-muted)]">
              <Image
                src={images[selectedImage]}
                alt={product.name}
                fill
                className="object-cover"
                priority
              />
              {product.badge && (
                <span className="absolute top-4 left-4 px-3 py-1.5 bg-[var(--accent)] text-white text-[10px] font-semibold tracking-widest uppercase">
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
                    className={`relative w-20 h-20 overflow-hidden bg-[var(--bg-muted)] border-2 transition ${
                      selectedImage === i ? "border-[var(--accent)]" : "border-transparent"
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
            <p className="text-editorial text-[var(--accent)] mb-2">{product.category}</p>
            <h1 className="font-display text-3xl md:text-4xl text-[var(--text-primary)] font-medium leading-tight mb-4">
              {product.name}
            </h1>

            {/* Rating — Jumia-style stars + review count */}
            <div className="flex items-center gap-3 mb-6">
              <div className="flex items-center gap-1">
                {Array(5).fill(null).map((_, i) => (
                  <Star
                    key={i}
                    size={14}
                    className={i < Math.floor(product.rating || 0) ? "text-[var(--accent)] fill-[var(--accent)]" : "text-[var(--border-primary)]"}
                  />
                ))}
              </div>
              <span className="text-sm text-[var(--text-secondary)]">
                {Number(product.rating || 0).toFixed(1)} ({t('productPage.reviews', { count: product.reviewCount || 0 })})
              </span>
            </div>

            {/* Price — discounted price vs crossed-out list price */}
            <div className="flex items-baseline gap-3 mb-6">
              <span className="font-display text-3xl text-[var(--text-primary)] font-medium">
                <CurrencyAmount amount={product.price} />
              </span>
              {(product.originalPrice || product.mrp) && (product.originalPrice || product.mrp) > product.price && (
                <span className="text-lg text-[var(--text-tertiary)] line-through">
                  <CurrencyAmount amount={product.originalPrice || product.mrp} />
                </span>
              )}
              {getProductDiscount(product) > 0 && (
                <span className="px-2 py-1 bg-[var(--text-primary)] text-[var(--bg-primary)] text-xs font-medium">
                  {t('productPage.percentOff', { percent: getProductDiscount(product) })}
                </span>
              )}
            </div>

            {/* Short Description */}
            <p className="text-[var(--text-secondary)] leading-relaxed mb-8">
              {product.shortDescription || product.description?.slice(0, 200)}
            </p>

            {/* Quantity + Actions */}
            <div className="space-y-4 mb-8">
              {/* Quantity */}
              <div className="flex items-center gap-4">
                <span className="text-sm text-[var(--text-secondary)]">{t('productPage.quantity')}</span>
                <div className="flex items-center border border-[var(--border-primary)]">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="p-3 hover:bg-[var(--bg-muted)] transition"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="w-12 text-center text-sm font-medium">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="p-3 hover:bg-[var(--bg-muted)] transition"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>

              {/* Buttons — Jumia-style Add to Cart + Buy Now split */}
              <div className="flex gap-3">
                <button
                  onClick={handleAddToCart}
                  className="flex-1 border-2 border-[var(--text-primary)] py-4 text-sm font-medium uppercase tracking-wide transition hover:bg-[var(--text-primary)] hover:text-[var(--bg-primary)]"
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
                      : "border-[var(--border-primary)] text-[var(--text-primary)] hover:border-[var(--accent)]"
                  }`}
                >
                  <Heart size={20} className={liked ? "fill-red-500" : ""} />
                </button>
              </div>
            </div>

            {/* Trust Badges — Amazon-style */}
            <div className="grid grid-cols-2 gap-3 mb-8">
              <div className="flex items-center gap-2 p-3 bg-[var(--bg-surface)] border border-[var(--border-primary)]">
                <Truck size={16} className="text-[var(--accent)]" />
                <span className="text-xs text-[var(--text-secondary)]">{t('productPage.freeShipping')}</span>
              </div>
              <div className="flex items-center gap-2 p-3 bg-[var(--bg-surface)] border border-[var(--border-primary)]">
                <Shield size={16} className="text-[var(--accent)]" />
                <span className="text-xs text-[var(--text-secondary)]">{t('productPage.authenticityGuaranteed')}</span>
              </div>
              <div className="flex items-center gap-2 p-3 bg-[var(--bg-surface)] border border-[var(--border-primary)]">
                <RotateCcw size={16} className="text-[var(--accent)]" />
                <span className="text-xs text-[var(--text-secondary)]">{t('productPage.returns30')}</span>
              </div>
              <div className="flex items-center gap-2 p-3 bg-[var(--bg-surface)] border border-[var(--border-primary)]">
                <Check size={16} className="text-[var(--accent)]" />
                <span className="text-xs text-[var(--text-secondary)]">{t('productPage.secureCheckout')}</span>
              </div>
            </div>

            {/* Seller Info — Jumia "Sold by · Official Store" trust card */}
            {product.store && (
              <div className="p-4 bg-[var(--bg-surface)] border border-[var(--border-primary)]">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {product.store.logo ? (
                      <Image src={product.store.logo} alt="" width={40} height={40} className="size-10 rounded-full object-cover" />
                    ) : (
                      <div className="flex size-10 items-center justify-center rounded-full bg-[var(--text-primary)] text-sm font-semibold text-[var(--bg-primary)]">
                        {(product.store.name || "S").charAt(0)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs text-[var(--text-tertiary)] mb-0.5">{t('productPage.soldBy')}</p>
                      <p className="flex items-center gap-1.5 text-sm font-medium text-[var(--text-primary)] truncate">
                        {product.store.name}
                        {product.store.halalCertified && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--accent)]/10 px-2 py-0.5 text-[10px] font-semibold text-[var(--accent)]">
                            <BadgeCheck size={11} />
                            {t('product.halalCertified')}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <Link
                    href={product.store.username ? `/shop/${product.store.username}` : `/store/${product.store.id}`}
                    className="shrink-0 text-xs text-[var(--accent)] hover:text-[var(--accent)] transition">{t('productPage.viewStore')}
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ─── Tabs — Editorial Content ─── */}
      <section className="border-t border-[var(--border-primary)]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          {/* Tab Navigation */}
          <div className="flex border-b border-[var(--border-primary)]">
            {["description", "specifications", "reviews", "shipping"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-4 text-sm font-medium tracking-wide uppercase transition border-b-2 ${
                  activeTab === tab
                    ? "text-[var(--text-primary)] border-[var(--accent)]"
                    : "text-[var(--text-tertiary)] border-transparent hover:text-[var(--text-primary)]"
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
                <p className="text-[var(--text-primary)] leading-relaxed whitespace-pre-line">
                  {product.description || t('productPage.noDescription')}
                </p>
              </div>
            )}
            {activeTab === "specifications" && (
              <div className="space-y-4">
                {(product.specifications || []).map((spec, i) => (
                  <div key={i} className="flex py-3 border-b border-[var(--border-primary)]">
                    <span className="w-1/3 text-sm text-[var(--text-tertiary)]">{spec.label}</span>
                    <span className="w-2/3 text-sm text-[var(--text-primary)]">{spec.value}</span>
                  </div>
                ))}
                {(!product.specifications || product.specifications.length === 0) && (
                  <p className="text-[var(--text-tertiary)]">{t('productPage.noSpecifications')}</p>
                )}
              </div>
            )}
            {activeTab === "reviews" && (
              <div className="space-y-6">
                {(product.reviews || []).map((review, i) => (
                  <div key={i} className="p-6 bg-[var(--bg-surface)] border border-[var(--border-primary)]">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-[var(--text-primary)] flex items-center justify-center text-[var(--bg-primary)] text-sm font-medium">
                        {(review.user?.name || "U").charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[var(--text-primary)]">{review.user?.name}</p>
                        <div className="flex items-center gap-1">
                          {Array(5).fill(null).map((_, idx) => (
                            <Star
                              key={idx}
                              size={12}
                              className={idx < review.rating ? "text-[var(--accent)] fill-[var(--accent)]" : "text-[var(--border-primary)]"}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{review.text}</p>
                  </div>
                ))}
                {(!product.reviews || product.reviews.length === 0) && (
                  <p className="text-[var(--text-tertiary)]">{t('productPage.noReviews')}</p>
                )}
              </div>
            )}
            {activeTab === "shipping" && (
              <div className="space-y-4 text-[var(--text-secondary)]">
                <p>{t('productPage.shippingOptions')}</p>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <Truck size={18} className="text-[var(--accent)] mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium">{t('productPage.standardShipping')}</p>
                      <p className="text-sm text-[var(--text-secondary)]">{t('productPage.standardNote')} <CurrencyAmount amount={FREE_DELIVERY_THRESHOLD} /></p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <Truck size={18} className="text-[var(--accent)] mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium">{t('productPage.expressShipping')}</p>
                      <p className="text-sm text-[var(--text-secondary)]">{t('productPage.expressNote')} <CurrencyAmount amount={150} /></p>
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
        <section className="border-t border-[var(--border-primary)] py-16">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="mb-8">
              <p className="text-editorial mb-2 text-[var(--accent)]">{t('productPage.youMayAlsoLikeEyebrow')}</p>
              <h2 className="font-display text-2xl text-[var(--text-primary)] font-medium sm:text-3xl">
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
