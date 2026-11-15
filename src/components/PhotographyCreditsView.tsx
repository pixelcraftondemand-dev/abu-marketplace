import React, { useMemo } from 'react';
import { ArrowLeft, Camera, ExternalLink, Info } from 'lucide-react';
import type { ListingImage } from '../types';
import { PROPERTY_LISTINGS } from '../data/propertyListings';
import { getListingImages, resolveListingImageUrl } from '../data/listingImages';

interface PhotographyCreditsViewProps {
  onBack?: () => void;
}

/** Creative Commons licence pages, so the licence text in the table is clickable. */
const licenceUrl = (license?: string): string | null => {
  const match = license?.match(/^CC BY(-SA)? ([\d.]+)$/i);
  if (!match) return null;
  const kind = match[1] ? 'by-sa' : 'by';
  return `https://creativecommons.org/licenses/${kind}/${match[2]}/`;
};

interface CreditRow {
  image: ListingImage;
  listings: string[];
}

const PhotographyCreditsView: React.FC<PhotographyCreditsViewProps> = ({ onBack }) => {
  const credits = useMemo<CreditRow[]>(() => {
    const byUrl = new Map<string, CreditRow>();
    for (const listing of PROPERTY_LISTINGS) {
      for (const image of getListingImages(listing)) {
        const existing = byUrl.get(image.url);
        if (existing) {
          if (!existing.listings.includes(listing.title)) existing.listings.push(listing.title);
        } else {
          byUrl.set(image.url, { image, listings: [listing.title] });
        }
      }
    }
    return Array.from(byUrl.values()).sort(
      (a, b) => a.image.credit.localeCompare(b.image.credit) || a.image.url.localeCompare(b.image.url),
    );
  }, []);

  const photographerCount = new Set(credits.map((row) => row.image.credit)).size;

  return (
    <div className="max-w-[1100px] mx-auto px-3 sm:px-6 py-5 w-full">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs font-semibold text-[#0B3B60] dark:text-[#8df7c1] hover:underline mb-4 cursor-pointer"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to property listings
      </button>

      <div className="bg-white dark:bg-[#111D27] border border-[#DCE1E5] dark:border-[#1E2E3D] rounded-lg p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-1">
          <Camera className="w-5 h-5 text-[#00875A]" />
          <h1 className="text-lg sm:text-2xl font-extrabold text-[#1A242D] dark:text-white">Photography credits</h1>
        </div>
        <p className="text-xs sm:text-sm text-[#5A6872] dark:text-slate-400 leading-relaxed max-w-3xl">
          Listing photos are openly licensed images from Wikimedia Commons. They show the area or the vehicle class, not the
          exact home, plot or vehicle on offer, so each listing labels them as representative photos.
        </p>
        <p className="text-xs text-[#5A6872] dark:text-slate-400 mt-2">
          {credits.length} photos by {photographerCount} photographers. Each photographer keeps the copyright to their work and
          is credited under the licence shown; follow the source link for the original file and full licence terms.
        </p>

        <div className="flex items-start gap-2 mt-3 bg-[#F4F6F8] dark:bg-[#0E1821] border border-[#DCE1E5] dark:border-[#1E2E3D] rounded p-2.5">
          <Info className="w-3.5 h-3.5 text-[#0B3B60] dark:text-[#8df7c1] shrink-0 mt-0.5" />
          <p className="text-[11px] text-[#5A6872] dark:text-slate-400 leading-relaxed">
            Photos you upload yourself replace these seed images on the listing. Reuse of the Commons photos here must keep the
            attribution and licence notice intact.
          </p>
        </div>
      </div>

      <div className="mt-4 bg-white dark:bg-[#111D27] border border-[#DCE1E5] dark:border-[#1E2E3D] rounded-lg overflow-hidden">
        <div className="hidden sm:grid grid-cols-[96px_1fr_150px_1fr] gap-3 px-4 py-2 bg-[#F4F6F8] dark:bg-[#0E1821] border-b border-[#DCE1E5] dark:border-[#1E2E3D] text-[10px] uppercase tracking-wider font-extrabold text-[#5A6872] dark:text-slate-400">
          <span>Photo</span>
          <span>Photographer</span>
          <span>Licence</span>
          <span>Used on</span>
        </div>
        <ul className="divide-y divide-[#DCE1E5] dark:divide-[#1E2E3D]">
          {credits.map(({ image, listings }) => {
            const href = licenceUrl(image.license);
            return (
              <li key={image.url} className="grid grid-cols-1 sm:grid-cols-[96px_1fr_150px_1fr] gap-2 sm:gap-3 px-4 py-3 items-center">
                <a
                  href={image.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-24 h-16 block rounded overflow-hidden bg-[#E8EDF1] dark:bg-[#0B1620] shrink-0"
                  aria-label={`Open the source photo by ${image.credit}`}
                >
                  <img
                    src={resolveListingImageUrl(image.url)}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover"
                  />
                </a>
                <div className="min-w-0">
                  <a
                    href={image.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-bold text-[#1A242D] dark:text-white hover:text-[#0B3B60] dark:hover:text-[#8df7c1] inline-flex items-center gap-1"
                  >
                    {image.credit}
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                  <p className="text-[10px] text-[#5A6872] dark:text-slate-400 sm:hidden">{image.license}</p>
                </div>
                <div className="text-[11px] text-[#1A242D] dark:text-slate-300">
                  {href ? (
                    <a href={href} target="_blank" rel="noopener noreferrer" className="hover:underline">
                      {image.license}
                    </a>
                  ) : (
                    image.license
                  )}
                </div>
                <div className="text-[11px] text-[#5A6872] dark:text-slate-400">
                  <span className="hidden sm:inline">{listings.join(' · ')}</span>
                  <span className="sm:hidden">
                    {listings.length} listing{listings.length === 1 ? '' : 's'}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};

export default PhotographyCreditsView;
