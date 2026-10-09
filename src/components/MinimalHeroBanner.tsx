import React from 'react';
import { AbuLogo } from './AbuLogo';
import { EcommerceDoodles } from './EcommerceDoodles';

export const MinimalHeroBanner: React.FC = () => {
  return (
    <div className="max-w-[1440px] mx-auto px-3 sm:px-6 pt-3 pb-1">
      <div className="relative rounded-lg overflow-hidden bg-gradient-to-r from-[#F7F2EB] via-[#F4EFE6] to-[#ECE5D8] border border-[#E8DFD1] p-4 sm:p-6 shadow-2xs flex items-center justify-between min-h-[108px]">
        {/* E-Commerce Related Background Doodles */}
        <EcommerceDoodles 
          className="absolute inset-0 z-0" 
          color="#7A6B59" 
          opacity={0.22} 
        />

        {/* Brand Showcase with Improved Logo Quality */}
        <div className="relative z-10 flex items-center gap-3.5 sm:gap-4.5">
          <AbuLogo size={48} />
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-widest text-[#8A7B68] flex items-center gap-2">
              <span>Abu Marketplace</span>
              <span className="text-[#8A7B68]/60">·</span>
              <span className="text-[#059669] font-bold">Sierra Leone</span>
            </div>
            <h2 className="font-serif text-xl sm:text-2xl font-medium tracking-tight text-[#2C241B] mt-0.5">
              Refined Living & Verified Commerce
            </h2>
            <p className="text-xs text-[#6B5E4F] mt-0.5 max-w-2xl leading-relaxed">
              Curated solar energy systems, authenticated tech flagships, and certified local artisans across all provinces.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
