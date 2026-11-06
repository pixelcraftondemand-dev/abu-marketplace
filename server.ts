import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { Product, VendorStore, BlueCollarService, ServiceBooking } from './src/types/index.ts';
import { INITIAL_PRODUCTS, INITIAL_STORES, INITIAL_SERVICES } from './src/data/mockData.ts';

import { supabaseAdmin, getSessionUser } from './server/supabase.ts';
import {
  approveSubmission,
  approvedStores,
  createSubmission,
  isAdmin,
  listSubmissions,
  rejectSubmission,
  SubmissionError,
  type SubmissionStatus,
} from './server/storeSubmissions.ts';
import { recentMail } from './server/mailer.ts';
import {
  applySecurity,
  rateLimit,
  sanitizeText,
  sanitizeLongText,
  sanitizePhone,
  sanitizeImageAsset,
  sanitizeNumber,
  pickAllowed,
} from './server/security.ts';

/** Resolves the signed-in caller, or null. Used to gate submissions and the admin queue. */
async function currentActor(req: Request) {
  const user: any = await getSessionUser(req);
  if (!user) return null;
  return { id: user.id, email: user.email, name: user.name, role: user.role };
}

function submissionErrorResponse(res: Response, err: unknown) {
  if (err instanceof SubmissionError) {
    return res.status(err.status).json({ success: false, error: err.message, code: err.code });
  }
  console.error('[stores] unexpected submission error:', err);
  return res.status(500).json({ success: false, error: 'Something went wrong. Please try again.' });
}


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Security headers (CSP, HSTS, permissions), CSRF-style origin checks,
// proxy trust and HTTPS enforcement live in server/security.ts
applySecurity(app);

// In-Memory Rate Limiter for Authentication & OTP Endpoints
// Bodies are small JSON documents; huge uploads are rejected early.
app.use(express.json({ limit: '100kb' }));

// Serve public static assets with high-performance browser caching
const STATIC_CACHE_OPTIONS = { maxAge: '7d', etag: true };
app.use('/products', express.static(path.resolve(__dirname, 'public', 'products'), STATIC_CACHE_OPTIONS));
app.use('/images', express.static(path.resolve(__dirname, 'public', 'images'), STATIC_CACHE_OPTIONS));
app.use('/src/assets/images', express.static(path.resolve(__dirname, 'public', 'products'), STATIC_CACHE_OPTIONS));

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
    recipientName: 'Verified Customer',
    phone: '232-XXXXXXXX',
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
    // Deliberately minimal: infrastructure details stay internal
    status: 'healthy',
    currency: 'SLE',
    timestamp: new Date().toISOString(),
  });
});

// ----------------------------------------------------
// SUPABASE AUTH ENDPOINTS
// Sign-in, sign-up, OTP and Google all happen in the browser through Supabase.
// The server only verifies the Bearer token and manages profile fields.
// ----------------------------------------------------

// Roles a user may choose for themselves. admin and logistics_agent are set manually in Supabase.
const SELF_SERVICE_ROLES = ['buyer', 'merchant', 'artisan'];

