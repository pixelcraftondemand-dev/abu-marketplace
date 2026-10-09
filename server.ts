import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { Product, VendorStore, BlueCollarService, ServiceBooking } from './src/types/index.ts';
import { INITIAL_PRODUCTS, INITIAL_STORES, INITIAL_SERVICES } from './src/data/mockData.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// Serve public static assets
app.use('/products', express.static(path.resolve(__dirname, 'public', 'products')));
app.use('/images', express.static(path.resolve(__dirname, 'public', 'images')));
app.use('/src/assets/images', express.static(path.resolve(__dirname, 'public', 'products')));

// Sierra Leone logistics locations
const LOCATIONS = [
  {
    id: 'freetown-central',
    name: 'Freetown (Central / CBD)',
    province: 'Western Area',
    transitTime: 'Same-Day (2–4 hrs)',
    deliveryFeeSLE: 15,
    hubName: 'Siaka Stevens Hub',
  },
  {
    id: 'freetown-west',
    name: 'Aberdeen & Lumley',
    province: 'Western Area',
    transitTime: 'Same-Day (3–5 hrs)',
    deliveryFeeSLE: 20,
    hubName: 'Lumley Beach Express Center',
  },
  {
    id: 'freetown-east',
    name: 'Kissy & Wellington',
    province: 'Western Area',
    transitTime: 'Same-Day (4–6 hrs)',
    deliveryFeeSLE: 20,
    hubName: 'Kissy Industrial Depot',
  },
  {
    id: 'waterloo',
    name: 'Waterloo & Hastings',
    province: 'Western Area',
    transitTime: 'Next-Day (24 hrs)',
    deliveryFeeSLE: 30,
    hubName: 'Waterloo Crossroads Depot',
  },
  {
    id: 'bo-city',
    name: 'Bo City',
    province: 'Southern Province',
    transitTime: '24–48 hrs',
    deliveryFeeSLE: 40,
    hubName: 'Bo Provincial Logistics Hub',
  },
  {
    id: 'makeni',
    name: 'Makeni',
    province: 'Northern Province',
    transitTime: '24–48 hrs',
    deliveryFeeSLE: 40,
    hubName: 'Makeni Clocktower Distribution Hub',
  },
  {
    id: 'kenema',
    name: 'Kenema',
    province: 'Eastern Province',
    transitTime: '48–72 hrs',
    deliveryFeeSLE: 50,
    hubName: 'Kenema Hangha Express Hub',
  },
  {
    id: 'kono',
    name: 'Koidu / Kono',
    province: 'Eastern Province',
    transitTime: '48–72 hrs',
    deliveryFeeSLE: 55,
    hubName: 'Koidu City Central Terminal',
  },
];

// In-memory catalog seeded with verified products from mockData
let products: Product[] = [...INITIAL_PRODUCTS];

// In-memory orders store
let orders: any[] = [
  {
    id: 'ord-seed-001',
    trackingNumber: 'ABU-SL-78214',
    recipientName: 'Kallon Sesay',
    phone: '076 892 110',
    destination: LOCATIONS[0],
    streetAddress: '19 Siaka Stevens Street, Freetown',
    landmark: 'Opposite Cotton Tree',
    paymentMethod: 'orange',
    paymentStatus: 'authorized',
    orderStatus: 'in_transit',
    subtotalSLE: 1850,
    deliveryFeeSLE: 15,
    totalSLE: 1865,
    placedAt: '10:15 AM',
    estimatedDelivery: 'Within 2 hours',
    items: [
      {
        product: products[0],
        quantity: 1,
      },
    ],
  },
];

let stores: VendorStore[] = [...INITIAL_STORES];
let services: BlueCollarService[] = [...INITIAL_SERVICES];
let bookings: ServiceBooking[] = [];

// ----------------------------------------------------
// API ENDPOINTS
// ----------------------------------------------------

