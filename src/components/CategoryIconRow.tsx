import React from 'react';
import { 
  Sun, 
  Smartphone, 
  Headphones, 
  UtensilsCrossed, 
  Sparkles, 
  Wrench, 
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
      image: null,
      onClick: () => {
        onSelectView('marketplace');
        onSelectCategory('All');
      },
      isActive: activeView === 'marketplace' && selectedCategory === 'All',
    },
    {
      label: 'Fashion',
      icon: Sparkles,
      image: '/products/leather_sandals_1791545917938.jpg',
      onClick: () => {
        onSelectView('marketplace');
        onSelectCategory('Fashion & Footwear');
      },
      isActive: activeView === 'marketplace' && selectedCategory === 'Fashion & Footwear',
    },
    {
      label: 'Solar & Power',
      icon: Sun,
      image: '/products/solar_inverter_power_station_1791485447453.jpg',
      onClick: () => {
        onSelectView('marketplace');
        onSelectCategory('Solar & Power');
      },
      isActive: activeView === 'marketplace' && selectedCategory === 'Solar & Power',
    },
    {
      label: 'Phones & Tech',
      icon: Smartphone,
      image: '/products/flagship_smartphone_device_1791485459581.jpg',
      onClick: () => {
        onSelectView('marketplace');
        onSelectCategory('Phones & Tablets');
      },
      isActive: activeView === 'marketplace' && selectedCategory === 'Phones & Tablets',
    },
    {
      label: 'Electronics',
      icon: Headphones,
      image: '/products/wireless_earbuds_anc_1791546935073.jpg',
      onClick: () => {
        onSelectView('marketplace');
        onSelectCategory('Electronics & Audio');
      },
      isActive: activeView === 'marketplace' && selectedCategory === 'Electronics & Audio',
    },
    {
      label: 'Home & Living',
      icon: UtensilsCrossed,
      image: '/products/digital_air_fryer_1791546864135.jpg',
      onClick: () => {
        onSelectView('marketplace');
        onSelectCategory('Home & Living');
      },
      isActive: activeView === 'marketplace' && selectedCategory === 'Home & Living',
    },
    {
      label: 'Artisans',
      icon: Wrench,
      image: null,
      onClick: () => {
        onSelectView('services');
      },
      isActive: activeView === 'services',
    },
  ];

  return (
    <div className="max-w-[1440px] mx-auto px-3 sm:px-6 pt-3 pb-1">
      <div className="flex items-center justify-between mb-2.5">
        <h3 className="text-sm font-bold text-[#1A242D] tracking-tight">
          Shop by Category
        </h3>
        <button
          onClick={() => {
            onSelectView('marketplace');
            onSelectCategory('All');
          }}
          className="text-xs text-[#00875A] hover:underline font-bold"
        >
          View all &gt;
        </button>
      </div>

      {/* Neat Rounded-2xl Category Cards (Matching User Reference Image) */}
      <div className="flex items-center gap-3 sm:gap-5 overflow-x-auto no-scrollbar py-1">
        {items.map((item, idx) => {
          const Icon = item.icon;
          return (
            <button
              key={idx}
              onClick={item.onClick}
              className="flex flex-col items-center gap-1.5 shrink-0 group cursor-pointer focus:outline-none"
            >
              <div
                className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl p-2 flex items-center justify-center overflow-hidden transition-all duration-200 ${
                  item.isActive
                    ? 'bg-[#E6F4EA] ring-2 ring-[#00875A] shadow-xs'
                    : 'bg-white border border-[#E7ECF0] hover:border-[#00875A] group-hover:shadow-xs group-hover:scale-102'
                }`}
              >
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.label}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    item.isActive ? 'bg-[#00875A] text-white' : 'bg-[#F4F6F8] text-[#0B3B60]'
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>
                )}
              </div>
              <span
                className={`text-[11px] sm:text-xs font-semibold whitespace-nowrap text-center transition-colors ${
                  item.isActive ? 'text-[#00875A] font-bold' : 'text-[#42474E] group-hover:text-[#1A242D]'
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
