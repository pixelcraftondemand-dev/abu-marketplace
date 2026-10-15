import React from 'react';
import { 
  ShoppingBag, 
  LayoutGrid, 
  Wrench, 
  Building2, 
  ShoppingCart,
  User
} from 'lucide-react';
import { Category, UserProfile, LocationNode } from '../types';

interface MobileBottomBarProps {
  activeView: 'marketplace' | 'services' | 'stores';
  onSelectView: (view: 'marketplace' | 'services' | 'stores') => void;
  selectedCategory: Category;
  onSelectCategory: (cat: Category) => void;
  cartCount: number;
  onOpenCart: () => void;
  currentUser?: UserProfile | null;
  onOpenWhatsAppAuth?: () => void;
}

export const MobileBottomBar: React.FC<MobileBottomBarProps> = ({
  activeView,
  onSelectView,
  selectedCategory,
  onSelectCategory,
  cartCount,
  onOpenCart,
  currentUser,
  onOpenWhatsAppAuth,
}) => {
  return (
    <nav
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#002541]/95 backdrop-blur-md border-t border-slate-200 dark:border-[#0B3B60] shadow-[0_-4px_16px_rgba(0,0,0,0.08)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.3)] transition-colors duration-200"
      style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom, 0.5rem))' }}
    >
      <div className="grid grid-cols-5 h-14 items-center px-1 max-w-md mx-auto">
        {/* 1. Shop / Marketplace */}
        <button
          type="button"
          onClick={() => {
            onSelectView('marketplace');
            if (activeView === 'marketplace' && selectedCategory !== 'All') {
              onSelectCategory('All');
            }
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className={`flex flex-col items-center justify-center min-h-[44px] py-1 transition-all cursor-pointer relative ${
            activeView === 'marketplace' && selectedCategory === 'All'
              ? 'text-[#00875A] dark:text-[#8df7c1]'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
          aria-label="Shop Catalog"
        >
          <div className="relative">
            <ShoppingBag className="w-5 h-5" strokeWidth={activeView === 'marketplace' && selectedCategory === 'All' ? 2.5 : 2} />
            {activeView === 'marketplace' && selectedCategory === 'All' && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#00875A] dark:bg-[#8df7c1] absolute -bottom-1 left-1/2 -translate-x-1/2" />
            )}
          </div>
          <span className="text-[10px] font-bold mt-1 leading-none tracking-tight">Shop</span>
        </button>

        {/* 2. Categories */}
        <button
          type="button"
          onClick={() => {
            onSelectView('marketplace');
            const catElem = document.getElementById('category-scroll-container');
            if (catElem) {
              catElem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
          }}
          className={`flex flex-col items-center justify-center min-h-[44px] py-1 transition-all cursor-pointer relative ${
            activeView === 'marketplace' && selectedCategory !== 'All'
              ? 'text-[#00875A] dark:text-[#8df7c1]'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
          aria-label="Browse Categories"
        >
          <div className="relative">
            <LayoutGrid className="w-5 h-5" strokeWidth={activeView === 'marketplace' && selectedCategory !== 'All' ? 2.5 : 2} />
            {activeView === 'marketplace' && selectedCategory !== 'All' && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#00875A] dark:bg-[#8df7c1] absolute -bottom-1 left-1/2 -translate-x-1/2" />
            )}
          </div>
          <span className="text-[10px] font-bold mt-1 leading-none tracking-tight">Categories</span>
        </button>

        {/* 3. Blue-Collar Artisans */}
        <button
          type="button"
          onClick={() => {
            onSelectView('services');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className={`flex flex-col items-center justify-center min-h-[44px] py-1 transition-all cursor-pointer relative ${
            activeView === 'services'
              ? 'text-[#00875A] dark:text-[#8df7c1]'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
          aria-label="Certified Artisans"
        >
          <div className="relative">
            <Wrench className="w-5 h-5" strokeWidth={activeView === 'services' ? 2.5 : 2} />
            {activeView === 'services' && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#00875A] dark:bg-[#8df7c1] absolute -bottom-1 left-1/2 -translate-x-1/2" />
            )}
          </div>
          <span className="text-[10px] font-bold mt-1 leading-none tracking-tight">Artisans</span>
        </button>

        {/* 4. Showroom Stores */}
        <button
          type="button"
          onClick={() => {
            onSelectView('stores');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className={`flex flex-col items-center justify-center min-h-[44px] py-1 transition-all cursor-pointer relative ${
            activeView === 'stores'
              ? 'text-[#00875A] dark:text-[#8df7c1]'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
          aria-label="Stores and Showrooms"
        >
          <div className="relative">
            <Building2 className="w-5 h-5" strokeWidth={activeView === 'stores' ? 2.5 : 2} />
            {activeView === 'stores' && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#00875A] dark:bg-[#8df7c1] absolute -bottom-1 left-1/2 -translate-x-1/2" />
            )}
          </div>
          <span className="text-[10px] font-bold mt-1 leading-none tracking-tight">Stores</span>
        </button>

        {/* 5. Cart or Account */}
        <button
          type="button"
          onClick={onOpenCart}
          className="flex flex-col items-center justify-center min-h-[44px] py-1 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer relative"
          aria-label="Shopping Cart"
        >
          <div className="relative">
            <ShoppingCart className="w-5 h-5" strokeWidth={2} />
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-2.5 bg-[#00875A] text-white text-[9px] font-black h-4 min-w-4 px-1 rounded-full flex items-center justify-center shadow-xs">
                {cartCount}
              </span>
            )}
          </div>
          <span className="text-[10px] font-bold mt-1 leading-none tracking-tight">Cart</span>
        </button>
      </div>
    </nav>
  );
};