// 1. Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'Abu Marketplace Backend API',
    currency: 'SLE',
    country: 'Sierra Leone',
    activeProducts: products.length,
    totalOrders: orders.length,
    timestamp: new Date().toISOString(),
  });
});

// 2. Products API
app.get('/api/products', (req: Request, res: Response) => {
  const { category, search, flashDeals } = req.query;
  let result = [...products];

  if (category && category !== 'All') {
    result = result.filter((p) => p.category === category);
  }

  if (flashDeals === 'true') {
    result = result.filter((p) => p.isFlashDeal);
  }

  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    result = result.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.sellerName.toLowerCase().includes(q)
    );
  }

  res.json({ success: true, count: result.length, data: result });
});

app.get('/api/products/:id', (req: Request, res: Response) => {
  const product = products.find((p) => p.id === req.params.id);
  if (!product) {
    return res.status(404).json({ success: false, error: 'Product not found' });
  }
  res.json({ success: true, data: product });
});

// Add new product (Merchant Hub)
app.post('/api/products', (req: Request, res: Response) => {
  const { title, category, priceSLE, stockCount, description, sellerName, sellerLocation } = req.body;

  if (!title || !priceSLE) {
    return res.status(400).json({ success: false, error: 'Title and priceSLE are required' });
  }

  const newProduct: Product = {
    id: `prod-merchant-${Date.now()}`,
    title: String(title).trim(),
    category: category || 'Solar & Power',
    priceSLE: Number(priceSLE),
    originalPriceSLE: Math.round(Number(priceSLE) * 1.25),
    discountPercent: 20,
    rating: 5.0,
    reviewCount: 1,
    soldCount: 0,
    stockCount: Number(stockCount) || 5,
    image: req.body.image || '/src/assets/images/solar_pv_panel_monocrystalline_1791485557806.jpg',
    sellerName: sellerName || 'Verified Sierra Leone Merchant',
    sellerLocation: sellerLocation || 'Freetown Verified',
    isVerifiedSeller: true,
    sellerRating: 5.0,
    isFlashDeal: false,
    description: description || 'Authentic merchandise listed via Abu Merchant Hub.',
    specifications: {
      'Source': 'Authorized Stock',
      'Warranty': '1 Year Merchant Replacement',
      'Fulfillment': 'Abu Provincial Logistics',
    },
    features: [
      'Inspected for authentic quality standards',
      'Eligible for same-day delivery across Western Area',
    ],
  };

  products.unshift(newProduct);
  res.status(201).json({ success: true, data: newProduct });
});

// 3. Locations API
app.get('/api/locations', (req: Request, res: Response) => {
  res.json({ success: true, data: LOCATIONS });
});

// 4. Orders API
app.get('/api/orders', (req: Request, res: Response) => {
  res.json({ success: true, count: orders.length, data: orders });
});

app.get('/api/orders/:trackingNumber', (req: Request, res: Response) => {
  const trackingNumber = req.params.trackingNumber.toUpperCase();
  const order = orders.find((o) => o.trackingNumber.toUpperCase() === trackingNumber);
  if (!order) {
    return res.status(404).json({ success: false, error: 'Order not found with tracking number: ' + trackingNumber });
  }
  res.json({ success: true, data: order });
});

