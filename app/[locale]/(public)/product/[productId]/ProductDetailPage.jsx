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
  ShoppingBag,
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
  const [addedToCart, setAddedToCart] = useState(false);

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
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2500);
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

  if (notFound) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
        <div className="max-w-md w-full text-center py-20">
          <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-5">
            <ShoppingBag size={32} className="text-gray-300" />
          </div>
          <h1 className="text-2xl text-gray-900 font-semibold mb-2">
            {t('productPage.productNotFound')}
          </h1>
          <p className="text-sm text-gray-500 leading-relaxed mb-8">
            {t('productPage.notFoundText')}
          </p>
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 bg-[var(--color-primary)] text-white px-8 py-3.5 text-sm font-semibold rounded-xl transition-all duration-200 hover:bg-[var(--color-primary-hover)] hover:shadow-lg hover:shadow-blue-500/20 hover:-translate-y-0.5 active:translate-y-0"
          >
            {t('productPage.continueShopping')}
          </Link>
        </div>
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
        <div className="max-w-md w-full text-center py-20">
          <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-5">
            <RotateCcw size={32} className="text-gray-400" />
          </div>
          <h1 className="text-2xl text-gray-900 font-semibold mb-2">
            {t('productPage.loadFailed')}
          </h1>
          <p className="text-sm text-gray-500 leading-relaxed mb-8">
            {t('productPage.loadFailedText')}
          </p>
          <button
            onClick={() => setRetryCount((n) => n + 1)}
            className="inline-flex items-center gap-2 bg-[var(--color-primary)] text-white px-8 py-3.5 text-sm font-semibold rounded-xl transition-all duration-200 hover:bg-[var(--color-primary-hover)] hover:shadow-lg hover:shadow-blue-500/20 hover:-translate-y-0.5 active:translate-y-0"
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

  const reviewDist = [0, 0, 0, 0, 0];
  (product.reviews || []).forEach((r) => {
    if (r.rating >= 1 && r.rating <= 5) reviewDist[r.rating - 1]++;
  });
  const totalReviews = product.reviews?.length || 0;

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-3">
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <Link href="/" className="hover:text-[var(--color-primary)] transition-colors duration-200">{t('productPage.home')}</Link>
            <ChevronRight size={10} className="text-gray-300" />
            <Link href="/shop" className="hover:text-[var(--color-primary)] transition-colors duration-200">{t('productPage.shop')}</Link>
            <ChevronRight size={10} className="text-gray-300" />
            <Link href={`/shop?category=${product.category}`} className="hover:text-[var(--color-primary)] transition-colors duration-200 capitalize">
              {product.category}
            </Link>
            <ChevronRight size={10} className="text-gray-300" />
            <span className="text-gray-700 truncate max-w-[200px] font-medium">{product.name}</span>
          </div>
        </div>
      </div>

      {/* Product Hero */}
      <section className="max-w-7xl mx-auto px-4 lg:px-8 py-6 lg:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 lg:gap-10">
          {/* Left — Image Gallery */}
          <div className="space-y-3">
            {/* Main Image */}
            <div className="relative aspect-square overflow-hidden bg-white rounded-2xl border border-gray-100 shadow-sm group/img">
              <Image
                src={images[selectedImage]}
                alt={product.name}
                fill
                className="object-contain p-6 transition-transform duration-500 ease-out group-hover/img:scale-[1.03]"
                priority
              />
              {getProductDiscount(product) > 0 && (
                <span className="absolute top-4 left-4 px-2.5 py-1 bg-red-500 text-white text-xs font-bold rounded-lg shadow-sm">
                  -{getProductDiscount(product)}%
                </span>
              )}
            </div>
            {/* Thumbnails */}
            {images.length > 1 && (
              <div className="flex gap-2.5 overflow-x-auto pb-2">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(i)}
                    className={`relative w-[72px] h-[72px] shrink-0 overflow-hidden bg-white rounded-xl border-2 transition-all duration-200 ${
                      selectedImage === i
                        ? "border-[var(--color-primary)] shadow-md shadow-blue-500/10 scale-105"
                        : "border-gray-100 hover:border-gray-200 hover:shadow-sm"
                    }`}
                  >
                    <Image src={img} alt="" fill className="object-contain p-1.5" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right — Buy Box */}
          <div className="lg:sticky lg:top-6 self-start">
            <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
              {/* Category */}
              <p className="text-xs text-[var(--color-primary)] font-semibold uppercase tracking-wide mb-2">{product.category}</p>
              
              {/* Title */}
              <h1 className="text-xl lg:text-2xl text-gray-900 font-semibold leading-snug mb-3 tracking-tight">
                {product.name}
              </h1>

              {/* Rating */}
              <div className="flex items-center gap-2 mb-4 pb-4 border-b border-gray-100">
                <div className="flex items-center gap-0.5">
                  {Array(5).fill(null).map((_, i) => (
                    <Star
                      key={i}
                      size={14}
                      className={i < Math.floor(product.rating || 0) ? "text-amber-400 fill-amber-400" : "text-gray-200"}
                    />
                  ))}
                </div>
                <span className="text-sm font-semibold text-gray-800">{Number(product.rating || 0).toFixed(1)}</span>
                <span className="text-xs text-gray-400">({product.reviewCount || 0} reviews)</span>
              </div>

              {/* Price */}
              <div className="mb-5 pb-5 border-b border-gray-100">
                <div className="flex items-baseline gap-3">
                  <span className="text-3xl font-bold text-gray-900 tabular-nums tracking-tight">
                    <CurrencyAmount amount={product.price} />
                  </span>
                  {(product.originalPrice || product.mrp) && (product.originalPrice || product.mrp) > product.price && (
                    <span className="text-base text-gray-400 line-through tabular-nums">
                      <CurrencyAmount amount={product.originalPrice || product.mrp} />
                    </span>
                  )}
                  {getProductDiscount(product) > 0 && (
                    <span className="px-2 py-0.5 bg-red-50 text-red-600 text-xs font-bold rounded-md">
                      Save {getProductDiscount(product)}%
                    </span>
                  )}
                </div>
                {getProductDiscount(product) > 0 && (
                  <p className="text-xs text-amber-600 font-medium mt-1.5 flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-amber-400" />
                    Lowest price in 30 days
                  </p>
                )}
              </div>

              {/* Stock Status */}
              <div className="mb-4">
                {product.inStock ? (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-100">
                      <Check size={12} className="text-green-600" />
                    </span>
                    <span className="text-green-700 font-semibold">In Stock</span>
                    {product.stock <= 5 && product.stock > 0 && (
                      <span className="text-amber-600 text-xs font-semibold bg-amber-50 px-2 py-0.5 rounded-full">Only {product.stock} left</span>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-red-600 font-semibold">Out of Stock</p>
                )}
              </div>

              {/* Delivery Estimate */}
              <div className="flex items-center gap-3 mb-5 p-3 bg-blue-50/50 rounded-xl border border-blue-100/50">
                <Truck size={18} className="text-[var(--color-primary)] shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-gray-800">Delivery to Freetown</p>
                  <p className="text-xs text-gray-500 mt-0.5">Est. 2-3 business days · Free over <CurrencyAmount amount={FREE_DELIVERY_THRESHOLD} /></p>
                </div>
              </div>

              {/* Quantity */}
              <div className="mb-5">
                <span className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-2 block">Quantity</span>
                <div className="inline-flex items-center border border-gray-200 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="p-3 hover:bg-gray-50 transition-colors duration-150 active:bg-gray-100"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="w-12 text-center text-sm font-bold tabular-nums text-gray-900">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="p-3 hover:bg-gray-50 transition-colors duration-150 active:bg-gray-100"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2.5 mb-5">
                <button
                  onClick={handleAddToCart}
                  disabled={!product.inStock}
                  className={`w-full py-3.5 text-sm font-semibold uppercase tracking-wide rounded-xl transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                    addedToCart
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-900 text-white hover:bg-gray-800 hover:shadow-lg hover:shadow-gray-900/20 hover:-translate-y-0.5 active:translate-y-0'
                  }`}
                >
                  {addedToCart ? (
                    <>
                      <Check size={16} strokeWidth={3} />
                      Added to Cart
                    </>
                  ) : (
                    <>
                      <ShoppingBag size={16} />
                      {t('productPage.addToCart')}
                    </>
                  )}
                </button>
                <button
                  onClick={handleBuyNow}
                  disabled={!product.inStock}
                  className="w-full py-3.5 bg-[var(--color-primary)] text-white text-sm font-semibold uppercase tracking-wide rounded-xl transition-all duration-200 hover:bg-[var(--color-primary-hover)] hover:shadow-lg hover:shadow-blue-500/25 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Zap size={16} />
                  {t('productPage.buyNow')}
                </button>
                <button
                  onClick={handleAddToWishlist}
                  aria-label="Add to wishlist"
                  className={`w-full py-3 border text-sm font-medium rounded-xl transition-all duration-200 flex items-center justify-center gap-2 ${
                    liked
                      ? "border-red-200 bg-red-50 text-red-500 hover:bg-red-100"
                      : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <Heart size={16} className={liked ? "fill-red-500" : ""} />
                  {liked ? "Saved to Wishlist" : "Add to Wishlist"}
                </button>
              </div>

              {/* Trust Badges */}
              <div className="grid grid-cols-2 gap-2.5 pt-4 border-t border-gray-100">
                {[
                  { icon: Shield, text: "Secure checkout", color: "text-green-600" },
                  { icon: RotateCcw, text: "7-day easy returns", color: "text-[var(--color-primary)]" },
                  { icon: Check, text: "Quality-checked seller", color: "text-green-600" },
                  { icon: Truck, text: "Free delivery", color: "text-[var(--color-primary)]" },
                ].map(({ icon: Icon, text, color }) => (
                  <div key={text} className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Icon size={13} className={`${color} shrink-0`} />
                    <span>{text}</span>
                  </div>
                ))}
              </div>

              {/* Seller Info */}
              {product.store && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {product.store.logo ? (
                        <Image src={product.store.logo} alt="" width={40} height={40} className="w-10 h-10 rounded-full object-cover border border-gray-100" />
                      ) : (
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-sm font-bold text-white rounded-full">
                          {(product.store.name || "S").charAt(0)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">Sold by</p>
                        <p className="flex items-center gap-1.5 text-sm font-semibold text-gray-800 truncate">
                          {product.store.name}
                          {product.store.halalCertified && (
                            <BadgeCheck size={14} className="text-green-500 shrink-0" />
                          )}
                        </p>
                      </div>
                    </div>
                    <Link
                      href={product.store.username ? `/shop/${product.store.username}` : `/store/${product.store.id}`}
                      className="shrink-0 text-xs text-[var(--color-primary)] hover:underline font-semibold"
                    >
                      View Store
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* About this item card */}
            <div className="mt-4 bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-800 mb-2">About this item</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                {product.shortDescription || product.description?.slice(0, 300)}
                {(product.shortDescription?.length > 300 || (!product.shortDescription && product.description?.length > 300)) && "..."}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <section className="border-t border-gray-100 bg-white mt-4">
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <div className="flex border-b border-gray-100 overflow-x-auto no-scrollbar">
            {["description", "specifications", "reviews", "shipping"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-4 text-sm font-medium transition-all duration-200 border-b-2 whitespace-nowrap ${
                  activeTab === tab
                    ? "text-[var(--color-primary)] border-[var(--color-primary)]"
                    : "text-gray-400 border-transparent hover:text-gray-700 hover:border-gray-200"
                }`}
              >
                {t('productPage.tab' + tab[0].toUpperCase() + tab.slice(1))}
                {tab === "reviews" && totalReviews > 0 && (
                  <span className="ml-1.5 text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">({totalReviews})</span>
                )}
              </button>
            ))}
          </div>

          <div className="py-8 max-w-3xl">
            {activeTab === "description" && (
              <div>
                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                  {product.description || t('productPage.noDescription')}
                </p>
              </div>
            )}
            {activeTab === "specifications" && (
              <div className="rounded-xl border border-gray-100 overflow-hidden">
                {(product.specifications || []).map((spec, i) => (
                  <div key={i} className={`flex py-3 px-4 text-sm ${i % 2 === 0 ? 'bg-gray-50' : 'bg-white'} border-b border-gray-50 last:border-0`}>
                    <span className="w-1/3 text-gray-400">{spec.label}</span>
                    <span className="w-2/3 text-gray-800 font-medium">{spec.value}</span>
                  </div>
                ))}
                {(!product.specifications || product.specifications.length === 0) && (
                  <p className="text-sm text-gray-400 p-4">{t('productPage.noSpecifications')}</p>
                )}
              </div>
            )}
            {activeTab === "reviews" && (
              <div>
                {/* Review Breakdown */}
                {totalReviews > 0 && (
                  <div className="mb-8 p-5 bg-gray-50 rounded-2xl border border-gray-100">
                    <div className="flex items-center gap-8">
                      <div className="text-center">
                        <p className="text-4xl font-bold text-gray-900 tabular-nums">{Number(product.rating || 0).toFixed(1)}</p>
                        <div className="flex items-center gap-0.5 my-1.5 justify-center">
                          {Array(5).fill(null).map((_, i) => (
                            <Star key={i} size={14} className={i < Math.floor(product.rating || 0) ? "text-amber-400 fill-amber-400" : "text-gray-200"} />
                          ))}
                        </div>
                        <p className="text-xs text-gray-500 font-medium">{totalReviews} reviews</p>
                      </div>
                      <div className="flex-1 space-y-1.5">
                        {[5, 4, 3, 2, 1].map((star) => (
                          <div key={star} className="flex items-center gap-2.5">
                            <span className="text-xs text-gray-500 w-10 font-medium">{star} star</span>
                            <div className="flex-1 h-2.5 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-amber-400 rounded-full transition-all duration-500"
                                style={{ width: totalReviews > 0 ? `${(reviewDist[star - 1] / totalReviews) * 100}%` : '0%' }}
                              />
                            </div>
                            <span className="text-xs text-gray-400 w-8 text-right tabular-nums">{reviewDist[star - 1]}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Individual Reviews */}
                <div className="space-y-4">
                  {(product.reviews || []).map((review, i) => (
                    <div key={i} className="p-5 bg-white border border-gray-100 rounded-2xl hover:shadow-sm transition-shadow duration-200">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold rounded-full">
                          {(review.user?.name || "U").charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-800">{review.user?.name}</p>
                          <div className="flex items-center gap-0.5">
                            {Array(5).fill(null).map((_, idx) => (
                              <Star
                                key={idx}
                                size={11}
                                className={idx < review.rating ? "text-amber-400 fill-amber-400" : "text-gray-200"}
                              />
                            ))}
                          </div>
                        </div>
                        <span className="ml-auto text-xs text-green-600 font-semibold flex items-center gap-1 bg-green-50 px-2 py-1 rounded-full">
                          <Check size={10} strokeWidth={3} /> Verified
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 leading-relaxed">{review.text}</p>
                    </div>
                  ))}
                  {(!product.reviews || product.reviews.length === 0) && (
                    <div className="text-center py-12">
                      <p className="text-sm text-gray-400">{t('productPage.noReviews')}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
            {activeTab === "shipping" && (
              <div className="space-y-3 text-sm">
                <p className="text-gray-800 font-semibold">{t('productPage.shippingOptions')}</p>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                      <Truck size={16} className="text-[var(--color-primary)]" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">{t('productPage.standardShipping')}</p>
                      <p className="text-gray-500 mt-0.5">{t('productPage.standardNote')} <CurrencyAmount amount={FREE_DELIVERY_THRESHOLD} /></p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center shrink-0">
                      <Zap size={16} className="text-orange-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">{t('productPage.expressShipping')}</p>
                      <p className="text-gray-500 mt-0.5">{t('productPage.expressNote')} <CurrencyAmount amount={150} /></p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <section className="border-t border-gray-100 py-10 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 lg:px-8">
            <div className="mb-6">
              <h2 className="text-lg font-bold text-gray-900 tracking-tight">
                {t('productPage.youMayAlsoLike')}
              </h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
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
