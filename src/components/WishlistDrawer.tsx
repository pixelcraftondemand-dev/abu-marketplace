import React from 'react';
import { X, Heart, ShoppingCart, Trash2, ArrowRight } from 'lucide-react';
import { Product } from '../types';

interface WishlistDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  wishlist: Product[];
  onRemoveFromWishlist: (product: Product) => void;
  onAddToCart: (product: Product) => void;
}

export const WishlistDrawer: React.FC<WishlistDrawerProps> = ({
  isOpen,
  onClose,
  wishlist,
  onRemoveFromWishlist,
  onAddToCart,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-[#002541]/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between border-l border-[#DCE1E5]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 bg-[#0B3B60] text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-[#ffb5a0] fill-current" />
            <h2 className="font-bold text-base">Saved Items ({wishlist.length})</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-white/10 text-white/80 hover:text-white"
            aria-label="Close wishlist"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Wishlist Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {wishlist.length === 0 ? (
            <div className="text-center py-16 px-4">
              <Heart className="w-12 h-12 text-[#73777f] mx-auto mb-3 opacity-30" />
              <p className="font-bold text-[#1A242D] text-base mb-1">
                Your wishlist is empty
              </p>
              <p className="text-xs text-[#5A6872] mb-6">
                Tap the heart on any product to save items for future purchase.
              </p>
              <button
                onClick={onClose}
                className="bg-[#0B3B60] hover:bg-[#002541] text-white px-5 py-2 rounded text-xs font-bold transition-colors cursor-pointer"
              >
                Browse Marketplace
              </button>
            </div>
          ) : (
            wishlist.map((prod) => (
              <div
                key={prod.id}
                className="p-3 bg-white rounded border border-[#DCE1E5] flex gap-3 items-center justify-between"
              >
                <div className="w-16 h-16 rounded bg-[#F8F9FA] overflow-hidden shrink-0 border border-[#DCE1E5] flex items-center justify-center">
                  <img
                    src={prod.image}
                    alt={prod.title}
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect fill="%23f1f5f9" width="100" height="100"/><text fill="%230b3b60" font-family="sans-serif" font-size="16" font-weight="bold" x="50%" y="55%" text-anchor="middle">ABU</text></svg>';
                    }}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="flex-1 min-w-0 pr-2">
                  <h4 className="text-xs font-semibold text-[#1A242D] line-clamp-1">
                    {prod.title}
                  </h4>
                  <div className="text-[11px] text-[#00875A]">
                    {prod.sellerLocation}
                  </div>
                  <div className="text-xs font-extrabold text-[#0B3B60] tabular-nums mt-0.5">
                    SLE {new Intl.NumberFormat('en-US').format(prod.priceSLE)}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <button
                    onClick={() => onRemoveFromWishlist(prod)}
                    className="text-[#73777f] hover:text-[#ba1a1a] p-1"
                    title="Remove from wishlist"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => {
                      onAddToCart(prod);
                      onRemoveFromWishlist(prod);
                    }}
                    className="px-2.5 py-1 bg-[#0B3B60] hover:bg-[#002541] text-white text-[11px] font-bold rounded flex items-center gap-1 shadow-xs cursor-pointer"
                  >
                    <ShoppingCart className="w-3 h-3" />
                    <span>Move</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {wishlist.length > 0 && (
          <div className="p-4 bg-[#F4F6F8] border-t border-[#DCE1E5]">
            <button
              onClick={() => {
                wishlist.forEach((p) => onAddToCart(p));
                onClose();
              }}
              className="w-full h-10 bg-[#0B3B60] hover:bg-[#002541] text-white rounded font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow transition-colors cursor-pointer"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Add All Items to Cart</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