app.post('/api/orders', (req: Request, res: Response) => {
  const {
    items,
    recipientName,
    phone,
    destinationId,
    streetAddress,
    landmark,
    paymentMethod,
  } = req.body;

  if (!items || !items.length) {
    return res.status(400).json({ success: false, error: 'Order items cannot be empty' });
  }

  const destination = LOCATIONS.find((l) => l.id === destinationId) || LOCATIONS[0];

  const subtotal = items.reduce(
    (sum: number, item: any) => sum + (item.product?.priceSLE || 0) * (item.quantity || 1),
    0
  );
  const deliveryFee = destination.deliveryFeeSLE;
  const totalAmount = subtotal + deliveryFee;

  const trackingNumber = `ABU-SL-${Math.floor(10000 + Math.random() * 90000)}`;

  const newOrder = {
    id: `ord-${Date.now()}`,
    trackingNumber,
    items,
    subtotalSLE: subtotal,
    deliveryFeeSLE: deliveryFee,
    totalSLE: totalAmount,
    recipientName: recipientName || 'Sierra Leone Customer',
    phone: phone || '076 000 000',
    destination,
    streetAddress: streetAddress || 'Central',
    landmark: landmark || '',
    paymentMethod: paymentMethod || 'cash',
    paymentStatus: paymentMethod === 'cash' ? 'pending_delivery_inspection' : 'authorized',
    orderStatus: 'placed',
    placedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    estimatedDelivery: destination.transitTime,
  };

  orders.unshift(newOrder);

  // Update stock counts
  items.forEach((item: any) => {
    const prod = products.find((p) => p.id === item.product?.id);
    if (prod) {
      prod.stockCount = Math.max(0, prod.stockCount - (item.quantity || 1));
      prod.soldCount += item.quantity || 1;
    }
  });

  res.status(201).json({ success: true, data: newOrder });
});

// 5. Mobile Money USSD Gateway Simulation
app.post('/api/payments/ussd-push', (req: Request, res: Response) => {
  const { phone, amountSLE, provider } = req.body;

  if (!phone || !amountSLE) {
    return res.status(400).json({ success: false, error: 'Phone number and amount are required' });
  }

  const ussdCode = provider === 'afrimoney' ? '*161#' : '*144#';
  const providerName = provider === 'afrimoney' ? 'Afrimoney (Africell)' : 'Orange Money';

  res.json({
    success: true,
    transactionId: `TXN-SL-${Date.now().toString().slice(-6)}`,
    ussdCode,
    provider: providerName,
    amountSLE,
    message: `USSD push prompt sent to +232 ${phone}. Dial ${ussdCode} or authorize popup on device.`,
    status: 'prompt_dispatched',
    expiresInSeconds: 60,
  });
});

// 6. Vendor Stores API
app.get('/api/stores', (req: Request, res: Response) => {
  res.json({ success: true, count: stores.length, data: stores });
});

app.get('/api/stores/:idOrSlug', (req: Request, res: Response) => {
  const target = req.params.idOrSlug.toLowerCase();
  const store = stores.find((s) => s.id.toLowerCase() === target || s.slug.toLowerCase() === target);
  if (!store) {
    return res.status(404).json({ success: false, error: 'Store not found' });
  }
  const storeProducts = products.filter(
    (p) => p.storeId === store.id || p.sellerName.toLowerCase().includes(store.name.toLowerCase().slice(0, 8))
  );
  res.json({ success: true, data: { store, products: storeProducts } });
});

app.post('/api/stores', (req: Request, res: Response) => {
  const { name, tagline, description, locationHub, streetAddress, phone, payoutProvider, payoutPhone } = req.body;

  if (!name || !phone) {
    return res.status(400).json({ success: false, error: 'Store name and phone are required' });
  }

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const newStore: VendorStore = {
    id: `store-${Date.now()}`,
    name: name.trim(),
    slug,
    tagline: tagline || 'Verified Sierra Leone Merchant Store',
    description: description || 'Authorized storefront on Abu Marketplace.',
    locationHub: locationHub || 'Freetown Central',
    province: req.body.province || 'Western Area',
    streetAddress: streetAddress || 'Freetown',
    phone: phone.trim(),
    payoutProvider: payoutProvider || 'orange',
    payoutPhone: payoutPhone || phone,
    isVerified: true,
    rating: 5.0,
    reviewsCount: 1,
    totalSales: 0,
    establishedYear: new Date().getFullYear(),
    logo: req.body.logo || '/src/assets/images/flagship_smartphone_device_1791485459581.jpg',
    productCount: 0,
  };

  stores.unshift(newStore);
  res.status(201).json({ success: true, data: newStore });
});

