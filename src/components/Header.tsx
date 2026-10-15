import React from 'react';
import { 
  Search, 
  ShoppingCart, 
  Heart, 
  MapPin, 
  Store, 
  ChevronDown, 
  X,
  User
} from 'lucide-react';
import { LocationNode, Category, UserProfile } from '../types';
import { AbuLogo } from './AbuLogo';
import { ThemeToggle } from './ThemeToggle';
import { ThemeMode } from '../lib/theme';

interface HeaderProps {
  currentLocation: LocationNode;
  onOpenLocationPicker: () => void;
  cartCount: number;
  wishlistCount: number;
  onOpenCart: () => void;
  onOpenWishlist: () => void;
  onOpenOrderTracking: () => void;
  onOpenMerchantHub: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedCategory: Category;
  onSelectCategory: (cat: Category) => void;
  activeView: 'marketplace' | 'services' | 'stores';
  onSelectView: (view: 'marketplace' | 'services' | 'stores') => void;
  currentUser?: UserProfile | null;
  onOpenWhatsAppAuth?: () => void;
  isShopApproved?: boolean;
  theme?: ThemeMode;
  onToggleTheme?: () => void;
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
  currentUser,
  onOpenWhatsAppAuth,
  isShopApproved = false,
  theme = 'light',
  onToggleTheme,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[#002541] text-white shadow-sm border-b border-[#0B3B60] w-full max-w-full overflow-x-clip">
      {/* Container with responsive padding */}
      <div className="max-w-[1440px] mx-auto px-2.5 sm:px-6 py-2 sm:py-2.5">
        {/* Main Row: Logo + (Desktop Search) + Action Buttons */}
        <div className="flex items-center justify-between gap-2 sm:gap-4 md:gap-6">
          {/* Brand & Monogram Logo + "Create Shop / My Shop" Portal */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0 min-w-0">
            <button 
              onClick={() => {
                onSelectView('marketplace');
                onSelectCategory('All');
              }} 
              className="flex items-center gap-1.5 sm:gap-2 text-left focus:outline-none shrink-0 group cursor-pointer"
              aria-label="ABU Marketplace Home"
            >
              <AbuLogo size={28} className="sm:hidden" />
              <AbuLogo size={32} className="hidden sm:inline-flex" />
              <div className="flex flex-col leading-none">
                <span className="font-black tracking-tight text-base sm:text-lg text-white group-hover:text-[#d0e4ff] transition-colors leading-none">
                  ABU
                </span>
                <span className="text-[9px] sm:text-[10px] uppercase font-bold text-[#8df7c1] tracking-wider mt-0.5 leading-none">
                  Marketplace
                </span>
              </div>
            </button>

            {/* Dedicated "Create Shop" / "My Shop" Button */}
            <button
              type="button"
              onClick={onOpenMerchantHub}
              className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-bold transition-all shadow-2xs hover:shadow-xs cursor-pointer border shrink-0 ${
                isShopApproved
                  ? 'bg-[#00875A] hover:bg-[#00704A] text-white border-[#8df7c1]/50'
                  : 'bg-[#082d49] hover:bg-[#0d3f66] text-[#8df7c1] hover:text-white border-[#8df7c1]/35'
              }`}
              title={isShopApproved ? "Open My Shop Dashboard & Listings" : "Create & Register Your Shop on ABU Marketplace"}
            >
              <Store className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#8df7c1] shrink-0" />
              <span className="whitespace-nowrap hidden sm:inline">{isShopApproved ? 'My Shop' : 'Create Shop'}</span>
              <span className="whitespace-nowrap sm:hidden">{isShopApproved ? 'Shop' : '+Shop'}</span>
              {isShopApproved && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#8df7c1] animate-pulse"></span>
              )}
            </button>
          </div>

          {/* Desktop Center Search Bar (Hidden on mobile, placed below for true mobile layout) */}
          <div className="hidden md:block flex-1 max-w-xl mx-auto min-w-[200px]">
            <div className="relative w-full flex items-center">
              <Search className="w-4 h-4 text-[#73777f] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="What are you looking for?"
                className="w-full h-9.5 pl-9.5 pr-20 bg-[#F4F6F8] text-[#1A242D] placeholder-[#73777f] text-xs sm:text-sm rounded-full border border-transparent focus:border-[#8df7c1] focus:bg-white focus:outline-none transition-all shadow-2xs"
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute right-16 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 p-0.5 cursor-pointer"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                className="absolute right-1 top-1 bottom-1 px-3 bg-[#00875A] hover:bg-[#00704A] text-white text-xs font-bold rounded-full flex items-center gap-1 transition-colors cursor-pointer shrink-0"
              >
                <Search className="w-3 h-3" />
                <span className="hidden lg:inline">Search</span>
              </button>
            </div>
          </div>

          {/* Right Action Controls: Location, Wishlist, Cart, Theme, Sign In */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* 1. Contextual Delivery Location Selector (Desktop only) */}
            <button
              onClick={onOpenLocationPicker}
              className="hidden xl:flex items-center gap-1.5 text-xs text-[#d0e4ff] hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
              title="Change Delivery Destination"
            >
              <MapPin className="w-3.5 h-3.5 text-[#8df7c1] shrink-0" />
              <div className="flex flex-col text-left leading-tight">
                <span className="text-[10px] text-[#7fa6d0]">Deliver to</span>
                <span className="truncate max-w-[90px] font-semibold">{currentLocation.name.split('(')[0].trim()}</span>
              </div>
              <ChevronDown className="w-3 h-3 text-[#7fa6d0] shrink-0" />
            </button>

            {/* 2. Wishlist (Saved Items) */}
            <button
              onClick={onOpenWishlist}
              className="relative p-1.5 sm:p-2 text-[#d0e4ff] hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer flex items-center justify-center shrink-0"
              title="Saved Items / Wishlist"
              aria-label="Wishlist"
            >
              <Heart className="w-4 h-4" />
              {wishlistCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-[#D84315] text-white text-[9px] font-extrabold h-4 w-4 rounded-full flex items-center justify-center ring-2 ring-[#002541]">
                  {wishlistCount}
                </span>
              )}
            </button>

            {/* 3. Shopping Cart */}
            <button
              onClick={onOpenCart}
              className="relative flex items-center gap-1 sm:gap-1.5 p-1.5 sm:px-3 sm:py-1.5 rounded-full bg-[#0b3b60] hover:bg-[#144b77] text-white text-xs font-semibold transition-all shadow-2xs hover:shadow-xs cursor-pointer shrink-0 border border-[#7fa6d0]/30"
              title="View Shopping Cart"
              aria-label="Cart"
            >
              <div className="relative">
                <ShoppingCart className="w-4 h-4 text-[#8df7c1]" />
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-[#00875A] text-white text-[9px] font-black h-3.5 w-3.5 rounded-full flex items-center justify-center ring-1 ring-[#002541]">
                    {cartCount}
                  </span>
                )}
              </div>
              <span className="hidden sm:inline font-bold">Cart</span>
            </button>

            {/* Light / Dark Mode Toggle */}
            {onToggleTheme && (
              <ThemeToggle theme={theme} onToggle={onToggleTheme} className="shrink-0" />
            )}

            {/* 4. Sign In / User Account */}
            {currentUser ? (
              <button
                type="button"
                onClick={onOpenWhatsAppAuth}
                className="bg-[#0b3b60] hover:bg-[#144b77] border border-[#8df7c1]/50 text-white p-1 sm:px-3 sm:py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 sm:gap-2 transition-all shadow-2xs hover:shadow-xs cursor-pointer shrink-0"
                title="View Account Profile"
              >
                <div className="relative shrink-0">
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.name}
                    className="w-5 h-5 rounded-full object-cover border border-[#8df7c1]"
                  />
                  <span className="w-2 h-2 rounded-full bg-[#16A34A] absolute -bottom-0.5 -right-0.5 ring-1 ring-[#002541]"></span>
                </div>
                <div className="hidden sm:flex flex-col text-left leading-none">
                  <span className="text-[10px] text-[#8df7c1] font-bold">Hi, {currentUser.name.split(' ')[0]}</span>
                  <span className="text-[11px] text-white font-medium hidden md:inline mt-0.5">Account</span>
                </div>
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenWhatsAppAuth}
                className="bg-white text-[#002541] hover:bg-[#F4F6F8] active:scale-[0.98] px-2 sm:px-4 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-bold flex items-center gap-1 sm:gap-1.5 transition-all shadow-xs hover:shadow-sm cursor-pointer shrink-0"
                title="Sign In with WhatsApp, Google or Apple"
              >
                <User className="w-3.5 h-3.5 text-[#00875A]" />
                <span className="whitespace-nowrap">Sign In</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Full-Width Search Row (Appears below logo and buttons on mobile, preventing horizontal blowouts) */}
        <div className="block md:hidden mt-2 pt-1 border-t border-white/10 w-full">
          <div className="relative w-full flex items-center">
            <Search className="w-4 h-4 text-[#73777f] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="What are you looking for on ABU?"
              className="w-full h-8.5 pl-8.5 pr-18 bg-[#F4F6F8] text-[#1A242D] placeholder-[#73777f] text-xs rounded-full border border-transparent focus:border-[#8df7c1] focus:bg-white focus:outline-none transition-all shadow-2xs"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-14 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 p-0.5 cursor-pointer"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              className="absolute right-1 top-1 bottom-1 px-2.5 bg-[#00875A] hover:bg-[#00704A] text-white text-[11px] font-bold rounded-full flex items-center gap-1 transition-colors cursor-pointer shrink-0"
            >
              <Search className="w-3 h-3" />
              <span>Search</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
