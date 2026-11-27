import { Product, LocationNode, Order, MobileMoneyProvider, CartItem, VendorStore, BlueCollarService, ServiceBooking } from '../types';

type ClerkTokenOptions = { skipCache?: boolean };

let clerkTokenProvider: ((options?: ClerkTokenOptions) => Promise<string | null>) | null = null;

export function setClerkTokenProvider(provider: ((options?: ClerkTokenOptions) => Promise<string | null>) | null) {
  clerkTokenProvider = provider;
}

async function authHeaders(required = false, options?: ClerkTokenOptions): Promise<Record<string, string>> {
  let token = await clerkTokenProvider?.(options);
  // A session that is still being established hands back no token at all. Asking once more,
  // bypassing the cache, lets the submission go through instead of failing unauthenticated.
  if (!token && required && !options?.skipCache) {
    token = (await clerkTokenProvider?.({ skipCache: true })) ?? null;
  }
  // Carries the 401 so callers report a session problem instead of an outage.
  if (required && !token) throw new ApiError('Please sign in to continue', 401);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Calls an authenticated endpoint and retries once with a freshly minted Clerk token
 * when the server rejects the cached one. A session refreshed in another tab, or a token
 * that was still being minted when the call started, lands here as a 401 that the retry
 * fixes instead of surfacing "please sign in again" to a signed-in visitor.
 */
async function authFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = { ...(init.headers as Record<string, string> | undefined), ...await authHeaders(true) };
  const res = await fetch(path, { ...init, headers });
  if (res.status !== 401) return res;

  let freshToken: string | null = null;
  try {
    freshToken = (await clerkTokenProvider?.({ skipCache: true })) ?? null;
  } catch {
    freshToken = null;
  }
  if (!freshToken) {
    // If we can't get a fresh token, return the original response    // but let the caller handle it rather than surfacing sign-in immediately.    // The caller (e.g., getCurrentUser) can check res.ok and provide a better UX.    return res;
  }
  return fetch(path, { ...init, headers: { ...headers, Authorization: `Bearer ${freshToken}` } });
}

/** A logo upload that stalls for this long is treated as a dropped connection and retried once. */
const STORE_LOGO_UPLOAD_TIMEOUT_MS = 45_000;

/**
 * An API failure that keeps the HTTP status, so callers can tell auth problems apart from
 * outages. `code` is the server's short reason when it supplies one (`token-expired`,
 * `secret-missing`, `azp-mismatch`, …); it never contains key material.
 */
