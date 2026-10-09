import React from 'react';
import { 
  Search, 
  ShoppingCart, 
  Heart, 
  MapPin, 
  Store, 
  ChevronDown, 
  X,
  MessageSquare,
  CheckCircle2,
  PhoneCall,
  Clock,
  Sparkles,
  Sun,
  Smartphone,
  Headphones,
  UtensilsCrossed,
  Wrench,
  Package
} from 'lucide-react';
import { LocationNode, Category, UserProfile } from '../types';
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
  currentUser: UserProfile | null;
  onOpenWhatsAppAuth: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentLocation,
  onOpenLocationPicker,
  cartCount,
  wishlistCount,
  onOpenCart,
  onOpenWishlist,
  onOpenMerchantHub,
  onOpenOrderTracking,
  searchQuery,
  onSearchChange,
  selectedCategory,
  onSelectCategory,
  activeView,
  onSelectView,
  currentUser,
  onOpenWhatsAppAuth,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[#002541] text-white shadow-sm">
      {/* 1. Top Global Announcement Bar for Full Website Experience */}
      <div className="bg-[#001B30] text-[#A7C8E8] text-[11px] py-1.5 px-3 sm:px-6 border-b border-[#0B3B60]">
        <div className="max-w-[1440px] w-full mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 truncate">
            <span className="bg-[#059669] text-white font-extrabold text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0">
              Cash on Delivery
            </span>
            <span className="truncate">
              🇸🇱 Sierra Leone&apos;s Verified Digital Commerce Portal · Free transit over SLE 500 · Strictly Pay on Delivery (No mobile money initially)
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-4 shrink-0 text-[11px]">
            <button
              onClick={onOpenOrderTracking}
              className="hover:text-white transition-colors cursor-pointer flex items-center gap-1"
            >
              <Package className="w-3.5 h-3.5 text-[#8df7c1]" />
              <span>Track Order</span>
            </button>

            <a
              href="https://wa.me/23276892411?text=Hello%20Abu%20Marketplace%20Customer%20Support"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#25D366] hover:text-[#52e78c] font-semibold flex items-center gap-1 transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5 fill-current" />
              <span>WhatsApp Desk: 076 892 411</span>
            </a>
          </div>
        </div>
      </div>

      {/* 2. Main Brand & Navigation Strip */}
      <div className="max-w-[1440px] w-full mx-auto px-3 sm:px-6 py-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2.5 sm:gap-6">
          {/* Brand & Monogram Logo */}
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

          {/* Center Search Bar (full-width row on mobile, inline on desktop) */}
          <div className="order-3 w-full min-w-0 sm:order-none sm:w-auto sm:flex-1 sm:max-w-xl sm:mx-auto">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-[#73777f] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search fashion, solar inverters, phones, home appliances..."
                className="w-full h-9 pl-9 pr-8 bg-[#F4F6F8] text-[#1A242D] placeholder-[#73777f] text-xs sm:text-sm rounded-full border border-transparent focus:border-[#7fa6d0] focus:bg-white focus:outline-none transition-all shadow-2xs"
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 p-0.5 cursor-pointer"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Right Action Controls: WhatsApp Login, Location, Create Store, Wishlist, Cart */}
          <div className="flex items-center gap-1 sm:gap-2.5 shrink-0">
            {/* Quick Delivery Location Button */}
            <button
              onClick={onOpenLocationPicker}
              className="hidden lg:flex items-center gap-1 text-xs text-[#d0e4ff] hover:text-white px-2 py-1 rounded transition-colors cursor-pointer"
              title="Change Delivery Location"
            >
              <MapPin className="w-3.5 h-3.5 text-[#8df7c1]" />
              <span className="truncate max-w-[100px]">{currentLocation.name.split('(')[0].trim()}</span>
              <ChevronDown className="w-3 h-3 text-[#7fa6d0]" />
            </button>

            {/* FUNCTIONAL WHATSAPP LOGIN / PROFILE BUTTON */}
            {currentUser ? (
              <button
                type="button"
                onClick={onOpenWhatsAppAuth}
                className="bg-[#075E54] hover:bg-[#09796B] border border-[#25D366]/40 text-white px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2 transition-all shadow-2xs cursor-pointer"
                title="View WhatsApp Profile"
              >
                <div className="relative">
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.name}
                    className="w-5 h-5 rounded-full object-cover border border-[#25D366]"
                  />
                  <span className="w-2 h-2 rounded-full bg-[#25D366] absolute -bottom-0.5 -right-0.5 ring-1 ring-[#002541]"></span>
                </div>
                <span className="hidden sm:inline truncate max-w-[90px]">{currentUser.name.split(' ')[0]}</span>
                <span className="text-[10px] text-[#25D366] font-extrabold hidden md:inline">Verified</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenWhatsAppAuth}
                className="bg-[#25D366] hover:bg-[#1EBE5D] text-[#002541] p-2.5 sm:px-3 sm:py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs hover:shadow-md cursor-pointer shrink-0"
                title="Sign in with WhatsApp"
                aria-label="Sign in with WhatsApp"
              >
                <MessageSquare className="w-3.5 h-3.5 fill-current text-[#002541]" />
                <span className="whitespace-nowrap hidden sm:inline">WhatsApp Login</span>
              </button>
            )}

            {/* "Create Store" Action Button */}
            <button
              onClick={onOpenMerchantHub}
              className="text-xs font-semibold text-white bg-[#0b3b60] hover:bg-[#144b77] p-2.5 sm:px-3 sm:py-1.5 rounded transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
              title="Create Store"
              aria-label="Create Store"
            >
              <Store className="w-3.5 h-3.5 text-[#8df7c1]" />
              <span className="whitespace-nowrap hidden sm:inline">Create Store</span>
            </button>

            {/* Wishlist Icon */}
            <button
              onClick={onOpenWishlist}
              className="relative p-2.5 text-[#d0e4ff] hover:text-white transition-colors cursor-pointer"
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
              className="relative p-2.5 text-[#d0e4ff] hover:text-white transition-colors cursor-pointer"
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

      {/* 3. Desktop Category Sub-Nav Bar (Ensures Website Layout, No App-Like Empty Space) */}
      <div className="bg-[#0B3B60] text-xs border-t border-[#144b77]/60 overflow-x-auto scrollbar-none">
        <div className="max-w-[1440px] w-full mx-auto px-3 sm:px-6 flex items-center gap-1 sm:gap-2 py-1.5">
          <button
            onClick={() => {
              onSelectView('marketplace');
              onSelectCategory('All');
            }}
            className={`px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
              activeView === 'marketplace' && selectedCategory === 'All'
                ? 'bg-white text-[#002541] font-bold shadow-2xs'
                : 'text-[#d0e4ff] hover:text-white hover:bg-white/10'
            }`}
          >
            All Products
          </button>

          <button
            onClick={() => {
              onSelectView('marketplace');
              onSelectCategory('Fashion & Footwear');
            }}
            className={`px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1 cursor-pointer ${
              activeView === 'marketplace' && selectedCategory === 'Fashion & Footwear'
                ? 'bg-white text-[#002541] font-bold shadow-2xs'
                : 'text-[#d0e4ff] hover:text-white hover:bg-white/10'
            }`}
          >
            <Sparkles className="w-3 h-3 text-[#FFD700]" />
            <span>Fashion & Footwear</span>
          </button>

          <button
            onClick={() => {
              onSelectView('marketplace');
              onSelectCategory('Solar & Power');
            }}
            className={`px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1 cursor-pointer ${
              activeView === 'marketplace' && selectedCategory === 'Solar & Power'
                ? 'bg-white text-[#002541] font-bold shadow-2xs'
                : 'text-[#d0e4ff] hover:text-white hover:bg-white/10'
            }`}
          >
            <Sun className="w-3 h-3 text-[#FF9800]" />
            <span>Solar & Power</span>
          </button>

          <button
            onClick={() => {
              onSelectView('marketplace');
              onSelectCategory('Phones & Tablets');
            }}
            className={`px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1 cursor-pointer ${
              activeView === 'marketplace' && selectedCategory === 'Phones & Tablets'
                ? 'bg-white text-[#002541] font-bold shadow-2xs'
                : 'text-[#d0e4ff] hover:text-white hover:bg-white/10'
            }`}
          >
            <Smartphone className="w-3 h-3 text-[#8df7c1]" />
            <span>Phones & Tech</span>
          </button>

          <button
            onClick={() => {
              onSelectView('marketplace');
              onSelectCategory('Home & Living');
            }}
            className={`px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1 cursor-pointer ${
              activeView === 'marketplace' && selectedCategory === 'Home & Living'
                ? 'bg-white text-[#002541] font-bold shadow-2xs'
                : 'text-[#d0e4ff] hover:text-white hover:bg-white/10'
            }`}
          >
            <UtensilsCrossed className="w-3 h-3 text-[#d0e4ff]" />
            <span>Home & Living</span>
          </button>

          <button
            onClick={() => {
              onSelectView('marketplace');
              onSelectCategory('Electronics & Audio');
            }}
            className={`px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1 cursor-pointer ${
              activeView === 'marketplace' && selectedCategory === 'Electronics & Audio'
                ? 'bg-white text-[#002541] font-bold shadow-2xs'
                : 'text-[#d0e4ff] hover:text-white hover:bg-white/10'
            }`}
          >
            <Headphones className="w-3 h-3 text-[#d0e4ff]" />
            <span>Electronics & Audio</span>
          </button>

          <div className="w-[1px] h-4 bg-white/20 mx-1 hidden sm:block"></div>

          <button
            onClick={() => onSelectView('services')}
            className={`px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1 cursor-pointer ${
              activeView === 'services'
                ? 'bg-[#8df7c1] text-[#002541] font-bold shadow-2xs'
                : 'text-[#8df7c1] hover:bg-white/10'
            }`}
          >
            <Wrench className="w-3 h-3" />
            <span>Artisan Services</span>
          </button>

          <button
            onClick={() => onSelectView('stores')}
            className={`px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1 cursor-pointer ${
              activeView === 'stores'
                ? 'bg-white text-[#002541] font-bold shadow-2xs'
                : 'text-[#d0e4ff] hover:text-white hover:bg-white/10'
            }`}
          >
            <Store className="w-3 h-3" />
            <span>Merchant Stores</span>
          </button>
        </div>
      </div>
    </header>
  );
};

