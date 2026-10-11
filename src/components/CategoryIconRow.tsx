import React from 'react';
import { 
  Sun, 
  Smartphone, 
  Headphones, 
  Home,
  Shirt, 
  Wrench, 
  LayoutGrid,
  Zap
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
      sublabel: 'Catalog',
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
      label: 'Home & Living',
      sublabel: 'Appliances',
      icon: Home,
      color: '#EA580C',
      bgColor: 'bg-orange-50 dark:bg-orange-950/40',
      textColor: 'text-orange-600 dark:text-orange-400',
      onClick: () => {
        onSelectView('marketplace');
        onSelectCategory('Home & Living');
      },
      isActive: activeView === 'marketplace' && selectedCategory === 'Home & Living',
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
    <div className="max-w-[1440px] mx-auto px-3 sm:px-6 pt-3 pb-1">
      <div className="flex items-center justify-between mb-2.5">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight">
          Shop by Category
        </h3>
        <button
          onClick={() => {
            onSelectView('marketplace');
            onSelectCategory('All');
          }}
          className="text-xs text-[#00875A] hover:underline font-bold cursor-pointer"
        >
          View all items &gt;
        </button>
      </div>

      {/* Pure Icon-Based Category Cards (Zero Pictures/Photos) */}
      <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 sm:gap-3 py-1">
        {items.map((item, idx) => {
          const Icon = item.icon;
          return (
            <button
              key={idx}
              onClick={item.onClick}
              className={`flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-2xl transition-all duration-200 group cursor-pointer focus:outline-none border text-center ${
                item.isActive
                  ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-[#00875A] shadow-xs ring-1 ring-[#00875A]/30'
                  : 'bg-white dark:bg-[#111D27] border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-2xs active:scale-[0.98]'
              }`}
            >
              {/* Icon Container */}
              <div 
                className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center transition-all duration-200 mb-1.5 ${
                  item.isActive 
                    ? 'bg-[#00875A] text-white shadow-xs scale-105' 
                    : `${item.bgColor} ${item.textColor} group-hover:scale-105`
                }`}
              >
                <Icon className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={2.2} />
              </div>

              {/* Label */}
              <span
                className={`text-[11px] sm:text-xs font-bold whitespace-nowrap leading-tight transition-colors ${
                  item.isActive 
                    ? 'text-[#00875A] dark:text-[#8df7c1]' 
                    : 'text-slate-700 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white'
                }`}
              >
                {item.label}
              </span>

              {/* Sublabel */}
              <span className="text-[9px] sm:text-[10px] text-slate-400 dark:text-slate-500 whitespace-nowrap hidden sm:block mt-0.5">
                {item.sublabel}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
