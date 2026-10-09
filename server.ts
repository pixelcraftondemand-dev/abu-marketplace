import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { Product, VendorStore, BlueCollarService, ServiceBooking } from './src/types/index.ts';
import { INITIAL_STORES, INITIAL_SERVICES } from './src/data/mockData.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

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

// In-memory catalog seeded with verified products
let products: Product[] = [
  {
    id: 'prod-solar-2000',
    title: 'SolarVolt 2000W Pure Sine Wave Portable Power Station & UPS Generator',
    category: 'Solar & Power',
    priceSLE: 1850,
    originalPriceSLE: 2350,
    discountPercent: 21,
    rating: 4.9,
    reviewCount: 168,
    soldCount: 312,
    stockCount: 4,
    image: '/src/assets/images/solar_inverter_power_station_1791485447453.jpg',
    sellerName: 'Lumley Solar Solutions',
    sellerLocation: 'Freetown Verified',
    isVerifiedSeller: true,
    sellerRating: 4.95,
    isFlashDeal: true,
    description: 'High-efficiency 2000W / 1920Wh LiFePO4 battery system built specifically for Sierra Leone grid stability. Features dual 220V AC outputs, 100W USB-C PD, and ultra-fast MPPT solar recharge within 2.5 hours.',
    specifications: {
      'Continuous Output': '2000W (Surge 4000W)',
      'Battery Chemistry': 'LiFePO4 (3,500+ cycles to 80%)',
      'AC Voltage': '220V-240V 50Hz Standard',
      'Solar Input': 'MPPT 500W Max (12-60V)',
      'Weight': '21.5 kg with built-in handles',
      'Local Warranty': '2 Years Official Lumley Hub Warranty',
    },
    features: [
      'Zero-switchover UPS mode for desktop computers & medical fridges',
      'Pure sine wave protection for sensitive electronics',
      'Silent zero-emission operation with smart thermo cooling fans',
      'Integrated bright LED floodlight for emergency night lighting',
    ],
  },
  {
    id: 'prod-phone-nova',
    title: 'Nova Flagship 5G Smartphone 256GB / 12GB RAM Dual SIM Ultra AMOLED',
    category: 'Phones & Tablets',
    priceSLE: 840,
    originalPriceSLE: 1050,
    discountPercent: 20,
    rating: 4.8,
    reviewCount: 245,
    soldCount: 680,
    stockCount: 7,
    image: '/src/assets/images/flagship_smartphone_device_1791485459581.jpg',
    sellerName: 'Kissy Electronics Mart',
    sellerLocation: 'Freetown Verified',
    isVerifiedSeller: true,
    sellerRating: 4.9,
    isFlashDeal: true,
    description: 'Unlocked flagship with Dual Nano SIM configured for Sierra Leone networks (Orange 4G/5G, Africell 4G). 6.78" 120Hz AMOLED, 108MP OIS triple camera system, and 5000mAh battery with 67W Turbo Charge.',
    specifications: {
      'Network': '5G / 4G LTE Unlocked (Orange & Africell)',
      'Display': '6.78-inch FHD+ 120Hz Curved AMOLED',
      'Storage / RAM': '256GB UFS 3.1 + 12GB LPDDR5',
      'Battery & Charging': '5000mAh with 67W Fast Charger included',
      'Camera': '108MP Primary + 13MP Ultrawide + 32MP Selfie',
      'Warranty': '1 Year Local Replacement Guarantee',
    },
    features: [
      'Dual SIM standby with crystal clear VoLTE audio',
      'Gorilla Glass Victus front and splash-resistant nanocoating',
      'Under-display ultra-fast optical fingerprint scanner',
      'Pre-installed with Google Play Store & WhatsApp',
    ],
  },
  {
    id: 'prod-solar-panel-450w',
    title: 'VoltStar 450W Monocrystalline Tier-1 High-Efficiency Solar Panel',
    category: 'Solar & Power',
    priceSLE: 320,
    originalPriceSLE: 390,
    discountPercent: 18,
    rating: 4.85,
    reviewCount: 94,
    soldCount: 420,
    stockCount: 19,
    image: '/src/assets/images/solar_pv_panel_monocrystalline_1791485557806.jpg',
    sellerName: 'Makeni Green Energy Depot',
    sellerLocation: 'Makeni Verified',
    isVerifiedSeller: true,
    sellerRating: 4.88,
    isFlashDeal: false,
    description: 'Industrial-grade 450W monocrystalline PERC solar module engineered for tropical humidity and high ambient temperatures. Anodized black aluminum alloy frame with IP68 waterproof junction box.',
    specifications: {
      'Peak Power (Pmax)': '450 Watts',
      'Cell Type': 'Monocrystalline Grade A Half-Cut',
      'Module Efficiency': '21.3%',
      'Maximum Voltage (Vmp)': '41.6V',
      'Connector': 'Standard MC4 Compatible with 1.2m cables',
      'Warranty': '10 Years Product, 25 Years Linear Output',
    },
    features: [
      'Anti-reflective tempered glass withstands high wind and heavy rains',
      'Low light performance optimization for overcast rainy season',
      'Bypass diodes prevent hot-spot shading degradation',
    ],
  },
  {
    id: 'prod-audio-x-anc',
    title: 'Audio-X Pro Active Noise Cancelling Wireless Over-Ear Headphones (Navy)',
    category: 'Electronics & Audio',
    priceSLE: 195,
    originalPriceSLE: 260,
    discountPercent: 25,
    rating: 4.7,
    reviewCount: 88,
    soldCount: 190,
    stockCount: 12,
    image: '/src/assets/images/wireless_anc_headphones_1791485470426.jpg',
    sellerName: 'Fourah Bay Sound Lab',
    sellerLocation: 'Freetown Verified',
    isVerifiedSeller: true,
    sellerRating: 4.82,
    isFlashDeal: true,
    description: 'Immersive hybrid active noise cancellation blocking out 95% of background city rumble and traffic. Up to 45 hours playtime on single charge, fast USB-C top-up, and memory foam ear cushions.',
    specifications: {
      'Battery Life': '45h (ANC on) / 60h (ANC off)',
      'Connectivity': 'Bluetooth 5.3 + 3.5mm Aux backup cable',
      'Drivers': '40mm Titanium Composite Dynamic Drivers',
      'Microphones': '4-mic array with ENC for clear calls',
      'Charging Time': '10 mins charge provides 5 hours playback',
      'Warranty': '6 Months Hub Replacement',
    },
    features: [
      'Multi-point connection to switch between laptop and phone',
      'Transparency mode to hear surroundings with one click',
      'Foldable compact design with premium travel pouch included',
    ],
  },
  {
    id: 'prod-shoes-oxford',
    title: 'Royal Heritage Handcrafted Full-Grain Leather Oxford Dress Shoes',
    category: 'Fashion & Footwear',
    priceSLE: 145,
    originalPriceSLE: 190,
    discountPercent: 24,
    rating: 4.9,
    reviewCount: 112,
    soldCount: 230,
    stockCount: 8,
    image: '/src/assets/images/leather_oxford_shoes_1791485481085.jpg',
    sellerName: 'Bo Classic Gentlemen Boutique',
    sellerLocation: 'Bo City Verified',
    isVerifiedSeller: true,
    sellerRating: 4.91,
    isFlashDeal: false,
    description: 'Hand-burnished dark cognac brown Italian-cut dress shoes made with genuine top-grain cowhide leather. Goodyear-welted construction with cushioned breathable orthotic leather insole.',
    specifications: {
      'Upper Material': '100% Full-Grain Calf Leather',
      'Outsole': 'Stitched Leather with Anti-Slip Rubber Heel Tap',
      'Available Sizes': 'EU 40, 41, 42, 43, 44, 45, 46',
      'Lining': 'Breathable Sheepskin Inner',
      'Color': 'Deep Cognac Patina',
    },
    features: [
      'Hand-stitched cap toe with subtle burnished tip',
      'Moisture-wicking inner lining keeps feet cool in hot weather',
      'Comes with cedar shoe horn and custom cotton dust bags',
    ],
  },
  {
    id: 'prod-smart-tv-55',
    title: 'SkyVision 55" Frameless 4K UHD Smart Google TV with Dolby Atmos',
    category: 'Electronics & Audio',
    priceSLE: 890,
    originalPriceSLE: 1150,
    discountPercent: 22,
    rating: 4.75,
    reviewCount: 142,
    soldCount: 175,
    stockCount: 3,
    image: '/src/assets/images/smart_ultra_hd_tv_1791485491575.jpg',
    sellerName: 'Siaka Stevens Appliance Mart',
    sellerLocation: 'Freetown Verified',
    isVerifiedSeller: true,
    sellerRating: 4.87,
    isFlashDeal: true,
    description: 'Ultra-thin bezel 55-inch 4K HDR display powered by Google TV. Pre-loaded with YouTube, Netflix, DSTV Stream, and Prime Video. Built-in DVB-T2 digital terrestrial receiver for free-to-air Sierra Leone TV channels.',
    specifications: {
      'Screen Size & Resolution': '55 Inch 3840 x 2160 4K Ultra HD',
      'Operating System': 'Official Google TV with Voice Assistant',
      'Tuner': 'DVB-T2/S2 Free-to-Air Sierra Leone Broadcast',
      'Audio': '24W Dual Speakers with Dolby Audio',
      'Ports': '3x HDMI 2.1, 2x USB 2.0, Optical, LAN & WiFi 5',
      'Warranty': '1 Year Full In-Store Warranty',
    },
    features: [
      'Direct casting from Android and iPhone via Chromecast & AirPlay',
      'Surge-protected internal power board built for fluctuating voltage',
      'Bluetooth remote with quick shortcut keys',
    ],
  },
  {
    id: 'prod-tablet-pad11',
    title: 'TabPro 11" Octa-Core Student & Business Tablet with Active Stylus & Keyboard',
    category: 'Phones & Tablets',
    priceSLE: 460,
    originalPriceSLE: 580,
    discountPercent: 21,
    rating: 4.65,
    reviewCount: 76,
    soldCount: 145,
    stockCount: 6,
    image: '/src/assets/images/android_tablet_stylus_1791485568332.jpg',
    sellerName: 'Kenema Digital Solutions',
    sellerLocation: 'Kenema Verified',
    isVerifiedSeller: true,
    sellerRating: 4.8,
    isFlashDeal: false,
    description: 'Versatile 11-inch 2K productivity tablet bundled with magnetic smart keyboard folio and pressure-sensitive active stylus pen. 128GB ROM, 8GB RAM, and 4G LTE SIM slot for portable internet on the go.',
    specifications: {
      'Screen': '11.0-inch 2000x1200 IPS High-Brightness Panel',
      'Processor': 'Octa-Core 2.0GHz High-Efficiency CPU',
      'Memory': '8GB RAM + 128GB Storage (expandable via MicroSD)',
      'Connectivity': '4G LTE SIM Slot + Dual Band Wi-Fi',
      'Battery': '7700mAh with 18W Fast Charging',
      'Included in Box': 'Tablet, Magnetic Keyboard, Stylus Pen, Charger',
    },
    features: [
      'Split-screen multitasking for study, reading, and accounting',
      'Palm-rejection stylus ideal for digital note-taking and sketches',
      'Eye-comfort mode certified for long reading sessions',
    ],
  },
  {
    id: 'prod-cooker-multi',
    title: 'MasterChef Pro 6L Stainless Steel Digital Multi-Cooker & Pressure Cooker',
    category: 'Home & Living',
    priceSLE: 165,
    originalPriceSLE: 210,
    discountPercent: 21,
    rating: 4.88,
    reviewCount: 133,
    soldCount: 298,
    stockCount: 9,
    image: '/src/assets/images/smart_multi_cooker_1791485578647.jpg',
    sellerName: 'Lumley Home & Kitchen Emporium',
    sellerLocation: 'Freetown Verified',
    isVerifiedSeller: true,
    sellerRating: 4.93,
    isFlashDeal: true,
    description: 'All-in-one 1000W programmable electric pressure cooker that cooks cassava leaf stew, jollof rice, beans, and tender meats in half the standard time. Non-stick ceramic coated inner pot with 12 smart presets.',
    specifications: {
      'Capacity': '6.0 Litres (Serves 6–8 people)',
      'Power Rating': '1000W at 220V 50Hz',
      'Cooking Modes': 'Pressure Cook, Slow Cook, Sauté, Rice, Steam, Stew',
      'Safety Mechanisms': '10-fold safety lid lock & pressure release valve',
      'Material': 'Food-grade SUS304 Brushed Stainless Steel',
      'Warranty': '1 Year Appliance Warranty',
    },
    features: [
      'Cuts cooking gas and charcoal costs by up to 70%',
      'Automatic 24-hour Keep-Warm setting keeps food piping hot',
      'Dishwasher-safe non-stick inner pot with measuring accessories',
    ],
  },
];

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
