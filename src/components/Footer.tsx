import React from 'react';
import { ShieldCheck, Truck, Phone, MapPin, Store, RotateCcw } from 'lucide-react';
import { AbuLogo } from './AbuLogo';

interface FooterProps {
  onOpenLocationPicker: () => void;
  onOpenMerchantHub: () => void;
  onOpenOrderTracking: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  onOpenLocationPicker,
  onOpenMerchantHub,
  onOpenOrderTracking,
}) => {
  return (
    <footer className="bg-[#002541] text-white pt-8 pb-8 border-t border-[#144b77] mt-12">
      {/* 4 Trust Pillars */}
      <div className="max-w-[1440px] w-full mx-auto px-4 sm:px-6 pb-6 border-b border-[#144b77]">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 text-xs">
          <div className="flex items-start gap-3 p-3 bg-[#082d49] rounded border border-[#144b77]">
            <Truck className="w-4 h-4 text-[#8df7c1] shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-white text-xs">Provincial Delivery</h4>
              <p className="text-[11px] text-[#7fa6d0] mt-0.5 leading-tight">
                Daily dispatch across Sierra Leone provinces.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-[#082d49] rounded border border-[#144b77]">
            <ShieldCheck className="w-4 h-4 text-[#8df7c1] shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-white text-xs">Verified Merchants</h4>
              <p className="text-[11px] text-[#7fa6d0] mt-0.5 leading-tight">
                Tested products inspected before delivery.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-[#082d49] rounded border border-[#144b77]">
            <div className="font-extrabold text-[10px] bg-[#144b77] text-[#8df7c1] px-1.5 py-0.5 rounded shrink-0 border border-[#8df7c1]/30">
              SLE
            </div>
            <div>
              <h4 className="font-bold text-white text-xs">Pay on Delivery</h4>
              <p className="text-[11px] text-[#7fa6d0] mt-0.5 leading-tight">
                Inspect goods before paying cash. No mobile money initially.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-[#082d49] rounded border border-[#144b77]">
            <RotateCcw className="w-4 h-4 text-[#8df7c1] shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-white text-xs">Buyer Protection</h4>
              <p className="text-[11px] text-[#7fa6d0] mt-0.5 leading-tight">
                Inspection guarantee on arrival.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links & Information - Clean Balanced 3-Column Layout */}
      <div className="max-w-[1440px] w-full mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 text-xs text-[#d0e4ff]">
          {/* Column 1: Brand & Mission (5 cols) */}
          <div className="md:col-span-5 space-y-3">
            <div className="flex items-center gap-2.5">
              <AbuLogo size={36} />
              <div>
                <span className="font-extrabold text-lg text-white tracking-tight block leading-tight">
                  Abu Marketplace
                </span>
                <span className="text-[10px] font-semibold text-[#8df7c1] uppercase tracking-wider">
                  Sierra Leone
                </span>
              </div>
            </div>
            <p className="text-xs text-[#7fa6d0] leading-relaxed max-w-md">
              The premier digital commerce & artisan trade platform for Sierra Leone. Connecting verified traders, technology distributors, and skilled blue-collar technicians with buyers across every province.
            </p>
            <div className="inline-flex items-center gap-2 pt-1">
              <span className="text-[11px] text-[#7fa6d0]">Default Currency:</span>
              <span className="bg-[#082d49] px-2 py-0.5 rounded text-white font-bold border border-[#144b77] text-[11px]">
                SLE · Sierra Leone Leones
              </span>
            </div>
          </div>

          {/* Column 2: Merchant & Buyer Services (3 cols) */}
          <div className="md:col-span-3 space-y-3">
            <h4 className="font-bold text-white uppercase text-[11px] tracking-wider border-b border-[#144b77] pb-1.5">
              Services & Portals
            </h4>
            <ul className="space-y-2.5 pt-0.5">
              <li>
                <button
                  onClick={onOpenMerchantHub}
                  className="hover:text-white hover:underline flex items-center gap-2 text-left cursor-pointer transition-colors"
                >
                  <Store className="w-3.5 h-3.5 text-[#8df7c1] shrink-0" />
                  <span>Sell & Provide Services</span>
                </button>
              </li>
              <li>
                <button
                  onClick={onOpenOrderTracking}
                  className="hover:text-white hover:underline flex items-center gap-2 text-left cursor-pointer transition-colors"
                >
                  <Truck className="w-3.5 h-3.5 text-[#8df7c1] shrink-0" />
                  <span>Track Order Shipment</span>
                </button>
              </li>
              <li>
                <button
                  onClick={onOpenLocationPicker}
                  className="hover:text-white hover:underline flex items-center gap-2 text-left cursor-pointer transition-colors"
                >
                  <MapPin className="w-3.5 h-3.5 text-[#7fa6d0] shrink-0" />
                  <span>Change Delivery Destination</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Column 3: Freetown Support Desk (4 cols) */}
          <div className="md:col-span-4 space-y-3">
            <h4 className="font-bold text-white uppercase text-[11px] tracking-wider border-b border-[#144b77] pb-1.5">
              Freetown Support Desk
            </h4>
            <div className="space-y-2.5 pt-0.5 text-[#7fa6d0]">
              <div className="flex items-start gap-2.5">
                <Phone className="w-4 h-4 text-[#8df7c1] shrink-0 mt-0.5" />
                <div>
                  <span className="text-white font-bold block">+232 76 000 888 / +232 88 111 222</span>
                  <span className="text-[11px] text-[#7fa6d0]">Mon–Sat: 8:00 AM – 7:00 PM GMT</span>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-[#8df7c1] shrink-0 mt-0.5" />
                <span className="text-white/90">
                  Siaka Stevens Street, Freetown, Sierra Leone
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Copyright & Legal Note */}
      <div className="max-w-[1440px] w-full mx-auto px-4 sm:px-6 pt-5 border-t border-[#144b77] flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-[#7fa6d0]">
        <div>
          © 2026 Abu Marketplace SL Ltd. All rights reserved.
        </div>
        <div className="text-[11px]">
          Registered & operating under the Laws of Sierra Leone.
        </div>
      </div>
    </footer>
  );
};
