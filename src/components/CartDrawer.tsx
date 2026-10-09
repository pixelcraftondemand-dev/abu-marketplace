import React from 'react';
import { X, Trash2, ShoppingBag, ArrowRight, ShieldCheck, MapPin } from 'lucide-react';
import { CartItem, LocationNode } from '../types';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onProceedToCheckout: () => void;
  currentLocation: LocationNode;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  items,
  onUpdateQuantity,
  onRemoveItem,
  onProceedToCheckout,
  currentLocation,
}) => {
  if (!isOpen) return null;

  const subtotal = items.reduce(
    (sum, item) => sum + item.product.priceSLE * item.quantity,
    0
  );
  const totalWithDelivery = subtotal > 0 ? subtotal + currentLocation.deliveryFeeSLE : 0;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-[#002541]/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between border-l border-[#DCE1E5]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 bg-[#0B3B60] text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-[#8df7c1]" />
            <h2 className="font-bold text-base">Your Cart ({items.length} items)</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-white/10 text-white/80 hover:text-white"
            aria-label="Close cart drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {items.length === 0 ? (
            <div className="text-center py-16 px-4">
              <ShoppingBag className="w-12 h-12 text-[#73777f] mx-auto mb-3 opacity-40" />
              <p className="font-bold text-[#1A242D] text-base mb-1">
                Your cart is empty
              </p>
              <p className="text-xs text-[#5A6872] mb-6">
                Explore solar power, tech flagships, home goods and verified deals in Sierra Leone.
              </p>
              <button
                onClick={onClose}
                className="bg-[#0B3B60] hover:bg-[#002541] text-white px-5 py-2 rounded text-xs font-bold transition-colors cursor-pointer"
              >
                Start Shopping
              </button>
            </div>
          ) : (
            items.map(({ product, quantity }) => (
              <div
                key={product.id}
                className="p-3 bg-white rounded border border-[#DCE1E5] flex gap-3 items-center justify-between"
              >
                {/* Thumbnail */}
                <div className="w-16 h-16 rounded bg-[#F8F9FA] overflow-hidden shrink-0 border border-[#DCE1E5]">
                  <img
                    src={product.image}
                    alt={product.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 pr-2">
                  <h4 className="text-xs font-semibold text-[#1A242D] line-clamp-1">
                    {product.title}
                  </h4>
                  <div className="text-[11px] text-[#00875A] font-medium">
                    {product.sellerLocation}
                  </div>
                  <div className="text-xs font-extrabold text-[#0B3B60] tabular-nums mt-0.5">
                    SLE {new Intl.NumberFormat('en-US').format(product.priceSLE)}
                  </div>
                </div>

                {/* Quantity Controls & Remove */}
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <button
                    onClick={() => onRemoveItem(product.id)}
                    className="text-[#ba1a1a] hover:text-[#93000a] p-1 text-xs"
                    title="Remove item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  <div className="flex items-center border border-[#DCE1E5] rounded bg-white">
                    <button
                      onClick={() => onUpdateQuantity(product.id, quantity - 1)}
                      className="px-2 py-0.5 text-xs font-bold text-[#0B3B60] hover:bg-[#eaf5ff]"
                    >
                      -
                    </button>
                    <span className="px-2 text-xs font-bold tabular-nums min-w-6 text-center">
                      {quantity}
                    </span>
                    <button
                      onClick={() => onUpdateQuantity(product.id, Math.min(product.stockCount, quantity + 1))}
                      disabled={quantity >= product.stockCount}
                      className="px-2 py-0.5 text-xs font-bold text-[#0B3B60] hover:bg-[#eaf5ff] disabled:opacity-30"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Summary Footer */}
        {items.length > 0 && (
          <div className="p-4 bg-[#F4F6F8] border-t border-[#DCE1E5] space-y-3">
            {/* Delivery destination note */}
            <div className="flex items-center justify-between text-xs text-[#5A6872] bg-white p-2.5 rounded border border-[#DCE1E5]">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#00875A]" />
                <span className="truncate max-w-[180px]">Delivery to: <strong>{currentLocation.name}</strong></span>
              </div>
              <span className="font-semibold text-[#1A242D]">
                SLE {currentLocation.deliveryFeeSLE}
              </span>
            </div>

            {/* Calculations */}
            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-[#5A6872]">
                <span>Items Subtotal:</span>
                <span className="font-semibold text-[#1A242D] tabular-nums">
                  SLE {new Intl.NumberFormat('en-US').format(subtotal)}
                </span>
              </div>
              <div className="flex justify-between text-[#5A6872]">
                <span>Logistics & Handling:</span>
                <span className="font-semibold text-[#1A242D] tabular-nums">
                  SLE {currentLocation.deliveryFeeSLE}
                </span>
              </div>
              <div className="flex justify-between text-sm font-extrabold text-[#0B3B60] pt-1 border-t border-[#DCE1E5]">
                <span>Total Amount:</span>
                <span className="text-base tabular-nums">
                  SLE {new Intl.NumberFormat('en-US').format(totalWithDelivery)}
                </span>
              </div>
            </div>

            {/* Checkout Action */}
            <button
              onClick={() => {
                onProceedToCheckout();
                onClose();
              }}
              className="w-full h-11 bg-[#0B3B60] hover:bg-[#002541] text-white rounded font-bold text-sm flex items-center justify-center gap-2 shadow-md transition-colors cursor-pointer"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#5A6872]">
              <ShieldCheck className="w-3.5 h-3.5 text-[#00875A]" />
              <span>Cash on Delivery · Inspect before paying (No mobile money initially)</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
