import React, { useEffect, useMemo, useState } from 'react';
import {
  BedDouble,
  Building2,
  Camera,
  Car,
  CheckCircle2,
  FileCheck2,
  Home,
  LandPlot,
  MapPin,
  MessageCircle,
  Phone,
  Search,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Star,
  X,
} from 'lucide-react';
import type { ListingImage, ListingKind, PropertyListing } from '../types';
import { PROPERTY_LISTINGS, PRICE_UNIT_LABELS } from '../data/propertyListings';
import { ListingMedia } from './ListingArtwork';
import { getListingImages, resolveListingImageUrl } from '../data/listingImages';

interface PropertyVehiclesViewProps {
  listings?: PropertyListing[];
  /** Opens the photography credits page that carries the full photo attribution. */
  onOpenCredits?: () => void;
}

type KindFilter = 'all' | ListingKind;
type SortBy = 'featured' | 'price-asc' | 'price-desc' | 'rating';

const KIND_TABS: { id: KindFilter; label: string; Icon: typeof Home }[] = [
  { id: 'all', label: 'Everything', Icon: SlidersHorizontal },
  { id: 'airbnb', label: 'Airbnb stays', Icon: BedDouble },
  { id: 'estate', label: 'Estates & homes', Icon: Home },
  { id: 'land', label: 'Land & plots', Icon: LandPlot },
  { id: 'vehicle', label: 'Vehicles', Icon: Car },
];

const formatPrice = (value: number) => `SLE ${new Intl.NumberFormat('en-US').format(value)}`;

const verifiedDocCount = (listing: PropertyListing) =>
  listing.documents.filter((doc) => doc.status === 'verified').length;

const allDocsVerified = (listing: PropertyListing) =>
  listing.documents.length > 0 && listing.documents.every((doc) => doc.status === 'verified');

const whatsappHref = (listing: PropertyListing) => {
  const digits = (listing.whatsapp ?? listing.phone).replace(/[^0-9]/g, '');
  const message = encodeURIComponent(
    `Hello ${listing.ownerName}, I saw "${listing.title}" (${listing.id}) on ABU Marketplace and would like to arrange a viewing.`,
  );
  return `https://wa.me/${digits}?text=${message}`;
};

const telHref = (listing: PropertyListing) => `tel:${listing.phone.replace(/\s+/g, '')}`;