// 7. Blue-Collar Services API
app.get('/api/services', (req: Request, res: Response) => {
  const { tradeCategory, location } = req.query;
  let result = [...services];

  if (tradeCategory && tradeCategory !== 'All') {
    result = result.filter((s) => s.tradeCategory === tradeCategory);
  }

  if (location && typeof location === 'string') {
    const locLower = location.toLowerCase();
    result = result.filter(
      (s) =>
        s.locationHub.toLowerCase().includes(locLower) ||
        s.coverageAreas.some((a) => a.toLowerCase().includes(locLower))
    );
  }

  res.json({ success: true, count: result.length, data: result });
});

app.post('/api/services', (req: Request, res: Response) => {
  const {
    title,
    tradeCategory,
    providerName,
    phone,
    experienceYears,
    locationHub,
    calloutFeeSLE,
    description,
    skills,
    certification,
  } = req.body;

  if (!title || !providerName || !phone || !tradeCategory) {
    return res.status(400).json({ success: false, error: 'Title, provider name, phone and trade category are required' });
  }

  const newService: BlueCollarService = {
    id: `srv-${Date.now()}`,
    title: title.trim(),
    tradeCategory,
    providerName: providerName.trim(),
    phone: phone.trim(),
    whatsapp: phone.trim(),
    payoutProvider: req.body.payoutProvider || 'orange',
    experienceYears: Number(experienceYears) || 3,
    locationHub: locationHub || 'Freetown CBD',
    province: req.body.province || 'Western Area',
    coverageAreas: req.body.coverageAreas || ['Freetown Central', locationHub || 'Western Area'],
    calloutFeeSLE: Number(calloutFeeSLE) || 80,
    pricingModel: 'flat_callout',
    rating: 5.0,
    completedJobs: 0,
    isAvailableNow: true,
    avatar: req.body.avatar || '/src/assets/images/solar_inverter_power_station_1791485447453.jpg',
    description: description || 'Professional trade technician available across Sierra Leone.',
    skills: skills || ['On-site inspection & diagnostic', 'Standard trade equipment supplied'],
    certification: certification || 'Verified Guild Trade Artisan SL',
  };

  services.unshift(newService);
  res.status(201).json({ success: true, data: newService });
});

app.post('/api/services/book', (req: Request, res: Response) => {
  const { serviceId, customerName, customerPhone, location, preferredTime, issueDescription, paymentMethod } = req.body;

  const targetService = services.find((s) => s.id === serviceId);
  if (!targetService) {
    return res.status(404).json({ success: false, error: 'Service provider not found' });
  }

  const booking: ServiceBooking = {
    id: `bk-${Date.now()}`,
    serviceId: targetService.id,
    serviceTitle: targetService.title,
    providerName: targetService.providerName,
    providerPhone: targetService.phone,
    customerName: customerName || 'Sierra Leone Client',
    customerPhone: customerPhone || '076 000 000',
    location: location || 'Freetown',
    preferredTime: preferredTime || 'Within 2 hours',
    issueDescription: issueDescription || 'General diagnostic and repair requested',
    calloutFeeSLE: targetService.calloutFeeSLE,
    paymentMethod: paymentMethod || 'orange',
    status: 'accepted',
    createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };

  bookings.unshift(booking);
  res.status(201).json({
    success: true,
    data: booking,
    message: `Callout request dispatched! ${targetService.providerName} will call +232 ${customerPhone} to confirm arrival.`,
  });
});

