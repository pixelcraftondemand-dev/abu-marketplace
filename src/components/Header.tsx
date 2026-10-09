import React from 'react';
import { 
  Search, 
  ShoppingCart, 
  Heart, 
  MapPin, 
  Store, 
  ChevronDown, 
  X 
} from 'lucide-react';
import { LocationNode, Category } from '../types';
import { AbuLogo } from './AbuLogo';

interface HeaderProps {
  currentLocation: LocationNode;
  onOpenLocationPicker: () => void;
  cartCount: number;
  wishlistCount: number;
  onOpenCart: () => void;
  onOpenWishlist: () => void;
  onOpenMerchantHub: () => void;
  onOpenOrderTracking: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedCategory: Category;
  onSelectCategory: (cat: Category) => void;
  activeView: 'marketplace' | 'services' | 'stores';
  onSelectView: (view: 'marketplace' | 'services' | 'stores') => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentLocation,
  onOpenLocationPicker,
  cartCount,
  wishlistCount,
  onOpenCart,
  onOpenWishlist,
  onOpenMerchantHub,
  searchQuery,
  onSearchChange,
  onSelectCategory,
  onSelectView,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[#002541] text-white shadow-xs">
      <div className="max-w-[1440px] mx-auto px-3 sm:px-6 py-2.5">
        <div className="flex items-center justify-between gap-2.5 sm:gap-6">
          {/* 1. Left: Brand & Monogram Logo */}
          <button 
            onClick={() => {
              onSelectView('marketplace');
              onSelectCategory('All');
            }} 
            className="flex items-center gap-2 text-left focus:outline-none shrink-0 group cursor-pointer"
          >
            <AbuLogo size={36} />
            <div className="flex flex-col">
              <span className="font-extrabold tracking-tight text-base sm:text-lg text-white group-hover:text-[#d0e4ff] transition-colors leading-tight">
                Abu
              </span>
              <span className="text-[10px] uppercase font-semibold text-[#8df7c1] tracking-wider leading-none hidden sm:block">
                Marketplace
              </span>
            </div>
          </button>

          {/* 2. Center: Minimalist Search Bar with "Search" Placeholder */}
          <div className="flex-1 max-w-xl mx-auto">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-[#73777f] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search"
                className="w-full h-9 pl-9 pr-8 bg-[#F4F6F8] text-[#1A242D] placeholder-[#73777f] text-xs sm:text-sm rounded-full border border-transparent focus:border-[#7fa6d0] focus:bg-white focus:outline-none transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 p-0.5"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* 3. Right: Essential Actions (Location, Create Store, Wishlist, Cart) */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {/* Quick Delivery Location Button */}
            <button
              onClick={onOpenLocationPicker}
              className="hidden md:flex items-center gap-1 text-xs text-[#d0e4ff] hover:text-white px-2 py-1 rounded transition-colors cursor-pointer"
              title="Change Delivery Location"
            >
              <MapPin className="w-3.5 h-3.5 text-[#8df7c1]" />
              <span className="truncate max-w-[110px]">{currentLocation.name.split('(')[0].trim()}</span>
              <ChevronDown className="w-3 h-3 text-[#7fa6d0]" />
            </button>

            {/* "Create Store" Action Button */}
            <button
              onClick={onOpenMerchantHub}
              className="text-xs font-semibold text-white bg-[#0b3b60] hover:bg-[#144b77] px-2.5 sm:px-3 py-1.5 rounded transition-colors cursor-pointer flex items-center gap-1.5"
              title="Create Store"
            >
              <Store className="w-3.5 h-3.5 text-[#8df7c1]" />
              <span className="whitespace-nowrap">Create Store</span>
            </button>

            {/* Wishlist Icon */}
            <button
              onClick={onOpenWishlist}
              className="relative p-1.5 text-[#d0e4ff] hover:text-white transition-colors"
              title="Wishlist"
              aria-label="Wishlist"
            >
              <Heart className="w-4 h-4" />
              {wishlistCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#D84315] text-white text-[9px] font-bold h-3.5 w-3.5 rounded-full flex items-center justify-center">
                  {wishlistCount}
                </span>
              )}
            </button>

            {/* Cart Icon */}
            <button
              onClick={onOpenCart}
              className="relative p-1.5 text-[#d0e4ff] hover:text-white transition-colors"
              title="Cart"
              aria-label="Cart"
            >
              <ShoppingCart className="w-4 h-4" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#8df7c1] text-[#002541] text-[9px] font-extrabold h-3.5 w-3.5 rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