const ListingCard: React.FC<{ listing: PropertyListing; onOpen: () => void }> = ({ listing, onOpen }) => {
  const docCount = verifiedDocCount(listing);
  return (
    <article
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen();
        }
      }}
      role="button"
      tabIndex={0}
      className="bg-white dark:bg-[#111D27] border border-[#DCE1E5] dark:border-[#1E2E3D] rounded overflow-hidden flex flex-col cursor-pointer hover:border-[#0B3B60] dark:hover:border-[#8df7c1] transition-colors shadow-2xs"
    >
      <ListingMedia listing={listing} className="h-36 w-full shrink-0" />

      <div className="p-3 flex flex-col gap-1.5 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-bold text-[#1A242D] dark:text-white leading-snug line-clamp-2">
            {listing.title}
          </h3>
          {listing.isVerified && (
            <span title="Owner identity verified" className="shrink-0">
              <CheckCircle2 className="w-4 h-4 text-[#00875A]" />
            </span>
          )}
        </div>

        <p className="text-[11px] text-[#5A6872] dark:text-slate-400 leading-snug line-clamp-2">
          {listing.subtitle}
        </p>

        <div className="flex items-center gap-1 text-[11px] text-[#5A6872] dark:text-slate-400">
          <MapPin className="w-3 h-3 shrink-0" />
          <span className="truncate">
            {listing.district}, {listing.province}
          </span>
        </div>

        <div className="flex flex-wrap gap-1 mt-0.5">
          {Object.entries(listing.highlights)
            .slice(0, 3)
            .map(([label, value]) => (
              <span
                key={label}
                className="bg-[#F4F6F8] dark:bg-[#1E2E3D] text-[#1A242D] dark:text-slate-200 text-[10px] font-semibold px-1.5 py-0.5 rounded"
              >
                {value} {label.toLowerCase()}
              </span>
            ))}
        </div>

        <div className="flex items-center gap-1 text-[11px] mt-0.5">
          <FileCheck2 className={`w-3.5 h-3.5 shrink-0 ${allDocsVerified(listing) ? 'text-[#00875A]' : 'text-[#8a5a00]'}`} />
          <span className={allDocsVerified(listing) ? 'text-[#00875A] font-semibold' : 'text-[#8a5a00] font-semibold'}>
            {docCount}/{listing.documents.length} documents verified
          </span>
        </div>

        <div className="mt-auto pt-2 border-t border-[#DCE1E5] dark:border-[#1E2E3D] flex items-end justify-between gap-2">
          <div>
            <div className="text-sm font-extrabold text-[#0B3B60] dark:text-[#8df7c1] leading-tight">
              {formatPrice(listing.priceSLE)}
            </div>
            <div className="text-[10px] text-[#5A6872] dark:text-slate-400">
              {PRICE_UNIT_LABELS[listing.priceUnit]}
              {listing.negotiable ? ' · negotiable' : ''}
            </div>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-[#1A242D] dark:text-slate-200 font-semibold">
            <Star className="w-3 h-3 text-[#D84315] fill-[#D84315]" />
            {listing.rating.toFixed(1)}
            <span className="text-[#5A6872] dark:text-slate-400 font-normal">({listing.reviews})</span>
          </div>
        </div>
      </div>
    </article>
  );
};

const DetailRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="bg-[#F4F6F8] dark:bg-[#1E2E3D] rounded px-2.5 py-2">
    <div className="text-[10px] uppercase tracking-wider font-bold text-[#5A6872] dark:text-slate-400">{label}</div>
    <div className="text-xs font-semibold text-[#1A242D] dark:text-white mt-0.5">{value}</div>
  </div>
);

