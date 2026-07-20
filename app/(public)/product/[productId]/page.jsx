"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import toast from "react-hot-toast";
import Image from "next/image";
import Link from "next/link";
import { useDispatch } from "react-redux";
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
  ArrowLeft,
} from "lucide-react";
import Loading from "@/components/Loading";

export default function ProductDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const dispatch = useDispatch();
  const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || "SLe";

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [liked, setLiked] = useState(false);
  const [activeTab, setActiveTab] = useState("description");

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const res = await axios.get(`/api/products/${id}`);
        setProduct(res.data.product);
      } catch (err) {
        toast.error("Product not found");
        router.push("/shop");
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id, router]);

  const handleAddToCart = () => {
    dispatch({ type: "cart/add", payload: { ...product, quantity } });
    toast.success("Added to cart");
  };

  const handleAddToWishlist = () => {
    dispatch({ type: "wishlist/add", payload: product });
    setLiked(true);
    toast.success("Added to wishlist");
  };

  if (loading) return <Loading />;
  if (!product) return null;

  const images = product.images || [product.image];
  const relatedProducts = product.related || [];

  return (
    <main className="min-h-screen bg-[#FAF8F5]">
      {/* Breadcrumb — Amazon-style efficiency */}
      <div className="border-b border-[#E8E2DB]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-3">
          <div className="flex items-center gap-2 text-xs text-[#9B9590]">
            <Link href="/" className="hover:text-[#C9A96E] transition">Home</Link>
            <ChevronRight size={12} />
            <Link href="/shop" className="hover:text-[#C9A96E] transition">Shop</Link>
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

            {/* Rating */}
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
                {product.rating} ({product.reviewCount || 0} reviews)
              </span>
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-3 mb-6">
              <span className="font-display text-3xl text-[#1A1A1A] font-medium">
                {currency}{product.price?.toLocaleString()}
              </span>
              {product.originalPrice && (
                <span className="text-lg text-[#9B9590] line-through">
                  {currency}{product.originalPrice?.toLocaleString()}
                </span>
              )}
              {product.originalPrice && (
                <span className="px-2 py-1 bg-[#1A1A1A] text-white text-xs font-medium">
                  {Math.round((1 - product.price / product.originalPrice) * 100)}% OFF
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
                <span className="text-sm text-[#6B6560]">Quantity</span>
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

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleAddToCart}
                  className="flex-1 btn-luxury py-4"
                >
                  <span>Add to Cart</span>
                </button>
                <button
                  onClick={handleAddToWishlist}
                  className={`p-4 border transition ${
                    liked
                      ? "border-red-200 bg-red-50 text-red-500"
                      : "border-[#E8E2DB] text-[#1A1A1A] hover:border-[#C9A96E]"
                  }`}
                >
                  <Heart size={20} className={liked ? "fill-red-500" : ""} />
                </button>
                <button className="p-4 border border-[#E8E2DB] text-[#1A1A1A] hover:border-[#C9A96E] transition">
                  <Share2 size={20} />
                </button>
              </div>
            </div>

            {/* Trust Badges — Amazon-style */}
            <div className="grid grid-cols-2 gap-3 mb-8">
              <div className="flex items-center gap-2 p-3 bg-white border border-[#E8E2DB]">
                <Truck size={16} className="text-[#C9A96E]" />
                <span className="text-xs text-[#6B6560]">Free Shipping</span>
              </div>
              <div className="flex items-center gap-2 p-3 bg-white border border-[#E8E2DB]">
                <Shield size={16} className="text-[#C9A96E]" />
                <span className="text-xs text-[#6B6560]">Authenticity Guaranteed</span>
              </div>
              <div className="flex items-center gap-2 p-3 bg-white border border-[#E8E2DB]">
                <RotateCcw size={16} className="text-[#C9A96E]" />
                <span className="text-xs text-[#6B6560]">30-Day Returns</span>
              </div>
              <div className="flex items-center gap-2 p-3 bg-white border border-[#E8E2DB]">
                <Check size={16} className="text-[#C9A96E]" />
                <span className="text-xs text-[#6B6560]">Secure Checkout</span>
              </div>
            </div>

            {/* Seller Info */}
            {product.store && (
              <div className="p-4 bg-white border border-[#E8E2DB]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-[#9B9590] mb-1">Sold by</p>
                    <p className="text-sm font-medium text-[#1A1A1A]">{product.store.name}</p>
                  </div>
                  <Link
                    href={`/store/${product.store.id}`}
                    className="text-xs text-[#C9A96E] hover:text-[#A88B52] transition"
                  >
                    View Store
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
                {tab}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="py-8 max-w-3xl">
            {activeTab === "description" && (
              <div className="prose prose-lg max-w-none">
                <p className="text-[#2D2D2D] leading-relaxed whitespace-pre-line">
                  {product.description || "No description available."}
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
                  <p className="text-[#9B9590]">No specifications available.</p>
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
                  <p className="text-[#9B9590]">No reviews yet. Be the first to review!</p>
                )}
              </div>
            )}
            {activeTab === "shipping" && (
              <div className="space-y-4 text-[#2D2D2D]">
                <p>We offer the following shipping options:</p>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <Truck size={18} className="text-[#C9A96E] mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium">Standard Shipping</p>
                      <p className="text-sm text-[#6B6560]">5-7 business days — Free on orders over SLe 500</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <Truck size={18} className="text-[#C9A96E] mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium">Express Shipping</p>
                      <p className="text-sm text-[#6B6560]">2-3 business days — SLe 150</p>
                    </div>
                  </li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ─── Related Products — Editorial Grid ─── */}
      {relatedProducts.length > 0 && (
        <section className="border-t border-[#E8E2DB] py-16">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <h2 className="font-display text-2xl text-[#1A1A1A] font-medium mb-8">
              You May Also Like
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {relatedProducts.map((item) => (
                <Link
                  key={item.id}
                  href={`/product/${item.id}`}
                  className="group product-discovery"
                >
                  <div className="relative aspect-[3/4] overflow-hidden bg-[#F5F0EB]">
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      className="object-cover product-discovery-img"
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="font-display text-[15px] text-[#1A1A1A] group-hover:text-[#C9A96E] transition-colors">
                      {item.name}
                    </h3>
                    <p className="text-sm font-semibold text-[#1A1A1A] mt-1">
                      {currency}{item.price?.toLocaleString()}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}

