import React from 'react';
import { 
  Sun, 
  Smartphone, 
  Headphones, 
  UtensilsCrossed, 
  Sparkles, 
  Wrench, 
  Building2,
  Grid
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
      icon: Grid,
      onClick: () => {
        onSelectView('marketplace');
        onSelectCategory('All');
      },
      isActive: activeView === 'marketplace' && selectedCategory === 'All',
    },
    {
      label: 'Solar & Power',
      icon: Sun,
      onClick: () => {
        onSelectView('marketplace');
        onSelectCategory('Solar & Power');
      },
      isActive: activeView === 'marketplace' && selectedCategory === 'Solar & Power',
    },
    {
      label: 'Phones & Tech',
      icon: Smartphone,
      onClick: () => {
        onSelectView('marketplace');
        onSelectCategory('Phones & Tablets');
      },
      isActive: activeView === 'marketplace' && selectedCategory === 'Phones & Tablets',
    },
    {
      label: 'Audio & Gear',
      icon: Headphones,
      onClick: () => {
        onSelectView('marketplace');
        onSelectCategory('Electronics & Audio');
      },
      isActive: activeView === 'marketplace' && selectedCategory === 'Electronics & Audio',
    },
    {
      label: 'Home & Kitchen',
      icon: UtensilsCrossed,
      onClick: () => {
        onSelectView('marketplace');
        onSelectCategory('Home & Living');
      },
      isActive: activeView === 'marketplace' && selectedCategory === 'Home & Living',
    },
    {
      label: 'Fashion & Wear',
      icon: Sparkles,
      onClick: () => {
        onSelectView('marketplace');
        onSelectCategory('Fashion & Footwear');
      },
      isActive: activeView === 'marketplace' && selectedCategory === 'Fashion & Footwear',
    },
  ];

  return (
    <div className="max-w-[1440px] w-full mx-auto px-3 sm:px-6 py-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#5A6872]">
          Shop by Category
        </h3>
        <button
          onClick={() => {
            onSelectView('marketplace');
            onSelectCategory('All');
          }}
          className="text-xs text-[#0B3B60] hover:underline font-semibold"
        >
          View All
        </button>
      </div>

      <div className="flex items-center gap-3 sm:gap-6 overflow-x-auto no-scrollbar py-1">
        {items.map((item, idx) => {
          const Icon = item.icon;
          return (
            <button
              key={idx}
              onClick={item.onClick}
              className="flex flex-col items-center gap-1.5 shrink-0 group cursor-pointer focus:outline-none"
            >
              <div
                className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all ${
                  item.isActive
                    ? 'bg-[#0B3B60] text-white shadow-sm ring-2 ring-[#0B3B60] ring-offset-2'
                    : 'bg-white text-[#1A242D] border border-[#E7ECF0] hover:border-[#0B3B60] group-hover:bg-[#F4F6F8]'
                }`}
              >
                <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <span
                className={`text-[11px] font-semibold whitespace-nowrap ${
                  item.isActive ? 'text-[#0B3B60] font-bold' : 'text-[#5A6872] group-hover:text-[#1A242D]'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
