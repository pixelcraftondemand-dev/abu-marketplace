import React from 'react';
import { 
  Building2, 
  MapPin, 
  CheckCircle2, 
  Star, 
  Package, 
  Phone, 
  ArrowRight, 
  PlusCircle,
  ShieldCheck
} from 'lucide-react';
import { VendorStore } from '../types';

interface StoresDirectoryViewProps {
  stores: VendorStore[];
  onSelectStore: (store: VendorStore) => void;
  onOpenCreateStore: () => void;
}

export const StoresDirectoryView: React.FC<StoresDirectoryViewProps> = ({
  stores,
  onSelectStore,
  onOpenCreateStore,
}) => {
  return (
    <div className="max-w-[1440px] mx-auto px-3 sm:px-6 py-4 w-full max-w-full overflow-hidden">
      {/* Hero Strip */}
      <div className="bg-gradient-to-r from-[#002541] to-[#0B3B60] text-white p-4 sm:p-6 rounded-lg mb-6 border border-[#144b77] shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 w-full">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="bg-[#00875A] text-white text-[10px] uppercase font-extrabold px-2 py-0.5 rounded tracking-wider">
              Verified Merchant Network
            </span>
            <span className="text-xs text-[#8df7c1] font-semibold">
              · Physical Showrooms Across Sierra Leone
            </span>
          </div>
          <h2 className="text-lg sm:text-2xl font-extrabold text-white leading-tight">
            Official Merchant Storefronts & Distributors
          </h2>
          <p className="text-xs sm:text-sm text-[#d0e4ff] mt-1 max-w-2xl leading-relaxed">
            Browse verified electronics importers, solar distributors, home emporiums, and fashion boutiques on ABU Marketplace. Every merchant operates inspected inventory with buyer protection.
          </p>
        </div>

        <button
          onClick={onOpenCreateStore}
          className="bg-[#D84315] hover:bg-[#b12d00] text-white px-4 py-2.5 rounded font-bold text-xs sm:text-sm flex items-center gap-2 shadow-md transition-all shrink-0 cursor-pointer w-full sm:w-auto justify-center"
        >
          <Building2 className="w-4 h-4" />
          <span>Open a Verified Store</span>
        </button>
      </div>

      {/* Stores Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
        {stores.map((store) => (
          <div
            key={store.id}
            className="bg-white dark:bg-[#111D27] rounded border border-[#DCE1E5] dark:border-[#1E2E3D] p-4 flex flex-col justify-between hover:border-[#0B3B60] dark:hover:border-[#38BDF8] hover:shadow-md transition-all w-full"
          >
            <div>
              <div className="flex items-start gap-3 mb-3">
                <div className="w-14 h-14 rounded bg-[#F8F9FA] dark:bg-[#0E1720] overflow-hidden shrink-0 border border-[#DCE1E5] dark:border-[#1E2E3D] flex items-center justify-center">
                  <img
                    src={store.logo}
                    alt={store.name}
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect fill="%230b3b60" width="100" height="100"/><text fill="%23ffffff" font-family="sans-serif" font-size="28" font-weight="bold" x="50%" y="60%" text-anchor="middle">ABU</text></svg>';
                    }}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <h3 className="font-extrabold text-sm sm:text-base text-[#1A242D] dark:text-[#F1F5F9] truncate">
                      {store.name}
                    </h3>
                    <CheckCircle2 className="w-4 h-4 text-[#00875A] shrink-0" />
                  </div>

                  <p className="text-xs font-semibold text-[#0B3B60] dark:text-[#38BDF8] line-clamp-1">
                    {store.tagline}
                  </p>

                  <div className="flex items-center gap-2 text-[11px] text-[#5A6872] dark:text-slate-400 mt-1 flex-wrap">
                    <span className="flex items-center gap-0.5">
                      <MapPin className="w-3 h-3 text-[#5A6872] dark:text-slate-400" />
                      <span>{store.locationHub}</span>
                    </span>
                    <span>·</span>
                    <span>Est. {store.establishedYear}</span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-[#42474e] dark:text-slate-300 leading-relaxed mb-3 line-clamp-2">
                {store.description}
              </p>

              <div className="bg-[#f5faff] dark:bg-[#0E1720] p-2.5 rounded border border-[#DCE1E5] dark:border-[#1E2E3D] grid grid-cols-3 gap-2 text-center text-xs mb-3">
                <div>
                  <span className="text-[10px] text-[#5A6872] dark:text-slate-400 block">Rating</span>
                  <span className="font-extrabold text-[#d97706] flex items-center justify-center gap-0.5">
                    <Star className="w-3 h-3 fill-[#d97706]" />
                    <span>{store.rating.toFixed(2)}</span>
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-[#5A6872] dark:text-slate-400 block">Orders</span>
                  <span className="font-bold text-[#1A242D] dark:text-slate-200 tabular-nums">
                    {store.totalSales}+
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-[#5A6872] dark:text-slate-400 block">Listed SKUs</span>
                  <span className="font-bold text-[#0B3B60] dark:text-[#38BDF8] tabular-nums">
                    {store.productCount} items
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-[#DCE1E5] dark:border-[#1E2E3D] flex items-center justify-between gap-2 flex-wrap">
              <div className="text-[11px] text-[#5A6872] dark:text-slate-400 flex items-center gap-1">
                <Phone className="w-3 h-3 text-[#0B3B60] dark:text-[#38BDF8]" />
                <span>+232 {store.phone}</span>
              </div>

              <button
                onClick={() => onSelectStore(store)}
                className="px-3 py-1.5 bg-[#0B3B60] hover:bg-[#002541] dark:bg-sky-600 dark:hover:bg-sky-700 text-white rounded text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>Browse Store Products</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
