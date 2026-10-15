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

const CATEGORY_FALLBACK_IMAGES: Record<string, string> = {
  'Fashion & Footwear': 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=800&q=80',
  'Solar & Power': 'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=800&q=80',
  'Phones & Tablets': 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=800&q=80',
  'Electronics & Audio': 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80',
  'Home & Living': 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=800&q=80',
  'Groceries & Non-Perishables': 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80',
  'Home & Office Furniture': 'https://images.unsplash.com/photo-1580481077190-7361356a15f1?auto=format&fit=crop&w=800&q=80',
  'Appliances & Utensils': 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=800&q=80',
  'Beauty, Perfumes & Hygiene': 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=800&q=80',
  'Baby & Kids Toys': 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?auto=format&fit=crop&w=800&q=80',
  'Sports Gears & Jerseys': 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?auto=format&fit=crop&w=800&q=80',
  'Power Tools & Safety Gear': 'https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=800&q=80',
  'Vehicles & E-Bikes': 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=800&q=80',
  'Books, Art & Stationery': 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=800&q=80',
};

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onSelect,
  onAddToCart,
  isWishlisted,
  onToggleWishlist,
}) => {
  const [currentImgSrc, setCurrentImgSrc] = useState(product.image);
  const [hasTriedFallback, setHasTriedFallback] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleImageError = () => {
    if (!hasTriedFallback) {
      const fallback = CATEGORY_FALLBACK_IMAGES[product.category] || CATEGORY_FALLBACK_IMAGES['Fashion & Footwear'];
      setHasTriedFallback(true);
      setCurrentImgSrc(fallback);
    } else {
      setImageError(true);
    }
  };

  // Category Icon helper for fallback
  const renderCategoryFallbackIcon = () => {
    switch (product.category) {
      case 'Fashion & Footwear':
        return <Sparkles className="w-10 h-10 text-[#0B3B60]/40 dark:text-sky-400/40" />;
      case 'Solar & Power':
        return <Sun className="w-10 h-10 text-[#FF6600]/40 dark:text-amber-400/40" />;
      case 'Phones & Tablets':
        return <Smartphone className="w-10 h-10 text-[#00875A]/40 dark:text-emerald-400/40" />;
      case 'Electronics & Audio':
        return <Headphones className="w-10 h-10 text-[#7A1CAC]/40 dark:text-purple-400/40" />;
      case 'Home & Living':
        return <UtensilsCrossed className="w-10 h-10 text-[#0B3B60]/40 dark:text-orange-400/40" />;
      default:
        return <ShoppingBag className="w-10 h-10 text-[#5A6872]/40 dark:text-slate-400/40" />;
    }
  };

  return (
    <article
      onClick={() => onSelect(product)}
      className="group bg-white dark:bg-[#111D27] rounded-md border border-[#E7ECF0] dark:border-[#1E2E3D] hover:border-[#0B3B60] dark:hover:border-[#38BDF8] transition-all cursor-pointer flex flex-col justify-between overflow-hidden shadow-2xs hover:shadow-sm h-full"
    >
      {/* 1:1 Image Container with Graceful Fallback */}
      <div className="relative aspect-square w-full bg-[#F4F6F8] dark:bg-[#091118] overflow-hidden flex items-center justify-center">
        {!imageError ? (
          <img
            src={currentImgSrc}
            alt={product.title}
            referrerPolicy="no-referrer"
            loading="lazy"
            onError={handleImageError}
            className="w-full h-full object-cover object-center group-hover:scale-102 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#F8FAFC] to-[#EDF2F7] dark:from-[#091118] dark:to-[#15222E] p-3 text-center">
            {renderCategoryFallbackIcon()}
            <span className="text-[10px] font-bold text-[#5A6872] dark:text-slate-400 mt-1 line-clamp-1">
              {product.category}
            </span>
            <span className="text-[9px] text-[#8A99A8] dark:text-slate-500 line-clamp-1 max-w-[120px]">
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
          className={`absolute top-2 right-2 w-7 h-7 sm:w-7 sm:h-7 rounded-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-xs hover:bg-white dark:hover:bg-slate-800 transition-all shadow-2xs cursor-pointer flex items-center justify-center active:scale-95 ${
            isWishlisted ? 'text-[#0B3B60] dark:text-[#38BDF8]' : 'text-gray-400 hover:text-[#0B3B60] dark:hover:text-[#38BDF8]'
          }`}
          aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          <Heart
            className={`w-3.5 h-3.5 ${isWishlisted ? 'fill-current' : ''}`}
          />
        </button>
      </div>

      {/* Clean Details without excessive spacing */}
      <div className="p-2 sm:p-2.5 flex flex-col justify-between flex-1">
        <div>
          {/* Subtle seller line */}
          <div className="text-[10px] text-[#5A6872] dark:text-slate-400 truncate mb-0.5 flex items-center gap-1">
            <span className="truncate">{product.sellerName}</span>
            {product.isVerifiedSeller && (
              <CheckCircle2 className="w-3 h-3 text-[#00875A] shrink-0" />
            )}
          </div>

          {/* Clean 2-line title with snug line height */}
          <h3 className="text-xs sm:text-[13px] font-semibold text-[#1A242D] dark:text-[#F1F5F9] line-clamp-2 leading-snug group-hover:text-[#0B3B60] dark:group-hover:text-[#38BDF8] transition-colors min-h-[32px] sm:min-h-[36px]">
            {product.title}
          </h3>
        </div>

        {/* Snug price and add button row */}
        <div className="flex items-center justify-between pt-1.5 mt-1 border-t border-[#F0F4F8] dark:border-[#1E2E3D] gap-1">
          <div className="flex flex-col sm:flex-row sm:items-baseline gap-0 sm:gap-1 min-w-0">
            <span className="font-extrabold text-[#0B3B60] dark:text-[#38BDF8] text-xs sm:text-sm tabular-nums whitespace-nowrap">
              <span className="text-[10px] font-semibold text-[#5A6872] dark:text-slate-400 mr-0.5">SLE</span>
              {new Intl.NumberFormat('en-US').format(product.priceSLE)}
            </span>
            {product.originalPriceSLE > product.priceSLE && (
              <span className="text-[9px] sm:text-[10px] text-[#8A99A8] dark:text-slate-500 line-through tabular-nums whitespace-nowrap hidden sm:inline">
                SLE {new Intl.NumberFormat('en-US').format(product.originalPriceSLE)}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={(e) => onAddToCart(product, e)}
            className="w-7 h-7 sm:w-7.5 sm:h-7.5 rounded-lg bg-[#F4F6F8] dark:bg-[#1E2E3D] hover:bg-[#0B3B60] dark:hover:bg-[#00875A] text-[#0B3B60] dark:text-slate-200 hover:text-white dark:hover:text-white flex items-center justify-center transition-all cursor-pointer shrink-0 active:scale-95 shadow-2xs"
            title="Add to cart"
            aria-label="Add to cart"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

    </article>
  );
};