export class ApiError extends Error {
  status: number;
  code: string | null;
  constructor(message: string, status: number, code: string | null = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

async function throwApiError(res: Response, fallback: string): Promise<never> {
  const text = await res.text();
  let message = fallback;
  let code: string | null = null;
  if (text) {
    try {
      const payload = JSON.parse(text);
      if (typeof payload.error === 'string') message = payload.error;
      if (typeof payload.code === 'string') code = payload.code;
    } catch {
      message = text;
    }
  }
  throw new ApiError(message, res.status, code);
}

export type ReviewStatus = 'pending' | 'approved' | 'rejected';

export interface StoreSubmission {
  id: string;
  kind: 'store' | 'product' | 'service';
  /** The full Product/BlueCollarService saved for a listing submission. */
  payload: Product | BlueCollarService | null;
  owner_id: string | null;
  owner_email: string;
  owner_name: string | null;
  name: string;
  slug: string;
  tagline: string | null;
  description: string | null;
  location_hub: string | null;
  province: string | null;
  street_address: string | null;
  phone: string;
  payout_provider: string | null;
  payout_phone: string | null;
  logo: string | null;
  status: ReviewStatus;
  review_note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_store_id: string | null;
  created_at: string;
  updated_at: string;
}

/** A live catalog item the merchant manages from their own dashboard. */
export interface MerchantProduct {
  id: string;
  title: string;
  category: string;
  priceSLE: number;
  stockCount: number;
  isActive: boolean;
  image: string;
  description: string;
  createdAt: string | null;
}

/** The merchant's editable store profile, mirrored from the approved application. */
export interface MerchantStoreProfile {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  locationHub: string;
  province: string;
  streetAddress: string;
  phone: string;
  payoutProvider: string;
  payoutPhone: string;
  logo: string;
  status: string;
  reviewNote: string | null;
  reviewedAt: string | null;
}

export type FulfillmentStatus = 'placed' | 'dispatched' | 'delivered' | 'cancelled';

export interface MerchantSaleRow {
  orderId: string;
  trackingNumber: string;
  /** This store's own progress on the order. */
  status: FulfillmentStatus;
  recipientName: string;
  itemsSummary: string;
  quantity: number;
  totalSLE: number;
  createdAt: string;
}

export interface MerchantSalesSummary {
  revenueSLE: number;
  unitsSold: number;
  orderCount: number;
  revenueLast30SLE: number;
  unitsLast30: number;
  ordersLast30: number;
  recentOrders: MerchantSaleRow[];
}

export interface MerchantOverview {
  /** null until an admin approves the merchant's store application. */
  store: MerchantStoreProfile | null;
  products: MerchantProduct[];
  sales: MerchantSalesSummary;
}

export type MerchantProductInput = Omit<MerchantProduct, 'id' | 'createdAt'>;

export const api = {
  async getCurrentUser() {
    const res = await authFetch('/api/custom-auth/me');
    if (!res.ok) return throwApiError(res, 'Could not load your account');
    const data = await res.json();
    return { user: data.user, isAdmin: data.isAdmin === true };
  },

  // 1. Fetch products
  async getProducts(params?: { category?: string; search?: string; flashDeals?: boolean }): Promise<Product[]> {
    try {
      const query = new URLSearchParams();
      if (params?.category && params.category !== 'All') query.set('category', params.category);
      if (params?.search) query.set('search', params.search);
      if (params?.flashDeals) query.set('flashDeals', 'true');

      const res = await fetch(`/api/products?${query.toString()}`);
      // Handle non-JSON error responses from the server
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Failed to fetch products');
      }
      const data = await res.json();
      return data.data;
    } catch (err) {
      console.warn('API error fetching products, using local state:', err);
      return [];
    }
  },

  // 2. Add product (Merchant Hub: Store or Single Item)
  async createProduct(productData: Partial<Product>): Promise<Product> {
    const res = await authFetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(productData),
    });
    if (!res.ok) return throwApiError(res, 'Failed to create product');
    const data = await res.json();
    return data.data;
  },

  // 3. Fetch Locations
  async getLocations(): Promise<LocationNode[]> {
    try {
      const res = await fetch('/api/locations');
      // Handle non-JSON error responses from the server
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Failed to fetch locations');
      }
      const data = await res.json();
      return data.data;
    } catch (err) {
      console.warn('API error fetching locations:', err);
      return [];
    }
  },

  // 4. Create Order
  async createOrder(orderPayload: {
    items: CartItem[];
    recipientName: string;
    phone: string;
    destinationId: string;
    streetAddress: string;
    landmark?: string;
    paymentMethod: MobileMoneyProvider;
    buyerId?: string;
  }): Promise<Order | null> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...await authHeaders(),
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers,
        body: JSON.stringify(orderPayload),
      });
      // Handle non-JSON error responses from the server
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Failed to create order');
      }
      const data = await res.json();
      return data.data;
    } catch (err) {
      console.warn('API error creating order:', err);
      return null;
    }
  },

  // 4b. Fetch Orders with Better Auth Row-Level Security
  async getOrders(): Promise<Order[]> {
    try {
      const headers = await authHeaders();

      const res = await fetch('/api/orders', { headers });
      // Handle non-JSON error responses from the server
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Failed to fetch orders');
      }
      const data = await res.json();
      return data.data;
    } catch (err) {
      console.warn('API error fetching orders:', err);
      return [];
    }
  },

  // 5. Track Order
  async getOrder(trackingNumber: string): Promise<Order | null> {
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(trackingNumber)}`);
      // Handle non-JSON error responses from the server
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Order not found');
      }
      const data = await res.json();
      return data.data;
    } catch (err) {
      console.warn('API error tracking order:', err);
      return null;
    }
  },

  // 6. Initiate Mobile Money Push
  async initiateUSSDPush(phone: string, amountSLE: number, provider: MobileMoneyProvider) {
    try {
      const res = await fetch('/api/payments/ussd-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, amountSLE, provider }),
      });
      // Handle non-JSON error responses from the server
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Failed to initiate USSD push');
      }
      return await res.json();
    } catch (err) {
      console.warn('API error initiating USSD push:', err);
      return null;
    }
  },

  // 7. Vendor Stores API
  async getStores(): Promise<VendorStore[]> {
    try {
      const res = await fetch('/api/stores');
      // Handle non-JSON error responses from the server
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Failed to fetch stores');
      }
      const data = await res.json();
      return data.data;
    } catch (err) {
      console.warn('API error fetching stores:', err);
      return [];
    }
  },

  async createStore(storeData: Partial<VendorStore>): Promise<VendorStore> {
    const res = await authFetch('/api/stores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(storeData),
    });
    if (!res.ok) return throwApiError(res, 'Failed to create store');
    const data = await res.json();
    return data.data;
  },

  /**
   * Uploads a store logo and returns its hosted URL. The store form only opens for a
   * signed-in merchant, so this reports on the image and the transfer: the file body is
   * sent with the session token, a dropped or stalled transfer is retried once instead of
   * asking for the file again, and every failure comes back as an upload problem.
   */
  async uploadStoreLogo(file: File): Promise<string> {
    const post = async (): Promise<Response> => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), STORE_LOGO_UPLOAD_TIMEOUT_MS);
      try {
        return await authFetch('/api/stores/logo', {
          method: 'POST',
          headers: {
            'Content-Type': file.type || 'application/octet-stream',
            'X-File-Name': encodeURIComponent(file.name),
          },
          body: file,
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeout);
      }
    };

    let res: Response;
    try {
      res = await post();
    } catch {
      // The bytes are still in hand, so a stalled or dropped transfer costs one retry
      // rather than making the merchant pick the image again.
      res = await post();
    }

    if (!res.ok) return throwApiError(res, 'Could not upload the store logo');
    const data = await res.json().catch(() => null);
    if (!data?.success || typeof data.url !== 'string' || !data.url) {
      throw new ApiError('The image service returned an invalid logo URL', 502);
    }
    return data.url;
  },

  /** Merchant: submit a single item or artisan registration for review. */
  async submitListing(
    kind: 'product' | 'service',
    payload: Partial<Product> | Partial<BlueCollarService>,
  ): Promise<{ submission: StoreSubmission; emailStatus: string }> {
    const endpoint = kind === 'product' ? '/api/products' : '/api/services';
    const res = await authFetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      return throwApiError(res, kind === 'product' ? 'Could not submit the listing' : 'Could not submit the registration');
    }
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Could not submit for review');
    return { submission: data.data as StoreSubmission, emailStatus: data.emailStatus };
  },

  /** Merchant: submit a store for review. Returns the pending application — the store only becomes public once an admin approves it. */
  async submitStoreApplication(storeData: Partial<VendorStore>): Promise<{ submission: StoreSubmission; emailStatus: 'sent' | 'logged' | 'failed' }> {
    const res = await authFetch('/api/stores/submissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(storeData),
    });
    // Handle non-JSON error responses from the server
    if (!res.ok) return throwApiError(res, 'Could not submit your store');
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Could not submit your store');
    return { submission: data.data as StoreSubmission, emailStatus: data.emailStatus };
  },

  /** Merchant: my own applications, for showing pending/rejected status. */
  async getMyStoreApplications(): Promise<StoreSubmission[]> {
    const res = await authFetch('/api/stores/submissions/mine');
    // Handle non-JSON error responses from the server
    if (!res.ok) return throwApiError(res, 'Could not load your applications');
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Could not load your applications');
    return data.data as StoreSubmission[];
  },

  /** Merchant: everything the store dashboard shows — store, catalog and sales. */
  async getMerchantOverview(): Promise<MerchantOverview> {
    const res = await authFetch('/api/merchant/overview');
    if (!res.ok) return throwApiError(res, 'Could not load your store dashboard');
    const data = await res.json();
    return data.data as MerchantOverview;
  },

  /** Merchant: save the editable parts of the store profile. */
  async updateMerchantStore(
    patch: Partial<Omit<MerchantStoreProfile, 'id' | 'slug' | 'status' | 'reviewNote' | 'reviewedAt'>>,
  ): Promise<MerchantStoreProfile> {
    const res = await authFetch('/api/merchant/store', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (!res.ok) return throwApiError(res, 'Could not save your store');
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Could not save your store');
    return data.data as MerchantStoreProfile;
  },

  /** Merchant: add a product to the live catalog. */
  async createMerchantProduct(product: MerchantProductInput): Promise<MerchantProduct> {
    const res = await authFetch('/api/merchant/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product),
    });
    if (!res.ok) return throwApiError(res, 'Could not add the product');
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Could not add the product');
    return data.data as MerchantProduct;
  },

  /** Merchant: change price, stock, description or visibility of own product. */
  async updateMerchantProduct(id: string, patch: Partial<MerchantProductInput>): Promise<MerchantProduct> {
    const res = await authFetch(`/api/merchant/products/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (!res.ok) return throwApiError(res, 'Could not save the product');
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Could not save the product');
    return data.data as MerchantProduct;
  },

  /** Merchant: mark their lines of an order as dispatched or delivered. */
  async updateMerchantOrderStatus(
    orderId: string,
    status: 'dispatched' | 'delivered',
  ): Promise<{ status: FulfillmentStatus; orderStatus: string }> {
    const res = await authFetch(`/api/merchant/orders/${encodeURIComponent(orderId)}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) return throwApiError(res, 'Could not update the order');
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Could not update the order');
    return data.data;
  },

  /** Merchant: remove a product from the catalog. */
  async deleteMerchantProduct(id: string): Promise<void> {
    const res = await authFetch(`/api/merchant/products/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (!res.ok) return throwApiError(res, 'Could not remove the product');
  },

  /** Admin: the review queue. */
  async getStoreSubmissions(status?: ReviewStatus): Promise<StoreSubmission[]> {
    const query = status ? `?status=${status}` : '';
    const res = await authFetch(`/api/admin/store-submissions${query}`);
    // Handle non-JSON error responses from the server
    if (!res.ok) return throwApiError(res, 'Could not load the review queue');
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Could not load the review queue');
    return data.data as StoreSubmission[];
  },

  /** Admin: the exact approval email, built but not sent, so it can be reviewed first. */
  async previewApprovalEmail(
    id: string,
    note: string,
  ): Promise<{ subject: string; html: string; text: string }> {
    const res = await authFetch(`/api/admin/store-submissions/${id}/approval-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note }),
    });
    // Handle non-JSON error responses from the server
    if (!res.ok) return throwApiError(res, 'Could not build the email preview');
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Could not build the email preview');
    return data.data;
  },

  /** Admin: approve a pending application, publishing the store and emailing the merchant. */
  async approveStoreSubmission(id: string, note?: string): Promise<{ submission: StoreSubmission; emailStatus: string }> {
    const res = await authFetch(`/api/admin/store-submissions/${id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note }),
    });
    // Handle non-JSON error responses from the server
    if (!res.ok) return throwApiError(res, 'Could not approve the application');
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Could not approve the application');
    return { submission: data.data as StoreSubmission, emailStatus: data.emailStatus };
  },

  /** Admin: add, edit or clear the note on an approved application without re-deciding it. */
  async updateStoreSubmissionNote(id: string, note: string): Promise<StoreSubmission> {
    const res = await authFetch(`/api/admin/store-submissions/${id}/note`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note }),
    });
    // Handle non-JSON error responses from the server
    if (!res.ok) return throwApiError(res, 'Could not save the approval note');
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Could not save the approval note');
    return data.data as StoreSubmission;
  },

  /** Admin: reject a pending application with a reason that is emailed to the merchant. */
  async rejectStoreSubmission(id: string, reason: string): Promise<{ submission: StoreSubmission; emailStatus: string }> {
    const res = await authFetch(`/api/admin/store-submissions/${id}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    // Handle non-JSON error responses from the server
    if (!res.ok) return throwApiError(res, 'Could not reject the application');
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Could not reject the application');
    return { submission: data.data as StoreSubmission, emailStatus: data.emailStatus };
  },

  // 8. Blue-Collar Services API
  async getServices(tradeCategory?: string): Promise<BlueCollarService[]> {
    try {
      const url = tradeCategory && tradeCategory !== 'All'
        ? `/api/services?tradeCategory=${encodeURIComponent(tradeCategory)}`
        : '/api/services';
      const res = await fetch(url);
      // Handle non-JSON error responses from the server
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Failed to fetch services');
      }
      const data = await res.json();
      return data.data;
    } catch (err) {
      console.warn('API error fetching services:', err);
      return [];
    }
  },

  async createService(serviceData: Partial<BlueCollarService>): Promise<BlueCollarService> {
    const res = await authFetch('/api/services', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(serviceData),
    });
    if (!res.ok) return throwApiError(res, 'Failed to create service');
    const data = await res.json();
    return data.data;
  },

  async bookService(bookingData: {
    serviceId: string;
    customerName: string;
    customerPhone: string;
    location: string;
    preferredTime: string;
    issueDescription: string;
    paymentMethod: MobileMoneyProvider;
  }): Promise<ServiceBooking | null> {
    try {
      const res = await fetch('/api/services/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingData),
      });
      if (!res.ok) throw new Error('Failed to book service');
      const data = await res.json();
      return data.data;
    } catch (err) {
      console.warn('API error booking service:', err);
      return null;
    }
  },

  // 9. Interactive Chatbot Q&A API
  async sendChatMessage(
    message: string,
    history?: { sender: 'user' | 'assistant'; text: string }[]
  ): Promise<{ reply: string; action?: { type: string; label: string; payload?: string } }> {
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, history }),
      });
      // Handle non-JSON error responses from the server
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Chatbot service unavailable');
      }
      const data = await res.json();
      return { reply: data.reply, action: data.action };
    } catch (err) {
      console.warn('API error in chat, using versatile client fallback:', err);
      const query = message.toLowerCase();
      if (query.includes('login') || query.includes('sign in') || query.includes('signing') || query.includes('signup') || query.includes('register') || query.includes('auth')) {
        return {
          reply: 'To optimize login and sign-up pages: 1) Support instant WhatsApp/SMS phone OTP for mobile convenience. 2) Provide a 1-tap password visibility toggle. 3) Reduce registration fields to essentials. 4) Offer social login (Google/Apple). 5) Keep sessions persistent so returning shoppers stay logged in.',
          action: { type: 'open_auth', label: 'Try Login Flow' },
        };
      }
      if (query.includes('design') || query.includes('ui') || query.includes('ux') || query.includes('improve')) {
        return {
          reply: 'Top e-commerce UX best practices: 1) Fast above-the-fold loading with lazy-loaded catalog sections. 2) Thumb-friendly touch targets (min 44px) on mobile. 3) High-contrast light and dark themes. 4) Clear call-to-actions on product and cart cards.',
        };
      }
      if (query.includes('store') || query.includes('sell') || query.includes('vendor')) {
        return {
          reply: 'Opening a store on Abu Marketplace takes just 2 minutes! Open the Merchant Hub to configure your storefront, list products, or register as a certified trade artisan.',
          action: { type: 'open_merchant', label: 'Open Merchant Hub' },
        };
      }
      if (query.includes('track') || query.includes('order')) {
        return {
          reply: 'You can track your order status live anytime using your tracking number in the Order Tracking portal.',
          action: { type: 'open_tracking', label: 'Track Order' },
        };
      }
      if (query.includes('pay') || query.includes('money') || query.includes('cash')) {
        return {
          reply: 'Orders on Abu Marketplace are fulfilled via Cash on Delivery / Pay on Delivery. Buyers physically inspect items upon delivery before completing payment in cash.',
          action: { type: 'view_cart', label: 'View Cart' },
        };
      }
      return {
        reply: 'I am Abu Marketplace\'s AI Assistant, ready to help with products, delivery schedules across Sierra Leone, vendor stores, account features, or technical questions. How can I assist you?',
      };
    }
  },

  // 10. Standard CMS Operations
  async updateProduct(id: string, updates: Partial<Product>): Promise<Product | null> {
    try {
      const res = await authFetch(`/api/products/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      // Handle non-JSON error responses from the server
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Failed to update product');
      }
      const data = await res.json();
      return data.data;
    } catch (err) {
      console.warn('API error updating product:', err);
      return null;
    }
  },

  async deleteProduct(id: string): Promise<boolean> {
    try {
      const res = await authFetch(`/api/products/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      // Handle non-JSON error responses from the server
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Failed to delete product');
      }
      return res.ok;
    } catch (err) {
      console.warn('API error deleting product:', err);
      return false;
    }
  },

  async duplicateProduct(id: string): Promise<Product | null> {
    try {
      const res = await authFetch(`/api/products/${encodeURIComponent(id)}/duplicate`, {
        method: 'POST',
      });
      // Handle non-JSON error responses from the server
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Failed to duplicate product');
      }
      const data = await res.json();
      return data.data;
    } catch (err) {
      console.warn('API error duplicating product:', err);
      return null;
    }
  },

  async resetCatalog(): Promise<boolean> {
    try {
      const res = await authFetch('/api/cms/reset', {
        method: 'POST',
      });
      // Handle non-JSON error responses from the server
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Failed to reset catalog');
      }
      return res.ok;
    } catch (err) {
      console.warn('API error resetting catalog:', err);
      return false;
    }
  },

  async getMediaAssets(): Promise<Array<{ fileName: string; url: string; usedBy: any }>> {
    try {
      const res = await authFetch('/api/cms/media');
      // Handle non-JSON error responses from the server
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Failed to fetch media assets');
      }
      const data = await res.json();
      return data.data || [];
    } catch (err) {
      console.warn('API error fetching media assets:', err);
      return [];
    }
  },
};
