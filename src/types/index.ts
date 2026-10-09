export type Province = 'Western Area' | 'Southern Province' | 'Northern Province' | 'Eastern Province';

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
  | 'Blue Collar Services';

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
