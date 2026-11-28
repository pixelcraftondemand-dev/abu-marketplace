import React from 'react';
import { ArrowRight, Building2, CheckCircle2, MapPin } from 'lucide-react';
import { VendorStore } from '../types';
import { isNewStore } from '../lib/newStores';

interface StoreSpotlightProps {
  stores: VendorStore[];
  title: string;
  subtitle?: string;
  onSelectStore: (store: VendorStore) => void;
  onViewAll?: () => void;
  limit?: number;
}

/**
 * Compact storefront cards. Approved stores often have no listed products yet, so the
 * directory (not just the product grid) has to be able to surface them on the homepage
 * and in search results.
 */
export const StoreSpotlight: React.FC<StoreSpotlightProps> = ({
  stores,
  title,
  subtitle,
  onSelectStore,
  onViewAll,
  limit = 6,
}) => {
  if (stores.length === 0) return null;
  const shown = stores.slice(0, limit);

  return (
    <section className="w-full" aria-label={title}>
      <div className="flex items-center justify-between mb-3 border-b border-[#E7ECF0] dark:border-[#1E2E3D] pb-2 gap-2">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
          <Building2 className="w-4 h-4 text-[#00875A] shrink-0" aria-hidden="true" />
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-bold text-[#1A242D] dark:text-[#F1F5F9] tracking-tight truncate">
              {title}
            </h2>
            {subtitle && (
              <p className="text-[11px] text-[#5A6872] dark:text-slate-400 truncate">{subtitle}</p>
            )}
          </div>
        </div>
        {onViewAll && (
          <button
            type="button"
            onClick={onViewAll}
            className="text-xs text-[#0B3B60] dark:text-[#38BDF8] hover:underline font-semibold flex items-center gap-1 cursor-pointer shrink-0 whitespace-nowrap"
          >
            <span>All Stores</span>
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
        {shown.map((store) => (
          <div
            key={store.id}
            className="flex items-center gap-3 rounded-lg border border-[#E7ECF0] dark:border-[#1E2E3D] bg-white dark:bg-[#111D27] p-3 hover:border-[#0B3B60] dark:hover:border-[#38BDF8] hover:shadow-2xs transition-colors"
          >
            <div className="w-12 h-12 shrink-0 overflow-hidden rounded border border-[#DCE1E5] dark:border-[#1E2E3D] bg-[#F8F9FA] dark:bg-[#0E1720]">
              <img
                src={store.logo}
                alt={store.name}
                referrerPolicy="no-referrer"
                loading="lazy"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect fill="%230b3b60" width="100" height="100"/><text fill="%23ffffff" font-family="sans-serif" font-size="28" font-weight="bold" x="50%" y="60%" text-anchor="middle">ABU</text></svg>';
                }}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 min-w-0">
                <h3 className="font-bold text-xs sm:text-sm text-[#1A242D] dark:text-[#F1F5F9] truncate">
                  {store.name}
                </h3>
                <CheckCircle2 className="w-3.5 h-3.5 text-[#00875A] shrink-0" aria-label="Verified store" />
                {isNewStore(store) && (
                  <span className="shrink-0 rounded bg-[#D84315] px-1 py-0.5 text-[8px] font-extrabold uppercase leading-none tracking-wide text-white">
                    New
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#0B3B60] dark:text-[#38BDF8] font-semibold truncate">
                {store.tagline}
              </p>
              <div className="flex items-center gap-1 text-[10px] text-[#5A6872] dark:text-slate-400 mt-0.5">
                <MapPin className="w-3 h-3 shrink-0" aria-hidden="true" />
                <span className="truncate">
                  {store.locationHub} · {store.productCount} item{store.productCount === 1 ? '' : 's'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onSelectStore(store)}
              className="shrink-0 rounded bg-[#0B3B60] hover:bg-[#002541] dark:bg-sky-600 dark:hover:bg-sky-700 px-2.5 py-1.5 text-[11px] font-bold text-white transition-colors cursor-pointer"
            >
              Visit
            </button>
          </div>
        ))}
      </div>
    </section>
  );
};
