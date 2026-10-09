import React, { useState } from 'react';
import { Heart, Plus, CheckCircle2, Sparkles, Sun, Smartphone, Headphones, UtensilsCrossed, ShoppingBag } from 'lucide-react';
import { Product } from '../types';

interface ProductCardProps {
  product: Product;
  onSelect: (product: Product) => void;
  onAddToCart: (product: Product, e: React.MouseEvent) => void;
  isWishlisted: boolean;
  onToggleWishlist: (product: Product, e: React.MouseEvent) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onSelect,
  onAddToCart,
  isWishlisted,
  onToggleWishlist,
}) => {
  const [imageError, setImageError] = useState(false);

  // Category Icon helper for fallback
  const renderCategoryFallbackIcon = () => {
    switch (product.category) {
      case 'Fashion & Footwear':
        return <Sparkles className="w-10 h-10 text-[#0B3B60]/40" />;
      case 'Solar & Power':
        return <Sun className="w-10 h-10 text-[#FF6600]/40" />;
      case 'Phones & Tablets':
        return <Smartphone className="w-10 h-10 text-[#00875A]/40" />;
      case 'Electronics & Audio':
        return <Headphones className="w-10 h-10 text-[#7A1CAC]/40" />;
      case 'Home & Living':
        return <UtensilsCrossed className="w-10 h-10 text-[#0B3B60]/40" />;
      default:
        return <ShoppingBag className="w-10 h-10 text-[#5A6872]/40" />;
    }
  };

  return (
    <article
      onClick={() => onSelect(product)}
      className="group bg-white rounded-md border border-[#E7ECF0] hover:border-[#0B3B60] transition-all cursor-pointer flex flex-col justify-between overflow-hidden shadow-2xs hover:shadow-sm h-full"
    >
      {/* 1:1 Image Container with Graceful Fallback */}
      <div className="relative aspect-square w-full bg-[#F4F6F8] overflow-hidden flex items-center justify-center">
        {!imageError ? (
          <img
            src={product.image}
            alt={product.title}
            referrerPolicy="no-referrer"
            loading="lazy"
            onError={() => setImageError(true)}
            className="w-full h-full object-cover object-center group-hover:scale-102 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#F8FAFC] to-[#EDF2F7] p-3 text-center">
            {renderCategoryFallbackIcon()}
            <span className="text-[10px] font-bold text-[#5A6872] mt-1 line-clamp-1">
              {product.category}
            </span>
            <span className="text-[9px] text-[#8A99A8] line-clamp-1 max-w-[120px]">
              {product.title}
            </span>
          </div>
        )}

        {/* Discount Badge if available */}
        {product.discountPercent && product.discountPercent > 0 && (
          <div className="absolute top-2 left-2 bg-[#D84315] text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded shadow-2xs">
            -{product.discountPercent}%
          </div>
        )}

        {/* Minimalist Wishlist Button */}
        <button
          type="button"
          onClick={(e) => onToggleWishlist(product, e)}
          className={`absolute top-2 right-2 p-1.5 rounded-full bg-white/85 backdrop-blur-xs hover:bg-white transition-colors shadow-2xs ${
            isWishlisted ? 'text-[#0B3B60]' : 'text-gray-400 hover:text-[#0B3B60]'
          }`}
          aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          <Heart
            className={`w-3.5 h-3.5 ${isWishlisted ? 'fill-current' : ''}`}
          />
        </button>
      </div>

      {/* Clean Details */}
      <div className="p-2 sm:p-2.5 flex-1 flex flex-col justify-between">
        <div>
          {/* Subtle seller line */}
          <div className="text-[10px] text-[#5A6872] truncate mb-0.5 flex items-center gap-1">
            <span>{product.sellerName}</span>
            {product.isVerifiedSeller && (
              <CheckCircle2 className="w-3 h-3 text-[#00875A] shrink-0" />
            )}
          </div>

          {/* Clean 2-line title */}
          <h3 className="text-xs sm:text-[13px] font-semibold text-[#1A242D] line-clamp-2 leading-snug group-hover:text-[#0B3B60] transition-colors mb-1">
            {product.title}
          </h3>
        </div>

        {/* Clean price, COD hint and add button */}
        <div className="flex items-center justify-between pt-1.5 mt-1 border-t border-[#F0F4F8]">
          <div>
            <div className="font-extrabold text-[#0B3B60] text-xs sm:text-sm tabular-nums">
              <span className="text-[10px] font-semibold text-[#5A6872] mr-0.5">SLE</span>
              {new Intl.NumberFormat('en-US').format(product.priceSLE)}
            </div>
            {product.originalPriceSLE > product.priceSLE && (
              <div className="text-[10px] text-[#8A99A8] line-through tabular-nums -mt-0.5">
                SLE {new Intl.NumberFormat('en-US').format(product.originalPriceSLE)}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={(e) => onAddToCart(product, e)}
            className="w-6 h-6 rounded bg-[#F4F6F8] hover:bg-[#0B3B60] text-[#0B3B60] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Add to cart"
            aria-label="Add to cart"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </article>
  );
};

