import type { 
  Product, 
  LocationNode, 
  Order, 
  MobileMoneyProvider, 
  CartItem, 
  VendorStore, 
  BlueCollarService, 
  ServiceBooking 
} from '../types';

export const api = {
  // 1. Fetch products
  async getProducts(params?: { category?: string; search?: string; flashDeals?: boolean }): Promise<Product[]> {
    try {
      const query = new URLSearchParams();
      if (params?.category && params.category !== 'All') query.set('category', params.category);
      if (params?.search) query.set('search', params.search);
      if (params?.flashDeals) query.set('flashDeals', 'true');

      const res = await fetch(`/api/products?${query.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch products');
      const data = await res.json();
      return data.data;
    } catch (err) {
      console.warn('API error fetching products, using local state:', err);
      return [];
    }
  },

  // 2. Add product (Merchant Hub: Store or Single Item)
  async createProduct(productData: Partial<Product>): Promise<Product | null> {
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData),
      });
      if (!res.ok) throw new Error('Failed to create product');
      const data = await res.json();
      return data.data;
    } catch (err) {
      console.warn('API error creating product:', err);
      return null;
    }
  },

  // 3. Fetch Locations
  async getLocations(): Promise<LocationNode[]> {
    try {
      const res = await fetch('/api/locations');
      if (!res.ok) throw new Error('Failed to fetch locations');
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
  }): Promise<Order | null> {
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload),
      });
      if (!res.ok) throw new Error('Failed to create order');
      const data = await res.json();
      return data.data;
    } catch (err) {
      console.warn('API error creating order:', err);
      return null;
    }
  },

  // 5. Track Order
  async getOrder(trackingNumber: string): Promise<Order | null> {
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(trackingNumber)}`);
      if (!res.ok) throw new Error('Order not found');
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
      if (!res.ok) throw new Error('Failed to initiate USSD push');
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
      if (!res.ok) throw new Error('Failed to fetch stores');
      const data = await res.json();
      return data.data;
    } catch (err) {
      console.warn('API error fetching stores:', err);
      return [];
    }
  },

  async createStore(storeData: Partial<VendorStore>): Promise<VendorStore | null> {
    try {
      const res = await fetch('/api/stores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(storeData),
      });
      if (!res.ok) throw new Error('Failed to create store');
      const data = await res.json();
      return data.data;
    } catch (err) {
      console.warn('API error creating store:', err);
      return null;
    }
  },

  // 8. Blue-Collar Services API
  async getServices(tradeCategory?: string): Promise<BlueCollarService[]> {
    try {
      const url = tradeCategory && tradeCategory !== 'All' 
        ? `/api/services?tradeCategory=${encodeURIComponent(tradeCategory)}` 
        : '/api/services';
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch services');
      const data = await res.json();
      return data.data;
    } catch (err) {
      console.warn('API error fetching services:', err);
      return [];
    }
  },

  async createService(serviceData: Partial<BlueCollarService>): Promise<BlueCollarService | null> {
    try {
      const res = await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(serviceData),
      });
      if (!res.ok) throw new Error('Failed to create service');
      const data = await res.json();
      return data.data;
    } catch (err) {
      console.warn('API error creating service:', err);
      return null;
    }
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
  async sendChatMessage(message: string): Promise<{
    reply: string;
    action?: { type: string; label: string; payload?: string };
  }> {
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });
      if (!res.ok) throw new Error('Chatbot service unavailable');
      const data = await res.json();
      return {
        reply: data.reply,
        action: data.action,
      };
    } catch (err) {
      console.warn('API error in chat, using instant fallback:', err);
      return {
        reply: "Please note that no mobile money will be used initially. All marketplace orders are handled via Cash on Delivery / Pay on Delivery upon physical inspection of your items. You can also click 'Create Store' to register your business.",
      };
    }
  },
};
