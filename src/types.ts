export type Province = 'Western Area' | 'Southern Province' | 'Northern Province' | 'Eastern Province';

/** The visitor's chosen marketplace experience. */
export type VisitorIntent = 'buyer' | 'service' | 'seller';

export interface LocationNode {
  id: string;
  name: string;
  province: Province;
  transitTime: string;
  deliveryFeeSLE: number;
  hubName: string;
}

export type Category = 
  | 'All'
  | 'Solar & Power'
  | 'Phones & Tablets'
  | 'Electronics & Audio'
  | 'Home & Living'
  | 'Fashion & Footwear'
  | 'Groceries & Non-Perishables'
  | 'Home & Office Furniture'
  | 'Appliances & Utensils'
  | 'Beauty, Perfumes & Hygiene'
  | 'Baby & Kids Toys'
  | 'Sports Gears & Jerseys'
  | 'Power Tools & Safety Gear'
  | 'Vehicles & E-Bikes'
  | 'Books, Art & Stationery'
  | 'Blue Collar Services'
  | 'Others';

export type ItemCondition = 'brand_new' | 'like_new' | 'used';

export interface Product {
  id: string;
  title: string;
  category: Category;
  priceSLE: number;
  originalPriceSLE: number;
  discountPercent?: number;
  rating: number;
  reviewCount: number;
  soldCount: number;
  stockCount: number;
  image: string;
  additionalImages?: string[];
  sellerName: string;
  sellerLocation: string;
  isVerifiedSeller: boolean;
  sellerRating: number;
  isFlashDeal?: boolean;
  description: string;
  specifications: Record<string, string>;
  features: string[];
  storeId?: string;
  condition?: ItemCondition;
  sellerType?: 'store' | 'individual';
  sellerPhone?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export type MobileMoneyProvider = 'orange' | 'afrimoney' | 'cash';

export interface Order {
  id: string;
  items: CartItem[];
  subtotalSLE: number;
  deliveryFeeSLE: number;
  totalSLE: number;
  recipientName: string;
  phone: string;
  destination: LocationNode;
  streetAddress: string;
  landmark?: string;
  paymentMethod: MobileMoneyProvider;
  paymentStatus: 'pending' | 'authorized' | 'completed';
  orderStatus: 'placed' | 'packed' | 'in_transit' | 'delivered';
  placedAt: string;
  estimatedDelivery: string;
  trackingNumber: string;
}

// ----------------------------------------------------
// VENDOR STORE TRACK
// ----------------------------------------------------
export interface VendorStore {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  description: string;
  locationHub: string;
  province: Province;
  streetAddress: string;
  phone: string;
  payoutProvider: MobileMoneyProvider;
  payoutPhone: string;
  isVerified: boolean;
  rating: number;
  reviewsCount: number;
  totalSales: number;
  establishedYear: number;
  logo: string;
  coverImage?: string;
  productCount: number;
  /** When the store went live (ISO). Seeded directory entries have no go-live date. */
  createdAt?: string;
}

// ----------------------------------------------------
// BLUE-COLLAR SERVICE TRACK
// ----------------------------------------------------
export type TradeCategory = 
  | 'Solar & Inverter Technician'
  | 'Electrician & Generator'
  | 'AC & Refrigeration'
  | 'Plumbing & Water Tanks'
  | 'Auto Mechanic & Diagnostics'
  | 'Carpentry & Masonry'
  | 'Phone & Laptop Repair';

export interface BlueCollarService {
  id: string;
  title: string;
  tradeCategory: TradeCategory;
  providerName: string;
  phone: string;
  whatsapp?: string;
  payoutProvider: MobileMoneyProvider;
  experienceYears: number;
  locationHub: string;
  province: Province;
  coverageAreas: string[];
  calloutFeeSLE: number;
  pricingModel: 'flat_callout' | 'hourly' | 'per_job';
  rating: number;
  completedJobs: number;
  isAvailableNow: boolean;
  avatar: string;
  description: string;
  skills: string[];
  certification?: string;
}

export interface ServiceBooking {
  id: string;
  serviceId: string;
  serviceTitle: string;
  providerName: string;
  providerPhone: string;
  customerName: string;
  customerPhone: string;
  location: string;
  preferredTime: string;
  issueDescription: string;
  calloutFeeSLE: number;
  paymentMethod: MobileMoneyProvider;
  status: 'pending' | 'accepted' | 'completed';
  createdAt: string;
}

// ----------------------------------------------------
// PROPERTY, LAND & VEHICLE TRACK
// ----------------------------------------------------
export type ListingKind = 'airbnb' | 'estate' | 'land' | 'vehicle';

/** How the asking price is charged: nightly short-let, monthly rent, or a one-off sale. */
export type ListingPriceUnit = 'night' | 'month' | 'total';

export type ListingDocumentStatus = 'verified' | 'pending' | 'missing';

export interface ListingDocument {
  name: string;
  /** Who issued it, e.g. the Lands Ministry or the Sierra Leone Police (for vehicle papers). */
  issuer: string;
  status: ListingDocumentStatus;
}

export interface ListingImage {
  /** Absolute CDN/storage URL, or a path relative to VITE_LISTING_IMAGE_CDN_BASE. */
  url: string;
  /** Photographer / uploader credit shown with the photo. */
  credit: string;
  /** Licence label, e.g. "CC BY-SA 3.0". */
  license?: string;
  /** Original file page, for full attribution. */
  sourceUrl?: string;
}

export interface PropertyListing {
  id: string;
  kind: ListingKind;
  title: string;
  subtitle: string;
  district: string;
  area: string;
  province: Province;
  /** Listing photos, cover first. Empty or missing falls back to gradient artwork. */
  images?: ListingImage[];
  priceSLE: number;
  priceUnit: ListingPriceUnit;
  negotiable: boolean;
  /** Short headline facts, e.g. Bedrooms / Bathrooms / Year / Fuel. */
  highlights: Record<string, string>;
  /** Footprint for property, payload or seating for vehicles. */
  sizeLabel: string;
  capacityLabel: string;
  documents: ListingDocument[];
  features: string[];
  description: string;
  ownerName: string;
  ownerType: 'agency' | 'owner' | 'dealer';
  phone: string;
  whatsapp?: string;
  rating: number;
  reviews: number;
  isVerified: boolean;
  availableNow: boolean;
  listedAt: string;
}

export type ViewMode = 'marketplace' | 'services' | 'stores' | 'property' | 'credits';

// ----------------------------------------------------
// USER AUTHENTICATION (WHATSAPP, GOOGLE, APPLE, PHONE)
// ----------------------------------------------------
export interface UserProfile {
  id: string;
  name: string;
  whatsappNumber?: string;
  phoneNumber?: string;
  email?: string;
  provider: 'whatsapp' | 'google' | 'facebook' | 'apple' | 'phone' | 'email' | 'clerk';
  isVerified: boolean;
  avatar?: string;
  preferredCity?: string;
  role: 'buyer' | 'merchant' | 'artisan';
  joinedAt: string;
}