// Current authenticated session
app.get('/api/custom-auth/me', async (req: Request, res: Response) => {
  try {
    const user = await getSessionUser(req);
    if (!user) return res.json({ success: false, user: null });
    res.json({ success: true, user });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update profile
app.post('/api/custom-auth/update-profile', async (req: Request, res: Response) => {
  if (!rateLimit(req, res, 'profile', 10, 60 * 1000)) return;
  try {
    const current = await getSessionUser(req);
    if (!current) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { name, role, preferredCity } = req.body || {};
    const updates: Record<string, any> = {};

    if (typeof name === 'string' && name.trim()) updates.name = name.trim().slice(0, 100);
    if (typeof preferredCity === 'string' && preferredCity.trim()) {
      updates.preferred_city = preferredCity.trim().slice(0, 100);
    }
    // Privileged accounts keep their role; everyone else may pick a self-service role only
    const isPrivileged = current.role === 'admin' || current.role === 'logistics_agent';
    if (!isPrivileged && typeof role === 'string' && SELF_SERVICE_ROLES.includes(role)) {
      updates.role = role;
    }

    if (Object.keys(updates).length > 0) {
      const { error } = await supabaseAdmin.from('profiles').update(updates).eq('id', current.id);
      if (error) throw error;
    }

    const user = await getSessionUser(req);
    res.json({ success: true, user });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
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
app.post('/api/products', async (req: Request, res: Response) => {
  if (!rateLimit(req, res, 'products-write', 30, 10 * 60 * 1000)) return;
  const actor = await currentActor(req);
  if (!actor) {
    return res.status(401).json({ success: false, error: 'Please sign in to list a product' });
  }
  const { title, category, priceSLE, stockCount, description, sellerName, sellerLocation } = req.body;

  const cleanTitle = sanitizeText(title, 200);
  const price = sanitizeNumber(priceSLE, 0);
  if (!cleanTitle || !price) {
    return res.status(400).json({ success: false, error: 'Title and a valid price are required' });
  }

  const newProduct: Product = {
    id: `prod-merchant-${Date.now()}`,
    title: cleanTitle,
    category: (sanitizeText(category, 80) || 'Solar & Power') as Product['category'],
    priceSLE: price,
    originalPriceSLE: Math.round(price * 1.25),
    discountPercent: 20,
    rating: 5.0,
    reviewCount: 1,
    soldCount: 0,
    stockCount: sanitizeNumber(stockCount, 5, 100000),
    image: sanitizeImageAsset(req.body.image, '/src/assets/images/solar_pv_panel_monocrystalline_1791485557806.jpg'),
    sellerName: sanitizeText(sellerName, 120) || 'Verified Sierra Leone Merchant',
    sellerLocation: sellerLocation || 'Freetown Verified',
    isVerifiedSeller: true,
    sellerRating: 5.0,
    isFlashDeal: false,
    description: sanitizeLongText(description, 2000) || 'Authentic merchandise listed via Abu Merchant Hub.',
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

// ----------------------------------------------------
// CMS & CATALOG MANAGEMENT ENDPOINTS
// ----------------------------------------------------

// Update an existing product
app.put('/api/products/:id', async (req: Request, res: Response) => {
  if (!rateLimit(req, res, 'products-write', 30, 10 * 60 * 1000)) return;
  const actor = await currentActor(req);
  if (!actor) {
    return res.status(401).json({ success: false, error: 'Please sign in to update a product' });
  }

  const index = products.findIndex((p) => p.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ success: false, error: 'Product not found' });
  }

  // Allow-list the patchable fields so clients cannot tamper with internal or
  // computed ones (mass-assignment / field-tampering defence).
  const patch = pickAllowed(req.body, [
    'title', 'category', 'priceSLE', 'originalPriceSLE', 'discountPercent',
    'stockCount', 'image', 'description', 'isFlashDeal', 'specifications',
    'features', 'sellerName', 'sellerLocation',
  ]);
  const updated: Product = {
    ...products[index],
    ...patch,
    id: req.params.id,
    title: sanitizeText(patch.title, 200) || products[index].title,
    priceSLE: sanitizeNumber(patch.priceSLE, 0) || products[index].priceSLE,
    stockCount: sanitizeNumber(patch.stockCount ?? products[index].stockCount, products[index].stockCount, 100000),
    image: sanitizeImageAsset(patch.image, products[index].image),
    description: sanitizeLongText(patch.description, 2000) || products[index].description,
  };
  products[index] = updated;
  res.json({ success: true, data: updated });
});

// Delete a product
app.delete('/api/products/:id', async (req: Request, res: Response) => {
  const actor = await currentActor(req);
  if (!isAdmin(actor)) {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }
  const index = products.findIndex((p) => p.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ success: false, error: 'Product not found' });
  }

  const [deleted] = products.splice(index, 1);
  res.json({ success: true, data: deleted, message: 'Product removed from catalog' });
});

// Duplicate a product
app.post('/api/products/:id/duplicate', async (req: Request, res: Response) => {
  const actor = await currentActor(req);
  if (!actor) {
    return res.status(401).json({ success: false, error: 'Please sign in first' });
  }
  const source = products.find((p) => p.id === req.params.id);
  if (!source) {
    return res.status(404).json({ success: false, error: 'Source product not found' });
  }

  const duplicated: Product = {
    ...source,
    id: `prod-copy-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    title: `${source.title} (Copy)`,
    soldCount: 0,
    reviewCount: 0,
    rating: 5.0,
  };

  products.unshift(duplicated);
  res.status(201).json({ success: true, data: duplicated });
});

// CMS Factory Reset: Reverts catalog to initial 105 verified products
app.post('/api/cms/reset', async (req: Request, res: Response) => {
  if (!rateLimit(req, res, 'cms', 10, 10 * 60 * 1000)) return;
  const actor = await currentActor(req);
  if (!isAdmin(actor)) {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }
  products = [...INITIAL_PRODUCTS];
  res.json({ success: true, count: products.length, message: 'Catalog reset to standard verified inventory' });
});

// CMS Media Assets: List verified local product assets
app.get('/api/cms/media', async (req: Request, res: Response) => {
  const actor = await currentActor(req);
  if (!isAdmin(actor)) {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }
  try {
    const productsDir = path.resolve(__dirname, 'public', 'products');
    if (!fs.existsSync(productsDir)) {
      return res.json({ success: true, files: [] });
    }

    const files = fs.readdirSync(productsDir)
      .filter((f) => f.endsWith('.webp') || f.endsWith('.jpg') || f.endsWith('.png'))
      .map((fileName) => {
        const url = `/products/${fileName}`;
        const matched = products.find((p) => p.image === url || p.image.endsWith(fileName));
        return {
          fileName,
          url,
          usedBy: matched ? { id: matched.id, title: matched.title, category: matched.category } : null,
        };
      });

    res.json({ success: true, count: files.length, data: files });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Locations API
app.get('/api/locations', (req: Request, res: Response) => {
  res.json({ success: true, data: LOCATIONS });
});

// 4. Orders API (Secured with Row-Level Security via Better Auth)
app.get('/api/orders', async (req: Request, res: Response) => {
  // Extract Better Auth session context if available
  const authUser: any = await getSessionUser(req);

  // Extract caller security context from session or fallback headers/query
  // Role comes only from the verified session, never from a request header
  const callerRole = authUser?.role || 'buyer';
  // Identity comes exclusively from the verified session - request-supplied
  // identity headers/query params would let anyone read other users' orders.
  const callerPhone = authUser?.phoneNumber || null;
  const callerUserId = authUser?.id || null;

  // Row-Level Security (RLS) enforcement
  if (callerRole === 'admin' || callerRole === 'logistics_agent') {
    return res.json({ success: true, count: orders.length, data: orders, rlsEnforced: true, scope: 'admin' });
  }

  // Filter orders where caller is the verified buyer
  const sanitizedOrders = orders.filter((o) => {
    if (callerUserId && o.buyerId === callerUserId) return true;
    if (callerPhone) {
      const clean1 = String(callerPhone).replace(/\D/g, '');
      const clean2 = String(o.phone || '').replace(/\D/g, '');
      if (clean1 && clean2 && (clean1.endsWith(clean2) || clean2.endsWith(clean1))) {
        return true;
      }
    }
    return false;
  });

  res.json({ 
    success: true, 
    count: sanitizedOrders.length, 
    data: sanitizedOrders,
    rlsEnforced: true,
    scope: 'user_restricted',
  });
});

app.get('/api/orders/:trackingNumber', (req: Request, res: Response) => {
  const trackingNumber = req.params.trackingNumber.toUpperCase();
  const order = orders.find((o) => o.trackingNumber.toUpperCase() === trackingNumber);
  if (!order) {
    return res.status(404).json({ success: false, error: 'Order not found with tracking number: ' + trackingNumber });
  }

  // Public order tracking view returns sanitized data conforming to privacy policy
  res.json({ 
    success: true, 
    data: {
      trackingNumber: order.trackingNumber,
      orderStatus: order.orderStatus,
      placedAt: order.placedAt,
      estimatedDelivery: order.estimatedDelivery,
      destination: {
        name: order.destination?.name || 'Sierra Leone Hub',
        hubName: order.destination?.hubName || 'Provincial Logistics Hub'
      },
      itemCount: order.items?.length || 1,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod
    },
    rlsEnforced: true
  });
});

app.post('/api/orders', async (req: Request, res: Response) => {
  if (!rateLimit(req, res, 'order-post', 20, 10 * 60 * 1000)) return;
  const body = pickAllowed(req.body, [
    'items', 'recipientName', 'phone', 'destinationId',
    'streetAddress', 'landmark', 'paymentMethod',
  ]);
  const items: any[] = Array.isArray(body.items) ? body.items : [];

  if (!items.length) {
    return res.status(400).json({ success: false, error: 'Order items cannot be empty' });
  }
  if (items.length > 50) {
    return res.status(400).json({ success: false, error: 'Too many items in one order' });
  }

  // Price and resolve every line item on the server: client-supplied prices
  // must never be trusted when totals and stock are computed.
  const pricedItems = [];
  for (const item of items) {
    const prod = products.find((p) => p.id === item?.product?.id);
    if (!prod || !prod.priceSLE) {
      return res.status(400).json({ success: false, error: 'One of the cart items is unavailable' });
    }
    const quantity = sanitizeNumber(item.quantity, 1, 99) || 1;
    pricedItems.push({ product: prod, quantity });
  }

  const destination = LOCATIONS.find((l) => l.id === body.destinationId) || LOCATIONS[0];
  const subtotal = pricedItems.reduce(
    (sum: number, item: any) => sum + item.product.priceSLE * item.quantity,
    0
  );
  const deliveryFee = destination.deliveryFeeSLE;
  const totalAmount = subtotal + deliveryFee;
  const trackingNumber = `ABU-SL-${Math.floor(10000 + Math.random() * 90000)}`;

  const sessionUser: any = await getSessionUser(req);
  const buyerId = sessionUser?.id || undefined;
  const paymentMethod = ['cash', 'orange', 'afrimoney'].includes(body.paymentMethod)
    ? body.paymentMethod
    : 'cash';

  const newOrder = {
    id: `ord-${Date.now()}`,
    buyerId,
    trackingNumber,
    items: pricedItems,
    subtotalSLE: subtotal,
    deliveryFeeSLE: deliveryFee,
    totalSLE: totalAmount,
    recipientName: sanitizeText(body.recipientName, 120) || 'Sierra Leone Customer',
    phone: sanitizePhone(body.phone) || '076 000 000',
    destination,
    streetAddress: sanitizeLongText(body.streetAddress, 200) || 'Central',
    landmark: sanitizeText(body.landmark, 120),
    paymentMethod,
    paymentStatus: paymentMethod === 'cash' ? 'pending_delivery_inspection' : 'authorized',
    orderStatus: 'placed',
    placedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    estimatedDelivery: destination.transitTime,
  };

  orders.unshift(newOrder);

    // Update stock counts
    pricedItems.forEach((item: any) => {
    const prod = products.find((p) => p.id === item.product.id);
    if (prod) {
      prod.stockCount = Math.max(0, prod.stockCount - item.quantity);
      prod.soldCount += item.quantity;
    }
  });

  res.status(201).json({ success: true, data: newOrder });
});

// 5. Mobile Money USSD Gateway Simulation
app.post('/api/payments/ussd-push', async (req: Request, res: Response) => {
  if (!rateLimit(req, res, 'ussd', 5, 10 * 60 * 1000)) return;
  const phone = sanitizePhone(req.body?.phone);
  const amountSLE = sanitizeNumber(req.body?.amountSLE, 0);
  const provider = ['afrimoney', 'orange'].includes(req.body?.provider)
    ? req.body.provider
    : 'orange';

  if (!phone || !amountSLE) {
    return res.status(400).json({ success: false, error: 'A valid phone number and amount are required' });
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
// Live stores = seeded directory plus every admin-approved submission.
async function allStores(): Promise<VendorStore[]> {
  const approved = await approvedStores();
  return [...approved, ...stores];
}

app.get('/api/stores', async (req: Request, res: Response) => {
  try {
    const list = await allStores();
    res.json({ success: true, count: list.length, data: list });
  } catch (err) {
    console.error('[stores] list failed:', err);
    res.json({ success: true, count: stores.length, data: stores });
  }
});

app.get('/api/stores/:idOrSlug', async (req: Request, res: Response) => {
  const target = req.params.idOrSlug.toLowerCase();
  const list = await allStores();
  const store = list.find((s) => s.id.toLowerCase() === target || s.slug.toLowerCase() === target);
  if (!store) {
    return res.status(404).json({ success: false, error: 'Store not found' });
  }
  const storeProducts = products.filter(
    (p) => p.storeId === store.id || p.sellerName.toLowerCase().includes(store.name.toLowerCase().slice(0, 8))
  );
  res.json({ success: true, data: { store, products: storeProducts } });
});

app.post('/api/stores', async (req: Request, res: Response) => {
  if (!rateLimit(req, res, 'stores-write', 10, 10 * 60 * 1000)) return;
  const actor = await currentActor(req);
  if (!actor) {
    return res.status(401).json({ success: false, error: 'Please sign in to open a store' });
  }
  const body = pickAllowed(req.body, [
    'name', 'tagline', 'description', 'locationHub', 'province',
    'streetAddress', 'phone', 'payoutProvider', 'payoutPhone', 'logo',
  ]);
  const { name, tagline, description, locationHub, streetAddress, phone, payoutProvider, payoutPhone } = body;
  // (fields are spread from the sanitized pickAllowed set above)

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

// ----------------------------------------------------
// STORE SUBMISSIONS (merchant applies, admin approves)
// ----------------------------------------------------

// Merchant: submit a store for review. Nothing goes live until an admin approves.
app.post('/api/stores/submissions', async (req: Request, res: Response) => {
  try {
    const actor = await currentActor(req);
    if (!actor) {
      return res.status(401).json({ success: false, error: 'Please sign in to apply for a store' });
    }
    if (!rateLimit(req, res, 'submissions', 8, 10 * 60 * 1000)) return;
    const { submission, mail } = await createSubmission(req.body || {}, actor);
    res.status(201).json({
      success: true,
      message: 'Application received. Our team will review it and email you a decision.',
      data: submission,
      emailStatus: mail.status,
    });
  } catch (err) {
    submissionErrorResponse(res, err);
  }
});

// Merchant: the signed-in user's own applications, so the UI can show status.
app.get('/api/stores/submissions/mine', async (req: Request, res: Response) => {
  try {
    const actor = await currentActor(req);
    if (!actor) return res.status(401).json({ success: false, error: 'Please sign in' });
    const all = await listSubmissions();
    const mine = all.filter((row) => row.owner_id === actor.id || row.owner_email === actor.email);
    res.json({ success: true, count: mine.length, data: mine });
  } catch (err) {
    submissionErrorResponse(res, err);
  }
});

// Admin: the review queue.
app.get('/api/admin/store-submissions', async (req: Request, res: Response) => {
  try {
    const actor = await currentActor(req);
    if (!isAdmin(actor)) {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }
    const status = (req.query.status as string | undefined)?.toLowerCase();
    const allowed: SubmissionStatus[] = ['pending', 'approved', 'rejected'];
    const filter = status && allowed.includes(status as SubmissionStatus) ? (status as SubmissionStatus) : undefined;
    const data = await listSubmissions(filter);
    res.json({ success: true, count: data.length, data });
  } catch (err) {
    submissionErrorResponse(res, err);
  }
});

// Admin: approve, which publishes the store and emails the merchant.
app.post('/api/admin/store-submissions/:id/approve', async (req: Request, res: Response) => {
  try {
    const actor = await currentActor(req);
    if (!isAdmin(actor)) {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }
    const { submission, mail } = await approveSubmission(req.params.id, actor!, req.body?.note);
    res.json({ success: true, message: 'Store approved and published', data: submission, emailStatus: mail.status });
  } catch (err) {
    submissionErrorResponse(res, err);
  }
});

// Admin: reject with a required reason, which is emailed to the merchant.
app.post('/api/admin/store-submissions/:id/reject', async (req: Request, res: Response) => {
  try {
    const actor = await currentActor(req);
    if (!isAdmin(actor)) {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }
    const { submission, mail } = await rejectSubmission(req.params.id, actor!, req.body?.reason || req.body?.note);
    res.json({ success: true, message: 'Application rejected and merchant notified', data: submission, emailStatus: mail.status });
  } catch (err) {
    submissionErrorResponse(res, err);
  }
});

// Admin: recent outbound mail, so the notification flow is inspectable in dev.
app.get('/api/admin/mail', async (req: Request, res: Response) => {
  const actor = await currentActor(req);
  if (!isAdmin(actor)) {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }
  res.json({ success: true, data: recentMail() });
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

app.post('/api/services', async (req: Request, res: Response) => {
  if (!rateLimit(req, res, 'services-write', 15, 10 * 60 * 1000)) return;
  const actor = await currentActor(req);
  if (!actor) {
    return res.status(401).json({ success: false, error: 'Please sign in to register a service' });
  }
  const {
    title, tradeCategory, providerName, phone, experienceYears, locationHub,
    calloutFeeSLE, description, skills, certification,
  } = pickAllowed(req.body, [
    'title', 'tradeCategory', 'providerName', 'phone', 'experienceYears',
    'locationHub', 'calloutFeeSLE', 'description', 'skills', 'certification',
  ]);
  // (fields are spread from the sanitized pickAllowed set above)

  if (!title || !providerName || !phone || !tradeCategory) {
    return res.status(400).json({ success: false, error: 'Title, provider name, phone and trade category are required' });
  }

  const newService: BlueCollarService = {
    id: `srv-${Date.now()}`,
    title: sanitizeText(title, 200),
    tradeCategory,
    providerName: sanitizeText(providerName, 120),
    phone: phone.trim(),
    whatsapp: sanitizePhone(phone),
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
    avatar: sanitizeImageAsset(req.body.avatar, '/src/assets/images/solar_inverter_power_station_1791485447453.jpg'),
    description: sanitizeLongText(description, 2000) || 'Professional trade technician available across Sierra Leone.',
    skills: skills || ['On-site inspection & diagnostic', 'Standard trade equipment supplied'],
    certification: certification || 'Verified Guild Trade Artisan SL',
  };

  services.unshift(newService);
  res.status(201).json({ success: true, data: newService });
});

app.post('/api/services/book', async (req: Request, res: Response) => {
  if (!rateLimit(req, res, 'book', 15, 10 * 60 * 1000)) return;
  const body = pickAllowed(req.body, [
    'serviceId', 'customerName', 'customerPhone', 'location',
    'preferredTime', 'issueDescription', 'paymentMethod',
  ]);
  const { serviceId } = body;
  const customerName = sanitizeText(body.customerName, 120) || 'Sierra Leone Client';
  const customerPhone = sanitizePhone(body.customerPhone) || '076 000 000';
  const location = sanitizeText(body.location, 120) || 'Freetown';
  const preferredTime = sanitizeText(body.preferredTime, 80) || 'Within 2 hours';
  const issueDescription = sanitizeLongText(body.issueDescription, 1000) || 'General diagnostic and repair requested';
  const paymentMethod = ['cash', 'orange', 'afrimoney'].includes(body.paymentMethod) ? body.paymentMethod : 'orange';

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
    message: `Consultation request dispatched! ${targetService.providerName} will call +232 ${customerPhone} to confirm arrival.`,
  });
});

// ----------------------------------------------------
// Chatbot Q&A Assistant API
// ----------------------------------------------------
app.post('/api/chat', async (req: Request, res: Response) => {
  if (!rateLimit(req, res, 'chat', 15, 10 * 60 * 1000)) return;
  // Budget protection: Gemini calls cost real money, so cap per IP.
  const message = sanitizeLongText(req.body?.message, 4000);
  const history = req.body?.history;

  if (!message) {
    return res.status(400).json({ success: false, error: 'A valid message string is required.' });
  }

  const normalizedQuery = message.toLowerCase().trim();

  // Try calling Google Gemini API if API key is present
  if (process.env.GEMINI_API_KEY) {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const systemInstruction = `You are Abu Marketplace Assistant, an intelligent, versatile, highly capable, and articulate AI advisor for Abu Marketplace (https://abumarketplace.shop), Sierra Leone's premier e-commerce platform.

CORE INSTRUCTIONS & BEHAVIOR:
1. Answer ANY question the user asks thoroughly, professionally, and directly! You are not restricted to basic shopping questions—you have full knowledge of e-commerce, web & mobile UX design, software architecture, login/authentication workflows, store management, Sierra Leone commerce, and general technical inquiries.
2. NEVER give evasive, repetitive, or generic canned responses. If the user asks about improving login or sign-in/signing pages, give concrete, actionable UI/UX and security suggestions (e.g. phone/WhatsApp OTP, clear form labels, password toggles, social login, auto-focus, responsive mobile touch targets, session persistence).
3. PAYMENT POLICY RULE: Abu Marketplace currently uses Cash on Delivery / Pay on Delivery upon physical inspection of goods. Mention payment methods or the Pay on Delivery policy ONLY IF the user explicitly asks about payments, money, or checkout. NEVER inject payment or mobile money disclaimers into unrelated questions.
4. Format responses cleanly with bold headings or numbered bullet points where appropriate so they are easy to scan on mobile or desktop screens.`;

      // Build conversation turns if history exists
      const contents: any[] = [];
      if (Array.isArray(history) && history.length > 0) {
        history.slice(-8).forEach((h: any) => {
          if (h.text && (h.sender === 'user' || h.sender === 'assistant')) {
            contents.push({
              role: h.sender === 'user' ? 'user' : 'model',
              parts: [{ text: String(h.text) }],
            });
          }
        });
      }
      contents.push({
        role: 'user',
        parts: [{ text: message }],
      });

      // Call Gemini Flash Lite with a 10-second timeout
      const aiCallPromise = ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents,
        config: {
          systemInstruction,
          temperature: 0.7,
        },
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('AI response timeout')), 20000)
      );

      const response = await Promise.race([aiCallPromise, timeoutPromise]);
      const replyText = response.text || '';

      if (replyText.trim()) {
        let action: { type: string; label: string; payload?: string } | undefined;
        if (normalizedQuery.includes('store') || normalizedQuery.includes('sell') || normalizedQuery.includes('vendor')) {
          action = { type: 'open_merchant', label: 'Open Merchant Hub' };
        } else if (normalizedQuery.includes('track') || normalizedQuery.includes('order')) {
          action = { type: 'open_tracking', label: 'Track Order' };
        } else if (normalizedQuery.includes('deliver') || normalizedQuery.includes('city') || normalizedQuery.includes('location')) {
          action = { type: 'open_location', label: 'Select Delivery Hub' };
        } else if (normalizedQuery.includes('solar') || normalizedQuery.includes('power')) {
          action = { type: 'filter_category', payload: 'Solar & Power', label: 'View Solar Products' };
        } else if (normalizedQuery.includes('phone') || normalizedQuery.includes('tablet')) {
          action = { type: 'filter_category', payload: 'Phones & Tablets', label: 'View Phones & Tech' };
        } else if (
          normalizedQuery.includes('login') || 
          normalizedQuery.includes('sign in') || 
          normalizedQuery.includes('signin') || 
          normalizedQuery.includes('signup') || 
          normalizedQuery.includes('sign up') || 
          normalizedQuery.includes('signing') || 
          normalizedQuery.includes('register') ||
          normalizedQuery.includes('auth')
        ) {
          action = { type: 'open_auth', label: 'Try Login / Sign-up Flow' };
        }

        return res.json({
          success: true,
          reply: replyText.trim(),
          action,
        });
      }
    } catch (err: any) {
      console.warn('Gemini chat API notice, utilizing comprehensive fallback engine:', err?.message || err);
    }
  }

  // Versatile, intelligent local response engine for broad questions
  let reply = '';
  let action: { type: string; label: string; payload?: string } | undefined;

  if (
    normalizedQuery.includes('login') || 
    normalizedQuery.includes('sign in') || 
    normalizedQuery.includes('signin') || 
    normalizedQuery.includes('signup') || 
    normalizedQuery.includes('sign up') || 
    normalizedQuery.includes('signing') || 
    normalizedQuery.includes('register') || 
    normalizedQuery.includes('auth') ||
    normalizedQuery.includes('password') ||
    normalizedQuery.includes('account')
  ) {
    reply = `Here are 5 high-impact ways to improve the login and sign-up experience on Abu Marketplace:

1. **WhatsApp & Phone OTP Authentication**: Allow buyers and sellers to sign in instantly via SMS or WhatsApp one-time codes without having to remember passwords.
2. **One-Tap Password Visibility**: Add a show/hide toggle icon in the password field to avoid typos and reduce friction on mobile screens.
3. **Streamlined Sign-up Form**: Request only essential fields (Full Name, Phone/Email, Password) during initial registration, letting users complete profile details later.
4. **Instant Social Sign-In**: Provide 1-tap Google or Apple login for users on mobile devices to bypass manual credential entry.
5. **Clear Inline Validation & Persistent Sessions**: Show clear error feedback with auto-focus on mistake fields, and use secure session cookies so returning shoppers stay signed in.`;
    action = { type: 'open_auth', label: 'Test Login Flow' };
  } else if (
    normalizedQuery.includes('design') || 
    normalizedQuery.includes('ui') || 
    normalizedQuery.includes('ux') || 
    normalizedQuery.includes('layout') ||
    normalizedQuery.includes('improve') ||
    normalizedQuery.includes('speed') ||
    normalizedQuery.includes('performance')
  ) {
    reply = `Key e-commerce UX and performance recommendations:

1. **Lightning Fast Page Loads**: Preconnect fonts and critical product hero images while lazy-loading below-the-fold catalog grids.
2. **Thumb-Friendly Mobile Touch Targets**: Ensure all buttons and touch targets are at least 44px tall for seamless one-handed browsing on smartphones.
3. **High-Contrast Dark & Light Mode**: Guarantee crisp typography and readability under bright outdoor sunlight as well as in low-light conditions.
4. **Zero Cumulative Layout Shifts**: Fix image aspect ratio containers across all product cards to prevent content jumping during page load.`;
  } else if (
    normalizedQuery.includes('orange') || 
    normalizedQuery.includes('afri') || 
    normalizedQuery.includes('pay') || 
    normalizedQuery.includes('money') ||
    normalizedQuery.includes('cash') ||
    normalizedQuery.includes('cod') ||
    normalizedQuery.includes('payment')
  ) {
    reply = "At Abu Marketplace, all orders are currently fulfilled via Pay on Delivery / Cash on Delivery. Buyers physically inspect their items upon arrival before paying in cash. Mobile money checkout (Orange Money / Afrimoney) is not active at this initial launch stage.";
    action = { type: 'view_cart', label: 'View Cart & Checkout' };
  } else if (normalizedQuery.includes('deliver') || normalizedQuery.includes('ship') || normalizedQuery.includes('transit') || normalizedQuery.includes('fee')) {
    reply = "We offer same-day delivery (2–4 hours) across Western Area (Freetown CBD, Aberdeen, Lumley, Kissy, Waterloo) starting from SLE 15, and 24–48 hour fulfillment to our provincial distribution centers in Bo City, Makeni, Kenema, and Kono.";
    action = { type: 'open_location', label: 'Check Delivery Hubs' };
  } else if (normalizedQuery.includes('store') || normalizedQuery.includes('vendor') || normalizedQuery.includes('sell') || normalizedQuery.includes('merchant')) {
    reply = "Opening your store on Abu Marketplace is simple! Click 'Sell & Provide Services' or open the Merchant Hub. You can set up a verified storefront, list products, or register as a certified trade artisan to receive customer bookings.";
    action = { type: 'open_merchant', label: 'Open Merchant Hub' };
  } else if (normalizedQuery.includes('track') || normalizedQuery.includes('order') || normalizedQuery.includes('status')) {
    reply = "You can track any order live! Enter your tracking number (e.g., ABU-SL-84920) in the Order Tracker to follow real-time progress from merchant packaging to courier dispatch and delivery.";
    action = { type: 'open_tracking', label: 'Track Order Now' };
  } else if (normalizedQuery.includes('solar') || normalizedQuery.includes('generator') || normalizedQuery.includes('power') || normalizedQuery.includes('inverter')) {
    reply = "We stock verified high-efficiency portable power stations, pure sine wave inverters, and monocrystalline solar PV panels with local warranties from verified Sierra Leone importers.";
    action = { type: 'filter_category', payload: 'Solar & Power', label: 'Browse Solar & Power' };
  } else if (normalizedQuery.includes('service') || normalizedQuery.includes('artisan') || normalizedQuery.includes('technician') || normalizedQuery.includes('electrician') || normalizedQuery.includes('plumber')) {
    reply = "Need skilled technical help? You can book certified trade artisans (certified solar installers, master electricians, plumbers, and refrigeration techs) with transparent consultation fees and direct phone dispatch.";
    action = { type: 'open_merchant', label: 'Book Consultation' };
  } else {
    reply = `Welcome to Abu Marketplace! I'm here to assist you with anything regarding our platform:

- Finding authentic products and verified vendor stores
- Guidance on e-commerce UX, page design, and account flows
- Tracking shipments across Freetown, Bo, Makeni, Kenema, and Kono
- Booking certified blue-collar artisan consultations
- Vendor tips, store registration, or technical advice

What would you like assistance with today?`;
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
    // Vite emits content-hashed filenames under /assets, so those files can be cached
    // permanently — a new build produces new names. index.html and other unhashed
    // files keep revalidation-only caching so deploys are picked up immediately.
    app.use('/assets', express.static(path.resolve(__dirname, 'dist', 'assets'), {
      immutable: true,
      maxAge: '1y',
    }));
    app.use(express.static(path.resolve(__dirname, 'dist'), { maxAge: 0 }));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Abu Marketplace server running on http://0.0.0.0:${PORT}`);
    });
  } else {
    const http = await import('http');
    const httpServer = http.createServer(app);
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === 'true'
          ? false
          : {
              server: httpServer,
              clientPort: 443,
              protocol: 'wss',
            },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);

    httpServer.listen(PORT, '0.0.0.0', () => {
      console.log(`Abu Marketplace server running on http://0.0.0.0:${PORT}`);
    });
  }
}// ----------------------------------------------------
// GLOBAL ERROR HANDLER (must be after all route definitions)
// ----------------------------------------------------
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('[unhandled error]', err);
  const status = err.status || 500;
  const message = err.message || 'Internal server error';
  // Do not leak stack traces in production
  const stack = process.env.NODE_ENV !== 'production' ? err.stack : undefined;
  return res.status(status).json({ success: false, error: message, ...(stack && { stack }) });
});

export default app;

if (!process.env.VERCEL) {
  startServer();
}

