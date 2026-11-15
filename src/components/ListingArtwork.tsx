import React, { useState } from 'react';
import { BedDouble, Bus, Car, Home, LandPlot, Truck, Bike } from 'lucide-react';
import type { ListingKind, PropertyListing } from '../types';
import { LISTING_KIND_LABELS } from '../data/propertyListings';
import { getListingImages, resolveListingImageUrl } from '../data/listingImages';

interface ListingArtworkProps {
  kind: ListingKind;
  /** Override the small badge text (defaults to the kind label). */
  badge?: string;
  /** Shown bottom-left, e.g. "0.5 acre" or "15 passengers". */
  sizeLabel?: string;
  className?: string;
}

const THEMES: Record<ListingKind, { from: string; via: string; to: string; Icon: typeof Home }> = {
  airbnb: { from: '#0B3B60', via: '#0F6B63', to: '#00875A', Icon: BedDouble },
  estate: { from: '#002541', via: '#0B3B60', to: '#155B88', Icon: Home },
  land: { from: '#3E3520', via: '#6B5A1E', to: '#00875A', Icon: LandPlot },
  vehicle: { from: '#1A242D', via: '#2C3E4F', to: '#0B3B60', Icon: Car },
};

/** Vehicles are drawn with an icon that matches their class, so a kekeh and a trailer don't look alike. */
const vehicleIcon = (sizeLabel: string) => {
  const s = sizeLabel.toLowerCase();
  if (s.includes('compact')) return Bike;
  if (s.includes('small')) return Bike;
  if (s.includes('40ft') || s.includes('heavy')) return Truck;
  if (s.includes('large') && s.includes('5.3')) return Bus;
  return Car;
};

export const ListingArtwork: React.FC<ListingArtworkProps> = ({
  kind,
  badge,
  sizeLabel,
  className = '',
}) => {
  const theme = THEMES[kind];
  const Icon = kind === 'vehicle' ? vehicleIcon(`${sizeLabel ?? ''}`) : theme.Icon;

  return (
    <div
      aria-hidden="true"
      className={`relative overflow-hidden ${className}`}
      style={{
        backgroundImage: `linear-gradient(135deg, ${theme.from} 0%, ${theme.via} 55%, ${theme.to} 100%)`,
      }}
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'repeating-linear-gradient(135deg, rgba(255,255,255,0.07) 0 1px, transparent 1px 13px)',
        }}
      />
      <Icon
        className="absolute -right-8 -bottom-10 w-44 h-44 text-white opacity-20"
        strokeWidth={1.1}
      />
      <div className="relative h-full flex flex-col justify-between p-3">
        <span className="self-start bg-black/30 text-white text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded">
          {badge ?? LISTING_KIND_LABELS[kind]}
        </span>
        {sizeLabel && (
          <span className="self-start bg-white/15 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
            {sizeLabel}
          </span>
        )}
      </div>
    </div>
  );
};

export const artworkBadgeFor = (listing: PropertyListing): string => {
  if (listing.kind === 'airbnb') return 'Short stay';
  if (listing.kind === 'land') return 'Titled land';
  return LISTING_KIND_LABELS[listing.kind];
};

interface ListingMediaProps {
  listing: PropertyListing;
  className?: string;
  /** Load immediately for above-the-fold covers; cards stay lazy. */
  priority?: boolean;
  /** Cards show the kind badge, the detail hero hides it (it has its own header). */
  showBadge?: boolean;
  /** Which gallery photo to show; falls back to the cover if out of range. */
  imageIndex?: number;
}

/**
 * Listing cover: the photo when one is available, otherwise the gradient artwork.
 * A failed load falls back to the gradient too, so a dead CDN link never shows a broken image.
 */
export const ListingMedia: React.FC<ListingMediaProps> = ({
  listing,
  className = '',
  priority = false,
  showBadge = true,
  imageIndex = 0,
}) => {
  // Keyed by listing and index so a photo that fails only affects that one thumbnail.
  const [failedKey, setFailedKey] = useState<string | null>(null);
  const images = getListingImages(listing);
  const cover = images[imageIndex] ?? images[0];
  const key = `${listing.id}:${imageIndex}`;
  const src = cover ? resolveListingImageUrl(cover.url) : null;
  const showPhoto = Boolean(src) && failedKey !== key;

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {showPhoto ? (
        <>
          <img
            src={src as string}
            alt={listing.title}
            loading={priority ? 'eager' : 'lazy'}
            decoding="async"
            onError={() => setFailedKey(key)}
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/55 to-transparent" />
          {showBadge && (
            <span className="absolute top-3 left-3 bg-black/55 text-white text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded">
              {artworkBadgeFor(listing)}
            </span>
          )}
          {listing.sizeLabel && (
            <span className="absolute bottom-3 left-3 bg-black/55 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
              {listing.sizeLabel}
            </span>
          )}
        </>
      ) : (
        <ListingArtwork
          kind={listing.kind}
          badge={artworkBadgeFor(listing)}
          sizeLabel={listing.sizeLabel}
          className="absolute inset-0"
        />
      )}
    </div>
  );
};