/** These photos are licensed stock, so credit the photographer and say it is not the exact property. */
const ListingPhotoCredit: React.FC<{ image: ListingImage; onOpenCredits?: () => void }> = ({ image, onOpenCredits }) => {
  const cover = image;

  return (
    <div className="px-4 py-1.5 bg-[#F4F6F8] dark:bg-[#0E1821] border-b border-[#DCE1E5] dark:border-[#1E2E3D] flex flex-wrap items-center gap-1 text-[10px] text-[#5A6872] dark:text-slate-400">
      <span>Representative photo.</span>
      {cover.sourceUrl ? (
        <a
          href={cover.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-[#0B3B60] dark:hover:text-[#8df7c1]"
        >
          {cover.credit}
        </a>
      ) : (
        <span>{cover.credit}</span>
      )}
      {cover.license && <span>· {cover.license}</span>}
      <span>· Wikimedia Commons</span>
      {onOpenCredits && (
        <button
          type="button"
          onClick={onOpenCredits}
          className="ml-auto font-bold text-[#0B3B60] dark:text-[#8df7c1] hover:underline cursor-pointer shrink-0"
        >
          All credits
        </button>
      )}
    </div>
  );
};

const ListingDetailModal: React.FC<{
  listing: PropertyListing;
  onClose: () => void;
  onOpenCredits?: () => void;
}> = ({ listing, onClose, onOpenCredits }) => {
  const photos = getListingImages(listing);
  const [photoIndex, setPhotoIndex] = useState(0);

  useEffect(() => {
    setPhotoIndex(0);
  }, [listing.id]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label={listing.title}
      onClick={onClose}
    >
      <div
        className="max-w-3xl mx-auto my-4 sm:my-8 bg-white dark:bg-[#111D27] border border-[#DCE1E5] dark:border-[#1E2E3D] rounded-lg overflow-hidden"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="relative">
          <ListingMedia listing={listing} imageIndex={photoIndex} className="h-40 sm:h-56 w-full" showBadge={false} priority />
          {photos.length > 1 && (
            <span className="absolute bottom-2 right-2 bg-black/55 text-white text-[10px] font-bold px-2 py-0.5 rounded">
              {Math.min(photoIndex + 1, photos.length)} / {photos.length}
            </span>
          )}
          <button
            onClick={onClose}
            aria-label="Close listing"
            className="absolute top-2 right-2 bg-black/40 hover:bg-black/60 text-white rounded-full p-1.5 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {photos.length > 1 && (
          <div className="flex gap-2 px-4 py-2 overflow-x-auto bg-white dark:bg-[#111D27] border-b border-[#DCE1E5] dark:border-[#1E2E3D]">
            {photos.map((image, index) => (
              <button
                key={`${image.url}-${index}`}
                type="button"
                onClick={() => setPhotoIndex(index)}
                aria-label={`Photo ${index + 1} of ${photos.length}`}
                aria-current={index === photoIndex}
                className={`h-12 w-16 shrink-0 rounded overflow-hidden border-2 cursor-pointer transition-opacity ${
                  index === photoIndex
                    ? 'border-[#0B3B60] dark:border-[#8df7c1]'
                    : 'border-transparent opacity-70 hover:opacity-100'
                }`}
              >
                <img
                  src={resolveListingImageUrl(image.url)}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
        {photos.length > 0 && <ListingPhotoCredit image={photos[photoIndex] ?? photos[0]} onOpenCredits={onOpenCredits} />}

        <div className="p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base sm:text-xl font-extrabold text-[#1A242D] dark:text-white leading-tight">{listing.title}</h2>
              <p className="text-xs text-[#5A6872] dark:text-slate-400 mt-1">{listing.subtitle}</p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[11px] text-[#5A6872] dark:text-slate-400">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {listing.area}, {listing.district}, {listing.province}
                </span>
                <span className="flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 text-[#D84315] fill-[#D84315]" />
                  {listing.rating.toFixed(1)} ({listing.reviews} reviews)
                </span>
                <span className="flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5" />
                  {listing.ownerName} · {listing.ownerType === 'agency' ? 'Agency' : listing.ownerType === 'dealer' ? 'Dealer' : 'Owner'}
                </span>
              </div>
            </div>

            <div className="text-right">
              <div className="text-lg sm:text-2xl font-extrabold text-[#0B3B60] dark:text-[#8df7c1] leading-none">
                {formatPrice(listing.priceSLE)}
              </div>
              <div className="text-[11px] text-[#5A6872] dark:text-slate-400 mt-1">
                {PRICE_UNIT_LABELS[listing.priceUnit]}
                {listing.negotiable ? ' · negotiable' : ''}
              </div>
              <span
                className={`inline-flex items-center gap-1 mt-2 text-[10px] font-bold px-2 py-0.5 rounded ${
                  listing.availableNow
                    ? 'bg-[#E6F5EE] text-[#00875A] dark:bg-[#0F3A2A] dark:text-[#8df7c1]'
                    : 'bg-[#F4F6F8] text-[#5A6872] dark:bg-[#1E2E3D] dark:text-slate-300'
                }`}
              >
                {listing.availableNow ? 'Available now' : 'Not available'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
            <DetailRow label="Size" value={listing.sizeLabel} />
            <DetailRow label="Capacity" value={listing.capacityLabel} />
            {Object.entries(listing.highlights)
              .slice(0, 2)
              .map(([label, value]) => (
                <DetailRow key={label} label={label} value={value} />
              ))}
          </div>

          <p className="text-xs text-[#1A242D] dark:text-slate-200 leading-relaxed mt-4">{listing.description}</p>

          {/* Supporting documents */}
          <div className="mt-4">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#5A6872] dark:text-slate-400 flex items-center gap-1.5">
              <FileCheck2 className="w-3.5 h-3.5" />
              Supporting documents
            </h3>
            <ul className="mt-2 divide-y divide-[#DCE1E5] dark:divide-[#1E2E3D] border border-[#DCE1E5] dark:border-[#1E2E3D] rounded">
              {listing.documents.map((doc) => (
                <li key={doc.name} className="flex items-center justify-between gap-3 px-3 py-2">
                  <div>
                    <div className="text-xs font-semibold text-[#1A242D] dark:text-white">{doc.name}</div>
                    <div className="text-[10px] text-[#5A6872] dark:text-slate-400">{doc.issuer}</div>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                      doc.status === 'verified'
                        ? 'bg-[#E6F5EE] text-[#00875A] dark:bg-[#0F3A2A] dark:text-[#8df7c1]'
                        : doc.status === 'pending'
                          ? 'bg-[#FFF4E0] text-[#8a5a00] dark:bg-[#3A2B0F] dark:text-[#ffd08a]'
                          : 'bg-[#FDECEA] text-[#B71C1C] dark:bg-[#3A1414] dark:text-[#ff9c94]'
                    }`}
                  >
                    {doc.status === 'verified' ? 'Verified' : doc.status === 'pending' ? 'Pending' : 'Missing'}
                  </span>
                </li>
              ))}
              {listing.documents.length === 0 && (
                <li className="px-3 py-2 text-[11px] text-[#8a5a00]">No documents submitted yet — ask the seller before paying.</li>
              )}
            </ul>
          </div>

          {/* Features */}
          <div className="mt-4">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#5A6872] dark:text-slate-400">Features</h3>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {listing.features.map((feature) => (
                <span
                  key={feature}
                  className="bg-[#F4F6F8] dark:bg-[#1E2E3D] text-[#1A242D] dark:text-slate-200 text-[11px] font-semibold px-2 py-1 rounded"
                >
                  {feature}
                </span>
              ))}
            </div>
          </div>

          {/* Contact */}
          <div className="mt-5 pt-4 border-t border-[#DCE1E5] dark:border-[#1E2E3D]">
            <div className="flex flex-col sm:flex-row gap-2">
              <a
                href={whatsappHref(listing)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 bg-[#00875A] hover:bg-[#006e49] text-white px-4 py-2.5 rounded font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                Message on WhatsApp
              </a>
              <a
                href={telHref(listing)}
                className="flex-1 bg-[#0B3B60] hover:bg-[#092c48] text-white px-4 py-2.5 rounded font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors"
              >
                <Phone className="w-4 h-4" />
                Call {listing.phone}
              </a>
            </div>

            <div className="flex items-start gap-2 mt-3 bg-[#FFF4E0] dark:bg-[#3A2B0F] border border-[#F0D9AE] dark:border-[#5A4520] rounded p-2.5">
              <ShieldAlert className="w-4 h-4 text-[#8a5a00] dark:text-[#ffd08a] shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed text-[#5A4520] dark:text-[#ffd08a]">
                Inspect the site or vehicle in person and check every original document at the relevant office before paying any
                deposit. ABU Marketplace does not hold funds for property, land or vehicle sales.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const PropertyVehiclesView: React.FC<PropertyVehiclesViewProps> = ({ listings = PROPERTY_LISTINGS, onOpenCredits }) => {
  const [kind, setKind] = useState<KindFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [district, setDistrict] = useState('All');
  const [verifiedDocsOnly, setVerifiedDocsOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortBy>('featured');
  const [selected, setSelected] = useState<PropertyListing | null>(null);

  const districts = useMemo(
    () => Array.from(new Set(listings.map((listing) => listing.district.split(',')[0].trim()))).sort(),
    [listings],
  );

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const results = listings.filter((listing) => {
      if (kind !== 'all' && listing.kind !== kind) return false;
      if (district !== 'All' && !listing.district.toLowerCase().includes(district.toLowerCase())) return false;
      if (verifiedDocsOnly && !allDocsVerified(listing)) return false;
      if (q) {
        const haystack = [
          listing.title,
          listing.subtitle,
          listing.district,
          listing.area,
          listing.province,
          listing.ownerName,
          listing.capacityLabel,
          ...listing.features,
          ...Object.values(listing.highlights),
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    if (sortBy === 'price-asc') return [...results].sort((a, b) => a.priceSLE - b.priceSLE);
    if (sortBy === 'price-desc') return [...results].sort((a, b) => b.priceSLE - a.priceSLE);
    if (sortBy === 'rating') return [...results].sort((a, b) => b.rating - a.rating);
    return results;
  }, [listings, kind, district, verifiedDocsOnly, searchQuery, sortBy]);

  const countFor = (tab: KindFilter) =>
    tab === 'all' ? listings.length : listings.filter((listing) => listing.kind === tab).length;
  const verifiedListingCount = listings.filter(allDocsVerified).length;

  return (
    <div className="max-w-[1440px] mx-auto px-3 sm:px-6 py-4 w-full max-w-full overflow-hidden">
      {/* Hero strip */}
      <div className="bg-gradient-to-r from-[#002541] to-[#0B3B60] text-white p-4 sm:p-6 rounded-lg mb-5 border border-[#144b77] shadow-sm w-full">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="bg-[#00875A] text-white text-[10px] uppercase font-extrabold px-2 py-0.5 rounded tracking-wider">
            Property, Land & Vehicles
          </span>
          <span className="text-xs text-[#8df7c1] font-semibold">· {verifiedListingCount} listings with complete papers</span>
        </div>
        <h2 className="text-lg sm:text-2xl font-extrabold text-white leading-tight">
          Short stays, estates, titled land and vehicles across Sierra Leone
        </h2>
        <p className="text-xs sm:text-sm text-[#d0e4ff] mt-1 max-w-3xl leading-relaxed">
          Browse Airbnb-style short lets, family estates, surveyed land portions with their supporting documents, and vehicles from
          kekeh to 40ft trailer — each with the owner's papers listed and contact details verified.
        </p>
        <div className="flex flex-wrap gap-2 mt-3 text-[11px] font-semibold">
          <span className="flex items-center gap-1 bg-[#082d49] border border-[#144b77] px-2 py-1 rounded">
            <ShieldCheck className="w-3.5 h-3.5 text-[#8df7c1]" /> Ownership documents listed
          </span>
          <span className="flex items-center gap-1 bg-[#082d49] border border-[#144b77] px-2 py-1 rounded">
            <MapPin className="w-3.5 h-3.5 text-[#8df7c1]" /> Freetown · Bo · Makeni · Kenema
          </span>
          {onOpenCredits && (
            <button
              type="button"
              onClick={onOpenCredits}
              className="flex items-center gap-1 bg-[#082d49] border border-[#144b77] px-2 py-1 rounded hover:border-[#8df7c1] hover:text-white transition-colors cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5 text-[#8df7c1]" /> Photo credits
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-[#111D27] rounded border border-[#DCE1E5] dark:border-[#1E2E3D] p-3 mb-5 shadow-2xs w-full overflow-hidden">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 w-full">
          {KIND_TABS.map(({ id, label, Icon }) => {
            const isSelected = kind === id;
            return (
              <button
                key={id}
                onClick={() => setKind(id)}
                className={`h-7 px-3 rounded text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-[#0B3B60] dark:bg-[#00875A] text-white'
                    : 'bg-[#F4F6F8] dark:bg-[#1E2E3D] text-[#1A242D] dark:text-slate-200 hover:bg-gray-200 dark:hover:bg-slate-700'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
                <span className={isSelected ? 'text-[#8df7c1]' : 'text-[#5A6872] dark:text-slate-400'}>({countFor(id)})</span>
              </button>
            );
          })}
        </div>

        <div className="mt-3 pt-3 border-t border-[#DCE1E5] dark:border-[#1E2E3D] flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 text-xs w-full">
          <div className="relative w-full lg:max-w-md">
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search area, district, features or capacity…"
              className="w-full h-9 pl-8 pr-8 rounded border border-[#DCE1E5] dark:border-[#1E2E3D] bg-white dark:bg-[#0B1620] text-[#1A242D] dark:text-white placeholder:text-[#8A98A5] focus:outline-none focus:border-[#0B3B60] dark:focus:border-[#8df7c1]"
            />
            <Search className="w-4 h-4 text-[#8A98A5] absolute left-2.5 top-2.5" />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                className="absolute right-2 top-2.5 text-[#8A98A5] hover:text-[#1A242D] dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto">
            <select
              value={district}
              onChange={(event) => setDistrict(event.target.value)}
              aria-label="Filter by district"
              className="h-9 px-2 rounded border border-[#DCE1E5] dark:border-[#1E2E3D] bg-white dark:bg-[#0B1620] text-[#1A242D] dark:text-white font-semibold cursor-pointer"
            >
              <option value="All">All districts</option>
              {districts.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as SortBy)}
              aria-label="Sort listings"
              className="h-9 px-2 rounded border border-[#DCE1E5] dark:border-[#1E2E3D] bg-white dark:bg-[#0B1620] text-[#1A242D] dark:text-white font-semibold cursor-pointer"
            >
              <option value="featured">Sort: Featured</option>
              <option value="price-asc">Price: low to high</option>
              <option value="price-desc">Price: high to low</option>
              <option value="rating">Highest rated</option>
            </select>

            <button
              onClick={() => setVerifiedDocsOnly((value) => !value)}
              aria-pressed={verifiedDocsOnly}
              className={`h-9 px-3 rounded border font-semibold flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors ${
                verifiedDocsOnly
                  ? 'bg-[#00875A] border-[#00875A] text-white'
                  : 'bg-white dark:bg-[#0B1620] border-[#DCE1E5] dark:border-[#1E2E3D] text-[#1A242D] dark:text-white hover:border-[#00875A]'
              }`}
            >
              <FileCheck2 className="w-3.5 h-3.5" />
              Documents complete
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-[#5A6872] dark:text-slate-400 font-semibold">
          {filtered.length} {filtered.length === 1 ? 'listing' : 'listings'}
          {kind !== 'all' ? ` in ${KIND_TABS.find((tab) => tab.id === kind)?.label}` : ''}
        </p>
        {(kind !== 'all' || district !== 'All' || verifiedDocsOnly || searchQuery) && (
          <button
            onClick={() => {
              setKind('all');
              setDistrict('All');
              setVerifiedDocsOnly(false);
              setSearchQuery('');
            }}
            className="text-xs font-semibold text-[#0B3B60] dark:text-[#8df7c1] hover:underline cursor-pointer"
          >
            Reset filters
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-[#111D27] border border-[#DCE1E5] dark:border-[#1E2E3D] rounded p-8 text-center">
          <Search className="w-8 h-8 text-[#8A98A5] mx-auto mb-2" />
          <h3 className="text-sm font-bold text-[#1A242D] dark:text-white">No listings match those filters</h3>
          <p className="text-xs text-[#5A6872] dark:text-slate-400 mt-1">
            Try a different district, or turn off the documents filter to see listings with papers still being verified.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
          {filtered.map((listing) => (
            <ListingCard key={listing.id} listing={listing} onOpen={() => setSelected(listing)} />
          ))}
        </div>
      )}

      {selected && (
        <ListingDetailModal listing={selected} onClose={() => setSelected(null)} onOpenCredits={onOpenCredits} />
      )}
    </div>
  );
};
