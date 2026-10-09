import React from 'react';
import { AbuLogo } from './AbuLogo';
import { EcommerceDoodles } from './EcommerceDoodles';
import { Sparkles, Sun, Smartphone, ShieldCheck, Truck, MessageSquare, ArrowRight } from 'lucide-react';
import { Category } from '../types';

interface MinimalHeroBannerProps {
  onSelectCategory?: (cat: Category) => void;
  onOpenWhatsAppAuth?: () => void;
}

export const MinimalHeroBanner: React.FC<MinimalHeroBannerProps> = ({
  onSelectCategory,
  onOpenWhatsAppAuth,
}) => {
  return (
    <div className="max-w-[1440px] mx-auto px-3 sm:px-6 pt-3 pb-2">
      <div className="relative rounded-xl overflow-hidden bg-gradient-to-r from-[#002541] via-[#0B3B60] to-[#05263B] text-white p-5 sm:p-7 shadow-sm border border-[#144b77]">
        {/* Subtle Background Doodles */}
        <EcommerceDoodles 
          className="absolute inset-0 z-0 pointer-events-none" 
          color="#ffffff" 
          opacity={0.08} 
        />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Left Column: Brand & Hero Messaging (lg:col-span-8) */}
          <div className="lg:col-span-8 space-y-3">
            <div className="inline-flex items-center gap-2 bg-[#082d49]/80 border border-[#8df7c1]/30 rounded-full px-3 py-1 text-xs">
              <span className="w-2 h-2 rounded-full bg-[#8df7c1] inline-block animate-pulse"></span>
              <span className="text-[11px] font-bold text-[#8df7c1] uppercase tracking-wider">
                Official Sierra Leone Marketplace
              </span>
              <span className="text-white/40">·</span>
              <span className="text-[11px] text-white/90">
                Cash on Delivery (No Mobile Money Initially)
              </span>
            </div>

            <div className="flex items-start gap-3 sm:gap-4">
              <AbuLogo size={48} className="shrink-0 mt-1" />
              <div>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight text-white leading-tight">
                  High-Density Digital Commerce & Verified Artisans
                </h1>
                <p className="text-xs sm:text-sm text-[#d0e4ff] mt-1.5 max-w-2xl leading-relaxed">
                  Discover West African luxury fashion, high-efficiency solar backup systems, smartphones, and verified trade artisans with transparent Leones pricing across Freetown, Bo, Makeni, and Kenema.
                </p>
              </div>
            </div>

            {/* Quick Action Navigation Buttons */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {onSelectCategory && (
                <>
                  <button
                    type="button"
                    onClick={() => onSelectCategory('Fashion & Footwear')}
                    className="px-3 py-1.5 bg-[#D84315] hover:bg-[#b12d00] text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Shop Fashion & Couture</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onSelectCategory('Solar & Power')}
                    className="px-3 py-1.5 bg-[#002541]/90 hover:bg-[#001B30] border border-[#7fa6d0]/40 text-[#8df7c1] text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Sun className="w-3.5 h-3.5 text-[#FF9800]" />
                    <span>Solar Generators & Inverters</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onSelectCategory('Phones & Tablets')}
                    className="px-3 py-1.5 bg-[#002541]/90 hover:bg-[#001B30] border border-[#7fa6d0]/40 text-[#d0e4ff] text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Smartphone className="w-3.5 h-3.5 text-[#8df7c1]" />
                    <span>Mobile Tech</span>
                  </button>
                </>
              )}

              {onOpenWhatsAppAuth && (
                <button
                  type="button"
                  onClick={onOpenWhatsAppAuth}
                  className="px-3 py-1.5 bg-[#25D366] hover:bg-[#1EBE5D] text-[#002541] text-xs font-extrabold rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer ml-auto sm:ml-0"
                >
                  <MessageSquare className="w-3.5 h-3.5 fill-current" />
                  <span>WhatsApp Login</span>
                </button>
              )}
            </div>
          </div>

          {/* Right Column: 3 Institutional Value Pillars (lg:col-span-4) */}
          <div className="lg:col-span-4 grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-2.5">
            <div className="p-2.5 rounded-lg bg-[#001B30]/60 border border-[#144b77] flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#00875A]/30 text-[#8df7c1] flex items-center justify-center shrink-0">
                <Truck className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="font-bold text-xs text-white">Same-Day City Dispatch</div>
                <div className="text-[11px] text-[#7fa6d0] truncate">Freetown 2–4 hrs · Provincial hubs daily</div>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-[#001B30]/60 border border-[#144b77] flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#25D366]/20 text-[#25D366] flex items-center justify-center shrink-0">
                <MessageSquare className="w-4 h-4 fill-current" />
              </div>
              <div className="min-w-0">
                <div className="font-bold text-xs text-white">24/7 WhatsApp Order Desk</div>
                <div className="text-[11px] text-[#7fa6d0] truncate">Live dispatch alerts direct to WhatsApp</div>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-[#001B30]/60 border border-[#144b77] flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#00875A]/30 text-[#8df7c1] flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="font-bold text-xs text-white">Inspect Before Paying</div>
                <div className="text-[11px] text-[#7fa6d0] truncate">Cash on Delivery guarantee on arrival</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
