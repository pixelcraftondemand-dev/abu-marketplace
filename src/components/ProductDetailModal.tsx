import React, { useState } from 'react';
import { 
  X, 
  Star, 
  CheckCircle2, 
  Truck, 
  ShieldCheck, 
  Heart, 
  ShoppingCart, 
  MapPin, 
  AlertTriangle,
  RotateCcw,
  Zap,
  PhoneCall,
  Share2,
  Check
} from 'lucide-react';
import { Product, LocationNode, MobileMoneyProvider } from '../types';

interface ProductDetailModalProps {
  product: Product;
  onClose: () => void;
  onAddToCart: (product: Product, quantity: number) => void;
  onFastBuy: (product: Product, quantity: number, paymentMethod: MobileMoneyProvider) => void;
  currentLocation: LocationNode;
  onOpenLocationPicker: () => void;
  isWishlisted: boolean;
  onToggleWishlist: (product: Product) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  onClose,
  onAddToCart,
  onFastBuy,
  currentLocation,
  onOpenLocationPicker,
  isWishlisted,
  onToggleWishlist,
}) => {
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'specs' | 'reviews'>('specs');
  const [shareSuccess, setShareSuccess] = useState(false);

  // Web Share API with WhatsApp and Clipboard Fallback
  const handleShareProduct = async () => {
    const priceFormatted = new Intl.NumberFormat('en-US').format(product.priceSLE);
    const shareUrl = typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}?product=${encodeURIComponent(product.id)}`
      : `https://abumarketplace.shop/?product=${encodeURIComponent(product.id)}`;

    const shareTitle = `${product.title} - ABU Marketplace`;
    const shareMessage = `Check out "${product.title}" on ABU Marketplace for SLE ${priceFormatted}!\nImmediate delivery available across Sierra Leone:\n${shareUrl}`;

    // 1. Try Web Share API (native on mobile devices - Android/iOS WhatsApp chooser)
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: shareTitle,
          text: `Check out "${product.title}" on ABU Marketplace for SLE ${priceFormatted}!`,
          url: shareUrl,
        });
        setShareSuccess(true);
        setTimeout(() => setShareSuccess(false), 2500);
        return;
      } catch (err: any) {
        // If user actively dismissed/cancelled the native share sheet, do not force-open fallback
        if (err.name === 'AbortError') {
          return;
        }
        console.warn('[Share API] Native Web Share encountered error, falling back to WhatsApp link:', err);
      }
    }

    // 2. Direct WhatsApp Web / Mobile Deep-Link Fallback
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareMessage)}`;
    if (typeof window !== 'undefined') {
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    }

    // 3. Copy direct link to clipboard for convenience
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(shareUrl);
      } catch (clipErr) {
        // Non-critical clipboard exception
      }
    }

    setShareSuccess(true);
    setTimeout(() => setShareSuccess(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#002541]/70 dark:bg-black/80 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div 
        className="relative bg-white dark:bg-[#111D27] text-[#1A242D] dark:text-[#F1F5F9] rounded-t-2xl sm:rounded-lg shadow-2xl max-w-4xl w-full max-h-[92vh] overflow-y-auto border border-[#DCE1E5] dark:border-[#1E2E3D]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Header with Share & Close Controls */}
        <div className="sticky top-0 z-10 bg-white/95 dark:bg-[#111D27]/95 backdrop-blur-xs px-4 py-3 border-b border-[#DCE1E5] dark:border-[#1E2E3D] flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-[#5A6872] dark:text-slate-400">
            <span className="hidden xs:inline">{product.category}</span>
            <span aria-hidden="true" className="hidden xs:inline">/</span>
            <span className="font-semibold text-[#0B3B60] dark:text-[#38BDF8] truncate max-w-[160px] sm:max-w-md">
              {product.title}
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Header Share Button */}
            <button
              onClick={handleShareProduct}
              className="h-8 px-2.5 sm:px-3 rounded-full bg-emerald-50 hover:bg-emerald-100 dark:bg-[#06291C] dark:hover:bg-[#0B3D2B] text-[#00875A] dark:text-[#8df7c1] border border-emerald-300 dark:border-emerald-600/60 transition-all text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95"
              title="Share via WhatsApp or Web Share"
              aria-label="Share product"
            >
              {shareSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="text-[11px]">Link Shared!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Share</span>
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-[#5A6872] dark:text-slate-400 hover:text-[#0f1d26] dark:hover:text-white transition-colors cursor-pointer flex items-center justify-center"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Main Body */}
        <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Left Column: Image Showcase (md:col-span-6) */}
          <div className="md:col-span-6 flex flex-col gap-3">
            <div className="relative aspect-square w-full bg-[#F8F9FA] dark:bg-[#091118] rounded border border-[#DCE1E5] dark:border-[#1E2E3D] overflow-hidden flex items-center justify-center">
              <img
                src={product.image}
                alt={product.title}
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400"><rect fill="%23f1f5f9" width="400" height="400"/><text fill="%230b3b60" font-family="sans-serif" font-size="20" font-weight="bold" x="50%" y="45%" text-anchor="middle">ABU Marketplace</text><text fill="%2364748b" font-family="sans-serif" font-size="14" x="50%" y="55%" text-anchor="middle">Verified Product</text></svg>';
                }}
                className="w-full h-full object-cover object-center"
              />
              <div className="absolute top-3 right-3 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleShareProduct}
                  className="p-2 rounded-full bg-white/90 dark:bg-slate-900/90 shadow hover:bg-white dark:hover:bg-slate-800 transition-transform active:scale-95 text-slate-700 dark:text-slate-200 hover:text-[#00875A] dark:hover:text-[#8df7c1] cursor-pointer"
                  title="Share product link"
                  aria-label="Share product"
                >
                  {shareSuccess ? <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> : <Share2 className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => onToggleWishlist(product)}
                  className={`p-2 rounded-full bg-white/90 dark:bg-slate-900/90 shadow hover:bg-white dark:hover:bg-slate-800 transition-colors cursor-pointer ${
                    isWishlisted ? 'text-[#0B3B60] dark:text-[#38BDF8]' : 'text-gray-500 hover:text-[#0B3B60] dark:hover:text-[#38BDF8]'
                  }`}
                  aria-label="Save to Wishlist"
                >
                  <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-current' : ''}`} />
                </button>
              </div>
            </div>

            {/* Merchant Trust Bar */}
            <div className="bg-[#eaf5ff] dark:bg-[#152738] p-3 rounded border border-[#c2c7cf] dark:border-[#1E3A52] flex items-center justify-between text-xs">
              <div>
                <div className="flex items-center gap-1 font-bold text-[#002541] dark:text-sky-300">
                  <ShieldCheck className="w-4 h-4 text-[#00875A] dark:text-emerald-400" />
                  <span>{product.sellerName}</span>
                </div>
                <div className="text-[11px] text-[#42474e] dark:text-slate-300">
                  {product.sellerLocation} · {product.sellerRating} ★ Merchant Score
                </div>
              </div>
              <span className="text-[11px] font-bold text-[#00875A] dark:text-emerald-300 bg-white dark:bg-[#0E1720] px-2 py-1 rounded border border-[#00875A]/20 dark:border-emerald-500/30">
                Verified Seller
              </span>
            </div>
          </div>

          {/* Right Column: Contiguous Purchase Module (md:col-span-6) */}
          <div className="md:col-span-6 flex flex-col justify-between">
            <div>
              {/* Product Title */}
              <h1 className="text-lg sm:text-xl font-bold text-[#1A242D] dark:text-[#F1F5F9] leading-tight mb-2">
                {product.title}
              </h1>

              {/* Rating & Sold Volume */}
              <div className="flex items-center gap-2 text-xs text-[#5A6872] dark:text-slate-400 mb-3">
                <div className="flex items-center text-[#d97706] font-bold">
                  <Star className="w-4 h-4 fill-[#d97706] mr-1" />
                  <span>{product.rating.toFixed(1)}</span>
                </div>
                <span>·</span>
                <span className="tabular-nums font-medium text-[#1A242D] dark:text-slate-200">
                  {product.reviewCount} reviews
                </span>
                <span>·</span>
                <span className="text-[#00875A] dark:text-[#8df7c1] font-semibold">
                  {product.soldCount}+ fulfilled
                </span>
              </div>

              {/* Pricing Box */}
              <div className="bg-[#f8fafc] dark:bg-[#0D151D] p-3.5 rounded border border-[#DCE1E5] dark:border-[#1E2E3D] mb-4">
                <div className="flex items-baseline gap-2">
                  <div className="font-extrabold text-[#0B3B60] dark:text-[#38BDF8] tracking-tight tabular-nums flex items-baseline">
                    <span className="text-xs font-bold text-[#5A6872] dark:text-slate-400 mr-1">
                      SLE
                    </span>
                    <span className="text-2xl sm:text-3xl">
                      {new Intl.NumberFormat('en-US').format(product.priceSLE)}
                    </span>
                  </div>
                </div>

                {/* Stock info */}
                <div className="mt-1.5 flex items-center gap-1.5 text-xs text-[#00875A] dark:text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Available for immediate dispatch from {product.sellerLocation}</span>
                </div>
              </div>

              {/* Delivery Estimation Box */}
              <div className="bg-white dark:bg-[#0E1720] p-3 rounded border border-[#DCE1E5] dark:border-[#1E2E3D] mb-4 text-xs">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-[#1A242D] dark:text-slate-100">
                    <Truck className="w-4 h-4 text-[#0B3B60] dark:text-[#38BDF8]" />
                    <span>Fulfillment to {currentLocation.name}</span>
                  </div>
                  <button
                    onClick={onOpenLocationPicker}
                    className="text-[#0B3B60] dark:text-[#38BDF8] font-semibold underline text-[11px] cursor-pointer"
                  >
                    Change City
                  </button>
                </div>
                <div className="text-[#5A6872] dark:text-slate-400 flex items-center justify-between">
                  <span>Transit Time: <strong className="text-[#1A242D] dark:text-slate-200">{currentLocation.transitTime}</strong></span>
                  <span className="font-semibold text-[#1A242D] dark:text-slate-200">Fee: SLE {currentLocation.deliveryFeeSLE}</span>
                </div>
                <div className="text-[11px] text-[#00875A] dark:text-[#8df7c1] mt-1 font-medium">
                  Dispatched via {currentLocation.hubName}
                </div>
              </div>

              {/* Quantity Stepper */}
              <div className="flex items-center gap-3 mb-4">
                <span className="text-xs font-bold text-[#1A242D] dark:text-slate-200">Quantity:</span>
                <div className="flex items-center border border-[#DCE1E5] dark:border-[#1E2E3D] rounded bg-white dark:bg-[#0E1720]">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                    className="px-2.5 py-1 text-sm font-bold text-[#0B3B60] dark:text-[#38BDF8] hover:bg-[#eaf5ff] dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
                  >
                    -
                  </button>
                  <span className="px-3 py-1 text-xs font-bold tabular-nums min-w-8 text-center text-[#1A242D] dark:text-slate-100">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(Math.min(product.stockCount, quantity + 1))}
                    disabled={quantity >= product.stockCount}
                    className="px-2.5 py-1 text-sm font-bold text-[#0B3B60] dark:text-[#38BDF8] hover:bg-[#eaf5ff] dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
                  >
                    +
                  </button>
                </div>
                <span className="text-[11px] text-[#5A6872] dark:text-slate-400">
                  Max {product.stockCount} units per order
                </span>
              </div>
            </div>

            {/* Fast Action Purchase CTAs */}
            <div className="space-y-2 pt-2 border-t border-[#DCE1E5] dark:border-[#1E2E3D]">
              {/* Add to Cart */}
              <button
                onClick={() => {
                  onAddToCart(product, quantity);
                  onClose();
                }}
                className="w-full h-10 bg-[#0B3B60] hover:bg-[#002541] dark:bg-sky-600 dark:hover:bg-sky-700 text-white rounded font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow transition-colors cursor-pointer"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>Add to Cart (SLE {new Intl.NumberFormat('en-US').format(product.priceSLE * quantity)})</span>
              </button>

              {/* Pay on Delivery Instant Checkout */}
              <div>
                <button
                  onClick={() => {
                    onFastBuy(product, quantity, 'cash');
                    onClose();
                  }}
                  className="w-full h-10 bg-[#00875A] hover:bg-[#00704a] text-white rounded font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Order Now (Pay on Delivery)</span>
                </button>
              </div>

              {/* Share via WhatsApp CTA */}
              <button
                type="button"
                onClick={handleShareProduct}
                className="w-full h-9.5 bg-[#25D366]/10 hover:bg-[#25D366]/20 dark:bg-[#25D366]/15 dark:hover:bg-[#25D366]/25 text-[#128C7E] dark:text-[#25D366] border border-[#25D366]/40 dark:border-[#25D366]/50 rounded font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs active:scale-[0.99]"
                title="Share this product on WhatsApp"
              >
                <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                </svg>
                <span>{shareSuccess ? 'Link Shared via WhatsApp!' : 'Share via WhatsApp'}</span>
                {shareSuccess && (
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 ml-1" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Tabbed Specifications & Highlights */}
        <div className="p-4 sm:p-6 border-t border-[#DCE1E5] dark:border-[#1E2E3D] bg-[#fafbfc] dark:bg-[#0C141C]">
          <div className="flex gap-4 border-b border-[#DCE1E5] dark:border-[#1E2E3D] mb-4">
            <button
              onClick={() => setActiveTab('specs')}
              className={`pb-2 text-xs font-bold transition-colors cursor-pointer ${
                activeTab === 'specs'
                  ? 'border-b-2 border-[#0B3B60] dark:border-[#38BDF8] text-[#0B3B60] dark:text-[#38BDF8]'
                  : 'text-[#5A6872] dark:text-slate-400 hover:text-[#1A242D] dark:hover:text-white'
              }`}
            >
              Specifications & Features
            </button>
            <button
              onClick={() => setActiveTab('reviews')}
              className={`pb-2 text-xs font-bold transition-colors cursor-pointer ${
                activeTab === 'reviews'
                  ? 'border-b-2 border-[#0B3B60] dark:border-[#38BDF8] text-[#0B3B60] dark:text-[#38BDF8]'
                  : 'text-[#5A6872] dark:text-slate-400 hover:text-[#1A242D] dark:hover:text-white'
              }`}
            >
              Verified Customer Reviews ({product.reviewCount})
            </button>
          </div>

          {activeTab === 'specs' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              {/* Left: Description & Key Highlights */}
              <div>
                <h4 className="font-bold text-[#1A242D] dark:text-[#F1F5F9] mb-2 uppercase text-[11px] tracking-wider text-[#0B3B60] dark:text-[#38BDF8]">
                  Overview
                </h4>
                <p className="text-[#42474e] dark:text-slate-300 leading-relaxed mb-4">
                  {product.description}
                </p>

                <h4 className="font-bold text-[#1A242D] dark:text-[#F1F5F9] mb-2 uppercase text-[11px] tracking-wider text-[#0B3B60] dark:text-[#38BDF8]">
                  Key Features
                </h4>
                <ul className="space-y-1.5">
                  {product.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-[#42474e] dark:text-slate-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#00875A] dark:text-emerald-400 shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Right: Technical Specifications Table */}
              <div>
                <h4 className="font-bold text-[#1A242D] dark:text-[#F1F5F9] mb-2 uppercase text-[11px] tracking-wider text-[#0B3B60] dark:text-[#38BDF8]">
                  Technical Specifications
                </h4>
                <div className="border border-[#DCE1E5] dark:border-[#1E2E3D] rounded overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <tbody>
                      {Object.entries(product.specifications).map(([key, val], idx) => (
                        <tr
                          key={key}
                          className={idx % 2 === 0 ? 'bg-white dark:bg-[#111D27]' : 'bg-[#f4f6f8] dark:bg-[#0B121A]'}
                        >
                          <td className="py-2 px-3 font-semibold text-[#1A242D] dark:text-slate-200 w-2/5 border-b border-[#DCE1E5] dark:border-[#1E2E3D]">
                            {key}
                          </td>
                          <td className="py-2 px-3 text-[#5A6872] dark:text-slate-400 tabular-nums border-b border-[#DCE1E5] dark:border-[#1E2E3D]">
                            {val}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="bg-white dark:bg-[#0E1720] p-3 rounded border border-[#DCE1E5] dark:border-[#1E2E3D]">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-[#1A242D] dark:text-slate-100">Sorie K.</span>
                    <span className="text-[10px] text-[#00875A] dark:text-emerald-400 font-semibold bg-[#eaf5ff] dark:bg-emerald-950/40 px-1.5 py-0.2 rounded border border-transparent dark:border-emerald-800/40">
                      Verified Buyer · Freetown Central
                    </span>
                  </div>
                  <div className="flex text-[#d97706] text-xs">★★★★★</div>
                </div>
                <p className="text-xs text-[#42474e] dark:text-slate-300">
                  "Delivered to my store on Rawdon Street within 3 hours. Came fully intact in manufacturer box. Paid with Cash on Delivery seamlessly."
                </p>
              </div>

              <div className="bg-white dark:bg-[#0E1720] p-3 rounded border border-[#DCE1E5] dark:border-[#1E2E3D]">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-[#1A242D] dark:text-slate-100">Aminata B.</span>
                    <span className="text-[10px] text-[#00875A] dark:text-emerald-400 font-semibold bg-[#eaf5ff] dark:bg-emerald-950/40 px-1.5 py-0.2 rounded border border-transparent dark:border-emerald-800/40">
                      Verified Buyer · Bo City
                    </span>
                  </div>
                  <div className="flex text-[#d97706] text-xs">★★★★★</div>
                </div>
                <p className="text-xs text-[#42474e] dark:text-slate-300">
                  "Received in Bo after 24 hours. The merchant called to confirm before dispatch. Exactly as advertised."
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
