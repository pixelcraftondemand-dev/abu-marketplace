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
  PhoneCall
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

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#002541]/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div 
        className="relative bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[92vh] overflow-y-auto border border-[#DCE1E5]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Header Close */}
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-xs px-4 py-3 border-b border-[#DCE1E5] flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-[#5A6872]">
            <span>{product.category}</span>
            <span aria-hidden="true">/</span>
            <span className="font-semibold text-[#0B3B60] truncate max-w-[220px] sm:max-w-md">
              {product.title}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 text-[#5A6872] hover:text-[#0f1d26] transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Main Body */}
        <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Left Column: Image Showcase (md:col-span-6) */}
          <div className="md:col-span-6 flex flex-col gap-3">
            <div className="relative aspect-square w-full bg-[#F8F9FA] rounded border border-[#DCE1E5] overflow-hidden flex items-center justify-center">
              <img
                src={product.image}
                alt={product.title}
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400"><rect fill="%23f1f5f9" width="400" height="400"/><text fill="%230b3b60" font-family="sans-serif" font-size="20" font-weight="bold" x="50%" y="45%" text-anchor="middle">Abu Marketplace</text><text fill="%2364748b" font-family="sans-serif" font-size="14" x="50%" y="55%" text-anchor="middle">Verified Product</text></svg>';
                }}
                className="w-full h-full object-cover object-center"
              />
              <button
                onClick={() => onToggleWishlist(product)}
                className={`absolute top-3 right-3 p-2 rounded-full bg-white/90 shadow transition-colors ${
                  isWishlisted ? 'text-[#0B3B60]' : 'text-gray-500 hover:text-[#0B3B60]'
                }`}
                aria-label="Save to Wishlist"
              >
                <Heart className={`w-5 h-5 ${isWishlisted ? 'fill-current' : ''}`} />
              </button>
            </div>


            {/* Merchant Trust Bar */}
            <div className="bg-[#eaf5ff] p-3 rounded border border-[#c2c7cf] flex items-center justify-between text-xs">
              <div>
                <div className="flex items-center gap-1 font-bold text-[#002541]">
                  <ShieldCheck className="w-4 h-4 text-[#00875A]" />
                  <span>{product.sellerName}</span>
                </div>
                <div className="text-[11px] text-[#42474e]">
                  {product.sellerLocation} · {product.sellerRating} ★ Merchant Score
                </div>
              </div>
              <span className="text-[11px] font-bold text-[#00875A] bg-white px-2 py-1 rounded border border-[#00875A]/20">
                Verified Seller
              </span>
            </div>
          </div>

          {/* Right Column: Contiguous Purchase Module (md:col-span-6) */}
          <div className="md:col-span-6 flex flex-col justify-between">
            <div>
              {/* Product Title */}
              <h1 className="text-lg sm:text-xl font-bold text-[#1A242D] leading-tight mb-2">
                {product.title}
              </h1>

              {/* Rating & Sold Volume */}
              <div className="flex items-center gap-2 text-xs text-[#5A6872] mb-3">
                <div className="flex items-center text-[#d97706] font-bold">
                  <Star className="w-4 h-4 fill-[#d97706] mr-1" />
                  <span>{product.rating.toFixed(1)}</span>
                </div>
                <span>·</span>
                <span className="tabular-nums font-medium text-[#1A242D]">
                  {product.reviewCount} reviews
                </span>
                <span>·</span>
                <span className="text-[#00875A] font-semibold">
                  {product.soldCount}+ fulfilled
                </span>
              </div>

              {/* Pricing Box */}
              <div className="bg-[#f8fafc] p-3.5 rounded border border-[#DCE1E5] mb-4">
                <div className="flex items-baseline gap-2">
                  <div className="font-extrabold text-[#0B3B60] tracking-tight tabular-nums flex items-baseline">
                    <span className="text-xs font-bold text-[#5A6872] mr-1">
                      SLE
                    </span>
                    <span className="text-2xl sm:text-3xl">
                      {new Intl.NumberFormat('en-US').format(product.priceSLE)}
                    </span>
                  </div>
                </div>

                {/* Stock info */}
                <div className="mt-1.5 flex items-center gap-1.5 text-xs text-[#00875A] font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Available for immediate dispatch from {product.sellerLocation}</span>
                </div>
              </div>

              {/* Delivery Estimation Box */}
              <div className="bg-white p-3 rounded border border-[#DCE1E5] mb-4 text-xs">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-[#1A242D]">
                    <Truck className="w-4 h-4 text-[#0B3B60]" />
                    <span>Fulfillment to {currentLocation.name}</span>
                  </div>
                  <button
                    onClick={onOpenLocationPicker}
                    className="text-[#0B3B60] font-semibold underline text-[11px] cursor-pointer"
                  >
                    Change City
                  </button>
                </div>
                <div className="text-[#5A6872] flex items-center justify-between">
                  <span>Transit Time: <strong className="text-[#1A242D]">{currentLocation.transitTime}</strong></span>
                  <span className="font-semibold text-[#1A242D]">Fee: SLE {currentLocation.deliveryFeeSLE}</span>
                </div>
                <div className="text-[11px] text-[#4ab584] mt-1 font-medium">
                  Dispatched via {currentLocation.hubName}
                </div>
              </div>

              {/* Quantity Stepper */}
              <div className="flex items-center gap-3 mb-4">
                <span className="text-xs font-bold text-[#1A242D]">Quantity:</span>
                <div className="flex items-center border border-[#DCE1E5] rounded bg-white">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                    className="px-2.5 py-1 text-sm font-bold text-[#0B3B60] hover:bg-[#eaf5ff] disabled:opacity-40"
                  >
                    -
                  </button>
                  <span className="px-3 py-1 text-xs font-bold tabular-nums min-w-8 text-center">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(Math.min(product.stockCount, quantity + 1))}
                    disabled={quantity >= product.stockCount}
                    className="px-2.5 py-1 text-sm font-bold text-[#0B3B60] hover:bg-[#eaf5ff] disabled:opacity-40"
                  >
                    +
                  </button>
                </div>
                <span className="text-[11px] text-[#5A6872]">
                  Max {product.stockCount} units per order
                </span>
              </div>
            </div>

            {/* Fast Action Purchase CTAs */}
            <div className="space-y-2 pt-2 border-t border-[#DCE1E5]">
              {/* Add to Cart */}
              <button
                onClick={() => {
                  onAddToCart(product, quantity);
                  onClose();
                }}
                className="w-full h-10 bg-[#0B3B60] hover:bg-[#002541] text-white rounded font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow transition-colors cursor-pointer"
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
            </div>
          </div>
        </div>

        {/* Tabbed Specifications & Highlights */}
        <div className="p-4 sm:p-6 border-t border-[#DCE1E5] bg-[#fafbfc]">
          <div className="flex gap-4 border-b border-[#DCE1E5] mb-4">
            <button
              onClick={() => setActiveTab('specs')}
              className={`pb-2 text-xs font-bold transition-colors cursor-pointer ${
                activeTab === 'specs'
                  ? 'border-b-2 border-[#0B3B60] text-[#0B3B60]'
                  : 'text-[#5A6872] hover:text-[#1A242D]'
              }`}
            >
              Specifications & Features
            </button>
            <button
              onClick={() => setActiveTab('reviews')}
              className={`pb-2 text-xs font-bold transition-colors cursor-pointer ${
                activeTab === 'reviews'
                  ? 'border-b-2 border-[#0B3B60] text-[#0B3B60]'
                  : 'text-[#5A6872] hover:text-[#1A242D]'
              }`}
            >
              Verified Customer Reviews ({product.reviewCount})
            </button>
          </div>

          {activeTab === 'specs' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              {/* Left: Description & Key Highlights */}
              <div>
                <h4 className="font-bold text-[#1A242D] mb-2 uppercase text-[11px] tracking-wider text-[#0B3B60]">
                  Overview
                </h4>
                <p className="text-[#42474e] leading-relaxed mb-4">
                  {product.description}
                </p>

                <h4 className="font-bold text-[#1A242D] mb-2 uppercase text-[11px] tracking-wider text-[#0B3B60]">
                  Key Features
                </h4>
                <ul className="space-y-1.5">
                  {product.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-[#42474e]">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#00875A] shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Right: Technical Specifications Table */}
              <div>
                <h4 className="font-bold text-[#1A242D] mb-2 uppercase text-[11px] tracking-wider text-[#0B3B60]">
                  Technical Specifications
                </h4>
                <div className="border border-[#DCE1E5] rounded overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <tbody>
                      {Object.entries(product.specifications).map(([key, val], idx) => (
                        <tr
                          key={key}
                          className={idx % 2 === 0 ? 'bg-white' : 'bg-[#f4f6f8]'}
                        >
                          <td className="py-2 px-3 font-semibold text-[#1A242D] w-2/5 border-b border-[#DCE1E5]">
                            {key}
                          </td>
                          <td className="py-2 px-3 text-[#5A6872] tabular-nums border-b border-[#DCE1E5]">
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
              <div className="bg-white p-3 rounded border border-[#DCE1E5]">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-[#1A242D]">Sorie K.</span>
                    <span className="text-[10px] text-[#00875A] font-semibold bg-[#eaf5ff] px-1.5 py-0.2 rounded">
                      Verified Buyer · Freetown Central
                    </span>
                  </div>
                  <div className="flex text-[#d97706] text-xs">★★★★★</div>
                </div>
                <p className="text-xs text-[#42474e]">
                  "Delivered to my store on Rawdon Street within 3 hours. Came fully intact in manufacturer box. Paid with Orange Money seamlessly."
                </p>
              </div>

              <div className="bg-white p-3 rounded border border-[#DCE1E5]">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-[#1A242D]">Aminata B.</span>
                    <span className="text-[10px] text-[#00875A] font-semibold bg-[#eaf5ff] px-1.5 py-0.2 rounded">
                      Verified Buyer · Bo City
                    </span>
                  </div>
                  <div className="flex text-[#d97706] text-xs">★★★★★</div>
                </div>
                <p className="text-xs text-[#42474e]">
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
