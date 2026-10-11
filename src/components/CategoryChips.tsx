import React from 'react';
import { Category } from '../types';

interface CategoryChipsProps {
  categories: Category[];
  selectedCategory: Category;
  onSelectCategory: (category: Category) => void;
  productCounts: Record<Category, number>;
}

export const CategoryChips: React.FC<CategoryChipsProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
  productCounts,
}) => {
  return (
    <div className="bg-white dark:bg-[#0E1720] border-b border-[#DCE1E5] dark:border-[#1E2E3D] py-2 px-3 sm:px-6 shadow-[0_1px_2px_rgba(11,59,96,0.04)] transition-colors">
      <div className="max-w-[1440px] mx-auto flex items-center justify-between gap-3 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#5A6872] dark:text-slate-400 mr-1 hidden sm:inline">
            Browse:
          </span>
          {categories.map((category) => {
            const isSelected = selectedCategory === category;
            const count = productCounts[category] || 0;

            return (
              <button
                key={category}
                onClick={() => onSelectCategory(category)}
                className={`h-7 px-3 rounded text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? 'bg-[#0B3B60] dark:bg-[#00875A] text-white border border-[#0B3B60] dark:border-[#00875A]'
                    : 'bg-white dark:bg-[#15222E] text-[#1A242D] dark:text-slate-200 border border-[#DCE1E5] dark:border-[#223547] hover:border-[#0B3B60] dark:hover:border-[#00875A] hover:text-[#0B3B60] dark:hover:text-[#8df7c1]'
                }`}
              >
                <span>{category}</span>
                <span
                  className={`text-[10px] tabular-nums font-normal ${
                    isSelected ? 'text-[#d0e4ff] dark:text-emerald-100' : 'text-[#73777f] dark:text-slate-400'
                  }`}
                >
                  ({count})
                </span>
              </button>
            );
          })}
        </div>

        <div className="text-[11px] font-medium text-[#5A6872] dark:text-slate-400 shrink-0 hidden md:block">
          All prices in <strong className="text-[#0B3B60] dark:text-[#38BDF8]">SLE (New Leones)</strong>
        </div>
      </div>
    </div>
  );
};
