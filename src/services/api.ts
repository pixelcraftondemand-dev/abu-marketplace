import { Product, LocationNode, Order, MobileMoneyProvider, CartItem, VendorStore, BlueCollarService, ServiceBooking } from '../types';

let clerkTokenProvider: (() => Promise<string | null>) | null = null;

export function setClerkTokenProvider(provider: (() => Promise<string | null>) | null) {
  clerkTokenProvider = provider;
}

async function authHeaders(required = false): Promise<Record<string, string>> {
  const token = await clerkTokenProvider?.();
  if (required && !token) throw new Error('Please sign in to continue');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function throwApiError(res: Response, fallback: string): Promise<never> {
  const text = await res.text();
  let message = fallback;
  if (text) {
    try {
      const payload = JSON.parse(text);
      if (typeof payload.error === 'string') message = payload.error;
    } catch {
      message = text;
    }
  }
  throw new Error(message);
}

export type ReviewStatus = 'pending' | 'approved' | 'rejected';

export interface StoreSubmission {
  id: string;
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

export const api = {
  async getCurrentUser() {
    const res = await fetch('/api/custom-auth/me', { headers: await authHeaders(true) });
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
    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...await authHeaders(true) },
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
    const res = await fetch('/api/stores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...await authHeaders(true) },
      body: JSON.stringify(storeData),
    });
    if (!res.ok) return throwApiError(res, 'Failed to create store');
    const data = await res.json();
    return data.data;
  },

  /** Merchant: submit a store for review. Returns the pending application — the store only becomes public once an admin approves it. */
  async submitStoreApplication(storeData: Partial<VendorStore>): Promise<{ submission: StoreSubmission; emailStatus: 'sent' | 'logged' | 'failed' }> {
    const headers = await authHeaders(true);
    const res = await fetch('/api/stores/submissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
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
    const headers = await authHeaders(true);
    const res = await fetch('/api/stores/submissions/mine', {
      headers,
    });
    // Handle non-JSON error responses from the server
    if (!res.ok) return throwApiError(res, 'Could not load your applications');
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Could not load your applications');
    return data.data as StoreSubmission[];
  },

  /** Admin: the review queue. */
  async getStoreSubmissions(status?: ReviewStatus): Promise<StoreSubmission[]> {
    const headers = await authHeaders(true);
    const query = status ? `?status=${status}` : '';
    const res = await fetch(`/api/admin/store-submissions${query}`, {
      headers,
    });
    // Handle non-JSON error responses from the server
    if (!res.ok) return throwApiError(res, 'Could not load the review queue');
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Could not load the review queue');
    return data.data as StoreSubmission[];
  },

  /** Admin: approve a pending application, publishing the store and emailing the merchant. */
  async approveStoreSubmission(id: string, note?: string): Promise<{ submission: StoreSubmission; emailStatus: string }> {
    const headers = await authHeaders(true);
    const res = await fetch(`/api/admin/store-submissions/${id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({ note }),
    });
    // Handle non-JSON error responses from the server
    if (!res.ok) return throwApiError(res, 'Could not approve the application');
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Could not approve the application');
    return { submission: data.data as StoreSubmission, emailStatus: data.emailStatus };
  },

  /** Admin: reject a pending application with a reason that is emailed to the merchant. */
  async rejectStoreSubmission(id: string, reason: string): Promise<{ submission: StoreSubmission; emailStatus: string }> {
    const headers = await authHeaders(true);
    const res = await fetch(`/api/admin/store-submissions/${id}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
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
    const res = await fetch('/api/services', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...await authHeaders(true) },
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
      const res = await fetch(`/api/products/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...await authHeaders(true) },
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
      const res = await fetch(`/api/products/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: await authHeaders(true),
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
      const res = await fetch(`/api/products/${encodeURIComponent(id)}/duplicate`, {
        method: 'POST',
        headers: await authHeaders(true),
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
      const res = await fetch('/api/cms/reset', {
        method: 'POST',
        headers: await authHeaders(true),
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
      const res = await fetch('/api/cms/media', { headers: await authHeaders(true) });
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