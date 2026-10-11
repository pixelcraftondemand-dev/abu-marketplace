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
    <div className="bg-[#FFFFFF] border-b border-[#DCE1E5] py-2 px-3 sm:px-6 shadow-[0_1px_2px_rgba(11,59,96,0.04)]">
      <div className="max-w-[1440px] mx-auto flex items-center justify-between gap-3 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#5A6872] mr-1 hidden sm:inline">
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
                    ? 'bg-[#0B3B60] text-white border border-[#0B3B60]'
                    : 'bg-white text-[#1A242D] border border-[#DCE1E5] hover:border-[#0B3B60] hover:text-[#0B3B60]'
                }`}
              >
                <span>{category}</span>
                <span
                  className={`text-[10px] tabular-nums font-normal ${
                    isSelected ? 'text-[#d0e4ff]' : 'text-[#73777f]'
                  }`}
                >
                  ({count})
                </span>
              </button>
            );
          })}
        </div>

        <div className="text-[11px] font-medium text-[#5A6872] shrink-0 hidden md:block">
          All prices in <strong className="text-[#0B3B60]">SLE (New Leones)</strong>
        </div>
      </div>
    </div>
  );
};
