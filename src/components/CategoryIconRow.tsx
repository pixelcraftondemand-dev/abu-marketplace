import React from 'react';
import { 
  Sun, 
  Smartphone, 
  Headphones, 
  Home,
  Shirt, 
  Wrench, 
  LayoutGrid,
  UtensilsCrossed,
  Armchair,
  Sparkles,
  Baby,
  Trophy,
  Hammer,
  Bike,
  BookOpen
} from 'lucide-react';
import { Category } from '../types';

interface CategoryIconRowProps {
  selectedCategory: Category;
  onSelectCategory: (cat: Category) => void;
  activeView: 'marketplace' | 'services' | 'stores';
  onSelectView: (view: 'marketplace' | 'services' | 'stores') => void;
}

export const CategoryIconRow: React.FC<CategoryIconRowProps> = ({
  selectedCategory,
  onSelectCategory,
  activeView,
  onSelectView,
}) => {
  const items = [
    {
      label: 'All Items',
      sublabel: 'Full Catalog',
      icon: LayoutGrid,
      color: '#0B3B60',
      bgColor: 'bg-blue-50 dark:bg-blue-950/40',
      textColor: 'text-blue-600 dark:text-blue-400',
      onClick: () => {
        onSelectView('marketplace');
        onSelectCategory('All');
      },
      isActive: activeView === 'marketplace' && selectedCategory === 'All',
    },
    {
      label: 'Groceries',
      sublabel: 'Foods & Drinks',
      icon: UtensilsCrossed,
      color: '#059669',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950/40',
      textColor: 'text-emerald-600 dark:text-emerald-400',
      onClick: () => {
        onSelectView('marketplace');
        onSelectCategory('Groceries & Non-Perishables');
      },
      isActive: activeView === 'marketplace' && selectedCategory === 'Groceries & Non-Perishables',
    },
    {
      label: 'Furniture & Office',
      sublabel: 'Desks & Chairs',
      icon: Armchair,
      color: '#B45309',
      bgColor: 'bg-amber-50 dark:bg-amber-950/40',
      textColor: 'text-amber-700 dark:text-amber-400',
      onClick: () => {
        onSelectView('marketplace');
        onSelectCategory('Home & Office Furniture');
      },
      isActive: activeView === 'marketplace' && selectedCategory === 'Home & Office Furniture',
    },
    {
      label: 'Appliances',
      sublabel: 'Kitchen & Cleaning',
      icon: Home,
      color: '#EA580C',
      bgColor: 'bg-orange-50 dark:bg-orange-950/40',
      textColor: 'text-orange-600 dark:text-orange-400',
      onClick: () => {
        onSelectView('marketplace');
        onSelectCategory('Appliances & Utensils');
      },
      isActive: activeView === 'marketplace' && selectedCategory === 'Appliances & Utensils',
    },
    {
      label: 'Solar & Power',
      sublabel: 'Inverters & PV',
      icon: Sun,
      color: '#D97706',
      bgColor: 'bg-amber-50 dark:bg-amber-950/40',
      textColor: 'text-amber-600 dark:text-amber-400',
      onClick: () => {
        onSelectView('marketplace');
        onSelectCategory('Solar & Power');
      },
      isActive: activeView === 'marketplace' && selectedCategory === 'Solar & Power',
    },
    {
      label: 'Phones & Tech',
      sublabel: 'Tablets & SIM',
      icon: Smartphone,
      color: '#0284C7',
      bgColor: 'bg-sky-50 dark:bg-sky-950/40',
      textColor: 'text-sky-600 dark:text-sky-400',
      onClick: () => {
        onSelectView('marketplace');
        onSelectCategory('Phones & Tablets');
      },
      isActive: activeView === 'marketplace' && selectedCategory === 'Phones & Tablets',
    },
    {
      label: 'Electronics',
      sublabel: 'Audio & Sound',
      icon: Headphones,
      color: '#6366F1',
      bgColor: 'bg-indigo-50 dark:bg-indigo-950/40',
      textColor: 'text-indigo-600 dark:text-indigo-400',
      onClick: () => {
        onSelectView('marketplace');
        onSelectCategory('Electronics & Audio');
      },
      isActive: activeView === 'marketplace' && selectedCategory === 'Electronics & Audio',
    },
    {
      label: 'Beauty & Hygiene',
      sublabel: 'Perfumes & Care',
      icon: Sparkles,
      color: '#EC4899',
      bgColor: 'bg-pink-50 dark:bg-pink-950/40',
      textColor: 'text-pink-600 dark:text-pink-400',
      onClick: () => {
        onSelectView('marketplace');
        onSelectCategory('Beauty, Perfumes & Hygiene');
      },
      isActive: activeView === 'marketplace' && selectedCategory === 'Beauty, Perfumes & Hygiene',
    },
    {
      label: 'Baby & Kids',
      sublabel: 'Essentials & Toys',
      icon: Baby,
      color: '#8B5CF6',
      bgColor: 'bg-purple-50 dark:bg-purple-950/40',
      textColor: 'text-purple-600 dark:text-purple-400',
      onClick: () => {
        onSelectView('marketplace');
        onSelectCategory('Baby & Kids Toys');
      },
      isActive: activeView === 'marketplace' && selectedCategory === 'Baby & Kids Toys',
    },
    {
      label: 'Sports & Jerseys',
      sublabel: 'Gears & Boots',
      icon: Trophy,
      color: '#10B981',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950/40',
      textColor: 'text-emerald-600 dark:text-emerald-400',
      onClick: () => {
        onSelectView('marketplace');
        onSelectCategory('Sports Gears & Jerseys');
      },
      isActive: activeView === 'marketplace' && selectedCategory === 'Sports Gears & Jerseys',
    },
    {
      label: 'Tools & Safety',
      sublabel: 'Drills & Boots',
      icon: Hammer,
      color: '#E11D48',
      bgColor: 'bg-rose-50 dark:bg-rose-950/40',
      textColor: 'text-rose-600 dark:text-rose-400',
      onClick: () => {
        onSelectView('marketplace');
        onSelectCategory('Power Tools & Safety Gear');
      },
      isActive: activeView === 'marketplace' && selectedCategory === 'Power Tools & Safety Gear',
    },
    {
      label: 'Vehicles & E-Bikes',
      sublabel: 'Bikes & Scooters',
      icon: Bike,
      color: '#0D9488',
      bgColor: 'bg-teal-50 dark:bg-teal-950/40',
      textColor: 'text-teal-600 dark:text-teal-400',
      onClick: () => {
        onSelectView('marketplace');
        onSelectCategory('Vehicles & E-Bikes');
      },
      isActive: activeView === 'marketplace' && selectedCategory === 'Vehicles & E-Bikes',
    },
    {
      label: 'Books, Art & School',
      sublabel: 'Art & Stationery',
      icon: BookOpen,
      color: '#4F46E5',
      bgColor: 'bg-indigo-50 dark:bg-indigo-950/40',
      textColor: 'text-indigo-600 dark:text-indigo-400',
      onClick: () => {
        onSelectView('marketplace');
        onSelectCategory('Books, Art & Stationery');
      },
      isActive: activeView === 'marketplace' && selectedCategory === 'Books, Art & Stationery',
    },
    {
      label: 'Fashion',
      sublabel: 'Wear & Shoes',
      icon: Shirt,
      color: '#9333EA',
      bgColor: 'bg-purple-50 dark:bg-purple-950/40',
      textColor: 'text-purple-600 dark:text-purple-400',
      onClick: () => {
        onSelectView('marketplace');
        onSelectCategory('Fashion & Footwear');
      },
      isActive: activeView === 'marketplace' && selectedCategory === 'Fashion & Footwear',
    },
    {
      label: 'Artisans',
      sublabel: 'Trade Pros',
      icon: Wrench,
      color: '#00875A',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950/40',
      textColor: 'text-emerald-600 dark:text-emerald-400',
      onClick: () => {
        onSelectView('services');
      },
      isActive: activeView === 'services',
    },
  ];

  return (
    <div id="category-scroll-container" className="max-w-[1440px] mx-auto px-3 sm:px-6 pt-3 pb-1 w-full max-w-full overflow-hidden scroll-mt-24">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight">
          Shop by Category
        </h3>
        <button
          onClick={() => {
            onSelectView('marketplace');
            onSelectCategory('All');
          }}
          className="text-xs text-[#00875A] hover:underline font-bold cursor-pointer shrink-0"
        >
          View all items &gt;
        </button>
      </div>

      {/* Pure Icon-Based Category Cards (Zero Pictures/Photos, Smooth Mobile & Desktop Carousel with touch snap) */}
      <div className="flex gap-2 sm:gap-2.5 py-1 overflow-x-auto no-scrollbar scroll-smooth w-full pb-2 snap-x snap-mandatory touch-pan-x">
        {items.map((item, idx) => {
          const Icon = item.icon;
          return (
            <button
              key={idx}
              onClick={item.onClick}
              className={`flex flex-col items-center justify-center p-2 sm:p-2.5 rounded-2xl transition-all duration-200 group cursor-pointer focus:outline-none border text-center shrink-0 w-[78px] sm:w-[94px] snap-start min-h-[82px] sm:min-h-[96px] ${
                item.isActive
                  ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-[#00875A] shadow-xs ring-1 ring-[#00875A]/30'
                  : 'bg-white dark:bg-[#111D27] border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-2xs active:scale-[0.98]'
              }`}
            >
              {/* Icon Container */}
              <div 
                className={`w-9 h-9 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center transition-all duration-200 mb-1.5 ${
                  item.isActive 
                    ? 'bg-[#00875A] text-white shadow-xs scale-105' 
                    : `${item.bgColor} ${item.textColor} group-hover:scale-105`
                }`}
              >
                <Icon className="w-4.5 h-4.5 sm:w-5.5 sm:h-5.5" strokeWidth={2.2} />
              </div>

              {/* Label */}
              <span
                className={`text-[10px] sm:text-[11px] font-bold leading-tight transition-colors text-center truncate max-w-full block ${
                  item.isActive 
                    ? 'text-[#00875A] dark:text-[#8df7c1]' 
                    : 'text-slate-700 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white'
                }`}
              >
                {item.label}
              </span>

              {/* Sublabel */}
              <span className="text-[9px] text-slate-400 dark:text-slate-500 truncate block mt-0.5 max-w-full">
                {item.sublabel}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