// ----------------------------------------------------
// Chatbot Q&A Assistant API
// ----------------------------------------------------
app.post('/api/chat', async (req: Request, res: Response) => {
  const { message, history } = req.body;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ success: false, error: 'A valid message string is required.' });
  }

  const normalizedQuery = message.toLowerCase().trim();

  // Try calling Google Gemini API if API key is present
  if (process.env.GEMINI_API_KEY) {
    try {
      const ai = new GoogleGenAI();
      const systemInstruction = `You are Abu Marketplace Assistant, a helpful, quick, and polite customer support AI for Abu Marketplace, the premier digital commerce platform in Sierra Leone.
CRITICAL MANDATORY POLICY ON PAYMENTS:
- ABSOLUTELY NO MOBILE MONEY WILL BE USED INITIALLY.
- Neither Orange Money nor Afrimoney (nor any USSD mobile money transfer) is supported or accepted at this initial stage.
- Payments are STRICTLY Cash on Delivery (COD) / Pay on Delivery. Buyers physically inspect their goods upon arrival/pickup and pay in cash.
- Whenever anyone asks about payment methods, paying, Orange Money, Afrimoney, or mobile money, you MUST explicitly, clearly, and immediately inform them that mobile money is NOT being used initially, and orders are fulfilled via Pay on Delivery / Cash on Delivery after inspecting the items.
Other key context:
- Prices are in Sierra Leonean Leones (SLE).
- Delivery regions: Freetown (Western Area: Central, Lumley/Aberdeen, Kissy/Wellington, Waterloo with same-day/next-day transit) and provincial express hubs in Bo City, Makeni, Kenema, and Kono (24-48 hours).
- Vendors & Service Providers: Anyone can click "Create Store" in the header to open an official storefront, list an individual product, or register a blue-collar artisan trade.
- Order Tracking: Orders can be tracked live in the app with their tracking code (e.g., ABU-SL-84920).
- Return Policy: 7-day buyer protection and inspection warranty on all verified electronics and products.
Keep answers concise, direct, courteous, and specifically relevant to shopping and selling in Sierra Leone (max 2-3 short paragraphs or bullet points).`;

      const prompt = `User question: "${message}"`;
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.7,
        },
      });

      const replyText = response.text || '';
      if (replyText.trim()) {
        // Detect possible suggested actions from content
        let action: { type: string; label: string; payload?: string } | undefined;
        if (normalizedQuery.includes('store') || normalizedQuery.includes('sell') || normalizedQuery.includes('vendor')) {
          action = { type: 'open_merchant', label: 'Open Store Registration' };
        } else if (normalizedQuery.includes('track') || normalizedQuery.includes('order')) {
          action = { type: 'open_tracking', label: 'Track Order' };
        } else if (normalizedQuery.includes('deliver') || normalizedQuery.includes('city') || normalizedQuery.includes('location')) {
          action = { type: 'open_location', label: 'Select Delivery Hub' };
        } else if (normalizedQuery.includes('solar') || normalizedQuery.includes('power')) {
          action = { type: 'filter_category', payload: 'Solar & Power', label: 'View Solar Products' };
        } else if (normalizedQuery.includes('phone') || normalizedQuery.includes('tablet')) {
          action = { type: 'filter_category', payload: 'Phones & Tablets', label: 'View Phones & Tech' };
        }

        return res.json({
          success: true,
          reply: replyText.trim(),
          action,
        });
      }
    } catch (err: any) {
      console.warn('Gemini chat API error, falling back to local Sierra Leone Q&A engine:', err?.message || err);
      // Fallback seamlessly to deterministic domain engine below
    }
  }

  // Deterministic, instant Sierra Leone eCommerce Q&A engine
  let reply = '';
  let action: { type: string; label: string; payload?: string } | undefined;

  if (
    normalizedQuery.includes('orange') || 
    normalizedQuery.includes('afri') || 
    normalizedQuery.includes('pay') || 
    normalizedQuery.includes('money') ||
    normalizedQuery.includes('cash') ||
    normalizedQuery.includes('cod') ||
    normalizedQuery.includes('payment')
  ) {
    reply = "Important Notice: No mobile money (Orange Money or Afrimoney) will be used initially. At this initial launch phase, all payments are strictly Cash on Delivery / Pay on Delivery upon physical inspection of your items. No mobile money transfers or USSD payments are accepted at this time.";
    action = { type: 'view_cart', label: 'View Cart & Checkout' };
  } else if (normalizedQuery.includes('deliver') || normalizedQuery.includes('ship') || normalizedQuery.includes('transit') || normalizedQuery.includes('fee')) {
    reply = "We offer same-day delivery (2–4 hours) across Western Area (Freetown CBD, Aberdeen, Lumley, Kissy) starting from SLE 15, and 24–48 hour fulfillment to our provincial distribution centers in Bo City, Makeni, Kenema, and Kono.";
    action = { type: 'open_location', label: 'Check Delivery Hubs' };
  } else if (normalizedQuery.includes('store') || normalizedQuery.includes('vendor') || normalizedQuery.includes('sell') || normalizedQuery.includes('merchant')) {
    reply = "Opening your store on Abu Marketplace is simple! Click the 'Create Store' button in the top navigation. You can set up a full storefront, list an individual product, or register as a certified trade artisan to manage your listings and fulfill orders.";
    action = { type: 'open_merchant', label: 'Create Store Now' };
  } else if (normalizedQuery.includes('track') || normalizedQuery.includes('order') || normalizedQuery.includes('status')) {
    reply = "You can track any order live! Click 'Track Order' in the footer or enter your tracking ID (e.g. ABU-SL-84920) to inspect real-time progress from merchant packaging to regional dispatch and out-for-delivery.";
    action = { type: 'open_tracking', label: 'Track Order Now' };
  } else if (normalizedQuery.includes('solar') || normalizedQuery.includes('generator') || normalizedQuery.includes('power') || normalizedQuery.includes('inverter')) {
    reply = "We stock verified high-efficiency portable power stations, pure sine wave inverters, and monocrystalline solar PV panels with local warranties from verified Freetown and Bo importers.";
    action = { type: 'filter_category', payload: 'Solar & Power', label: 'Browse Solar & Power' };
  } else if (normalizedQuery.includes('phone') || normalizedQuery.includes('samsung') || normalizedQuery.includes('iphone') || normalizedQuery.includes('tech')) {
    reply = "Browse our catalog for verified smartphones, tablets, and smart audio accessories. All mobile devices come with IMEI verification and local warranty coverage.";
    action = { type: 'filter_category', payload: 'Phones & Tablets', label: 'Browse Phones & Tech' };
  } else if (normalizedQuery.includes('return') || normalizedQuery.includes('refund') || normalizedQuery.includes('warranty') || normalizedQuery.includes('guarantee')) {
    reply = "All purchases are backed by Abu Marketplace's 7-Day Buyer Protection guarantee. If an item arrives damaged or does not match its description, you inspect it upon delivery before paying in cash, or request an exchange.";
  } else if (normalizedQuery.includes('service') || normalizedQuery.includes('artisan') || normalizedQuery.includes('technician') || normalizedQuery.includes('electrician') || normalizedQuery.includes('plumber')) {
    reply = "Need skilled technical help? You can book certified trade artisans (certified solar installers, master electricians, plumbers, and refrigeration techs) with transparent callout fees and direct phone dispatch.";
    action = { type: 'open_merchant', label: 'Offer Trade Services' };
  } else {
    reply = "Welcome to Abu Marketplace! I can help you with payment policies (Cash on Delivery only — no mobile money used initially), delivery times across Sierra Leone, tracking your orders, or creating your own vendor store. How can I assist you today?";
  }

  res.json({
    success: true,
    reply,
    action,
  });
});

// ----------------------------------------------------
// Production Static Serving or Dev Mode
// ----------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Abu Marketplace server running on http://0.0.0.0:${PORT}`);
  });
}

export default app;

if (!process.env.VERCEL) {
  startServer();
}
