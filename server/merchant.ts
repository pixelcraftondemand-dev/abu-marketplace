import { isSupabaseConfigured, supabaseAdmin } from './supabase.ts';
import type { SubmissionRow } from './storeSubmissions.ts';
import type { Product } from '../src/types';

/**
 * Merchant self-service data.
 *
 * A store's public profile is the admin-approved `store_submissions` row, so editing the
 * profile there keeps the storefront, the directory and the merchant dashboard in one
 * place. Products live in the `products` table, which is the merchant's own live catalog:
 * an approved merchant adds and edits stock without a second review round.
 */

export type MerchantStoreRow = Pick<
  SubmissionRow,
  | 'id'
  | 'owner_id'
  | 'owner_email'
  | 'owner_name'
  | 'name'
  | 'slug'
  | 'tagline'
  | 'description'
  | 'location_hub'
  | 'province'
  | 'street_address'
  | 'phone'
  | 'payout_provider'
  | 'payout_phone'
  | 'logo'
  | 'status'
  | 'review_note'
  | 'reviewed_at'
  | 'created_store_id'
  | 'created_at'
  | 'updated_at'
>;

export interface MerchantProductRow {
  id: string;
  store_id: string;
  seller_id: string;
  title: string;
  category: string;
  price_sle: number | string;
  original_price_sle: number | string | null;
  stock_count: number;
  is_active: boolean;
  image_url: string | null;
  description: string | null;
  created_at: string | null;
  updated_at: string | null;
}

/** What the dashboard renders for one catalog item. */
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

export type FulfillmentStatus = 'placed' | 'dispatched' | 'delivered' | 'cancelled';

/** A merchant may move their own lines forward, never backwards or to cancelled. */
export const MERCHANT_FULFILLMENT_ACTIONS: FulfillmentStatus[] = ['dispatched', 'delivered'];

export interface MerchantOrderSummary {
  orderId: string;
  trackingNumber: string;
  /** This store's own progress on the order; other stores in it may differ. */
  status: FulfillmentStatus;
  recipientName: string;
  itemsSummary: string;
  quantity: number;
  totalSLE: number;
  createdAt: string;
}

/**
 * The order-level status follows the stores inside it: everything delivered closes the
 * order, one dispatched parcel puts it in transit, and a cancelled line never reopens.
 */
export function overallOrderStatus(statuses: string[]): 'placed' | 'in_transit' | 'delivered' {
  if (statuses.length === 0) return 'placed';
  if (statuses.every((status) => status === 'delivered')) return 'delivered';
  if (statuses.some((status) => status === 'dispatched' || status === 'delivered')) {
    return 'in_transit';
  }
  return 'placed';
}

export interface MerchantSalesSummary {
  revenueSLE: number;
  unitsSold: number;
  orderCount: number;
  revenueLast30SLE: number;
  unitsLast30: number;
  ordersLast30: number;
  recentOrders: MerchantOrderSummary[];
  /** Every paid order this store has not handed to a carrier yet. */
  awaitingDispatch: MerchantOrderSummary[];
  /** May be larger than `awaitingDispatch`, which is capped for the dashboard. */
  awaitingDispatchCount: number;
}

export interface MerchantStoreView {
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

export interface MerchantOverview {
  store: MerchantStoreView | null;
  products: MerchantProduct[];
  sales: MerchantSalesSummary;
}

export const EMPTY_SALES: MerchantSalesSummary = {
  revenueSLE: 0,
  unitsSold: 0,
  orderCount: 0,
  revenueLast30SLE: 0,
  unitsLast30: 0,
  ordersLast30: 0,
  recentOrders: [],
  awaitingDispatch: [],
  awaitingDispatchCount: 0,
};

const DEFAULT_PRODUCT_IMAGE = '/products/flagship_smartphone_device_1791485459581.jpg';

function numberOr(value: unknown, fallback = 0): number {
  const parsed = typeof value === 'number' ? value : Number.parseFloat(String(value ?? ''));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function text(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

export function toMerchantStoreView(row: MerchantStoreRow): MerchantStoreView {
  return {
    id: row.created_store_id || `store-${row.id.slice(0, 8)}`,
    slug: row.slug,
    name: row.name,
    tagline: row.tagline || '',
    description: row.description || '',
    locationHub: row.location_hub || '',
    province: row.province || '',
    streetAddress: row.street_address || '',
    phone: row.phone,
    payoutProvider: row.payout_provider || '',
    payoutPhone: row.payout_phone || '',
    logo: row.logo || '',
    status: row.status,
    reviewNote: row.review_note ?? null,
    reviewedAt: row.reviewed_at ?? null,
  };
}

export function toMerchantProduct(row: MerchantProductRow): MerchantProduct {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    priceSLE: numberOr(row.price_sle),
    stockCount: numberOr(row.stock_count),
    isActive: row.is_active !== false,
    image: row.image_url || DEFAULT_PRODUCT_IMAGE,
    description: row.description || '',
    createdAt: row.created_at,
  };
}

/** Maps a merchant catalog row onto the public product shape the storefront renders. */
export function toPublicProduct(
  row: MerchantProductRow,
  storeName: string,
  storeLocation: string,
): Product {
  const price = numberOr(row.price_sle);
  return {
    id: row.id,
    title: row.title,
    category: row.category as Product['category'],
    priceSLE: price,
    originalPriceSLE: numberOr(row.original_price_sle, price),
    rating: 5,
    reviewCount: 0,
    soldCount: 0,
    stockCount: numberOr(row.stock_count),
    image: row.image_url || DEFAULT_PRODUCT_IMAGE,
    sellerName: storeName,
    sellerLocation: storeLocation,
    isVerifiedSeller: true,
    sellerRating: 5,
    isFlashDeal: false,
    description: row.description || `${row.title}, sold by ${storeName} on ABU Marketplace.`,
    specifications: {},
    features: [],
    storeId: row.store_id,
    sellerType: 'store',
  };
}

export interface ProductInput {
  title: string;
  category: string;
  priceSLE: number;
  stockCount: number;
  image: string;
  description: string;
  isActive: boolean;
}

/**
 * Normalises and checks a product payload. Returns a message instead of a value, so the
 * route can answer 400 with wording the merchant can act on.
 */
export function readProductInput(
  body: Record<string, unknown>,
  existing?: { image?: string; description?: string; isActive?: boolean },
): { ok: true; value: ProductInput } | { ok: false; error: string } {
  const title = text(body.title, 200);
  if (!title) return { ok: false, error: 'A product title is required' };

  const category = text(body.category, 80);
  if (!category) return { ok: false, error: 'Choose a category for this product' };

  const priceSLE = Math.round(numberOr(body.priceSLE, 0) * 100) / 100;
  if (!Number.isFinite(priceSLE) || priceSLE <= 0) {
    return { ok: false, error: 'Enter a price greater than zero' };
  }

  const stockCount = Math.floor(numberOr(body.stockCount, 0));
  if (stockCount < 0 || stockCount > 1_000_000) {
    return { ok: false, error: 'Enter a stock count between 0 and 1,000,000' };
  }

  return {
    ok: true,
    value: {
      title,
      category,
      priceSLE,
      stockCount,
      image: text(body.image, 500) || existing?.image || DEFAULT_PRODUCT_IMAGE,
      description: text(body.description, 2000) || existing?.description || '',
      isActive: typeof body.isActive === 'boolean' ? body.isActive : existing?.isActive !== false,
    },
  };
}

export interface StoreProfileInput {
  tagline: string;
  description: string;
  locationHub: string;
  province: string;
  streetAddress: string;
  phone: string;
  payoutProvider: string;
  payoutPhone: string;
  logo: string;
}

/** The profile fields a merchant may change themselves; the name and slug stay fixed. */
export function readStoreProfileInput(body: Record<string, unknown>): StoreProfileInput {
  return {
    tagline: text(body.tagline, 160),
    description: text(body.description, 2000),
    locationHub: text(body.locationHub, 120),
    province: text(body.province, 80),
    streetAddress: text(body.streetAddress, 240),
    phone: text(body.phone, 40),
    payoutProvider: text(body.payoutProvider, 40),
    payoutPhone: text(body.payoutPhone, 40),
    logo: text(body.logo, 500),
  };
}

export interface OrderItemInput {
  orderId: string;
  productId: string;
  storeId: string | null;
  title: string;
  quantity: number;
  unitPriceSLE: number;
  createdAt?: string;
}

/** Revenue, units and order count for a store, plus the window the dashboard highlights. */
export function summarizeOrderItems(
  items: Array<{ quantity: number; unitPriceSLE: number; orderId: string; createdAt: string }>,
  now = Date.now(),
): Omit<MerchantSalesSummary, 'recentOrders' | 'awaitingDispatch' | 'awaitingDispatchCount'> {
  const windowStart = now - 30 * 24 * 60 * 60 * 1000;
  const orders = new Set<string>();
  const recentOrders = new Set<string>();
  let revenueSLE = 0;
  let unitsSold = 0;
  let revenueLast30SLE = 0;
  let unitsLast30 = 0;

  for (const item of items) {
    const line = item.quantity * item.unitPriceSLE;
    revenueSLE += line;
    unitsSold += item.quantity;
    orders.add(item.orderId);

    const at = Date.parse(item.createdAt);
    if (Number.isFinite(at) && at >= windowStart) {
      revenueLast30SLE += line;
      unitsLast30 += item.quantity;
      recentOrders.add(item.orderId);
    }
  }

  return {
    revenueSLE: Math.round(revenueSLE * 100) / 100,
    unitsSold,
    orderCount: orders.size,
    revenueLast30SLE: Math.round(revenueLast30SLE * 100) / 100,
    unitsLast30,
    ordersLast30: recentOrders.size,
  };
}

function unavailable(): never {
  throw new Error('The database is not configured, so merchant data cannot be loaded.');
}

/** The signed-in owner's live store: their newest approved store application. */
export async function approvedStoreForOwner(ownerId: string): Promise<MerchantStoreRow | null> {
  if (!isSupabaseConfigured()) return null;
  const { data, error } = await supabaseAdmin
    .from('store_submissions')
    .select('*')
    .eq('owner_id', ownerId)
    .eq('kind', 'store')
    .eq('status', 'approved')
    .order('reviewed_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Could not load your store: ${error.message}`);
  return (data as MerchantStoreRow | null) ?? null;
}

/** Every live store, keyed by the store id their products carry. */
export async function approvedStoreMap(): Promise<Map<string, MerchantStoreRow>> {
  if (!isSupabaseConfigured()) return new Map();
  const { data, error } = await supabaseAdmin
    .from('store_submissions')
    .select('*')
    .eq('kind', 'store')
    .eq('status', 'approved');
  if (error) {
    console.error('[merchant] could not load approved stores for the catalog:', error.message);
    return new Map();
  }
  const map = new Map<string, MerchantStoreRow>();
  for (const row of (data || []) as MerchantStoreRow[]) {
    map.set(row.created_store_id || `store-${row.id.slice(0, 8)}`, row);
  }
  return map;
}

/**
 * Mirrors an approved store into `vendor_stores`, the table the catalog's foreign keys
 * reference. The approved application stays the storefront's source of truth, so this
 * row is kept in step whenever the merchant opens the dashboard or saves the profile.
 */
export async function ensureVendorStore(store: MerchantStoreRow): Promise<string> {
  if (!isSupabaseConfigured()) unavailable();
  const storeId = store.created_store_id || `store-${store.id.slice(0, 8)}`;
  const { error } = await supabaseAdmin.from('vendor_stores').upsert(
    {
      id: storeId,
      owner_id: store.owner_id || '',
      name: store.name,
      slug: store.slug,
      description: store.description || store.tagline || '',
      category: 'General',
      city: store.location_hub || 'Freetown',
      address: store.street_address || '',
      phone: store.phone,
      is_verified: true,
      status: 'approved',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' },
  );
  if (error) throw new Error(`Could not prepare your store: ${error.message}`);
  return storeId;
}

export async function listMerchantProducts(storeId: string): Promise<MerchantProduct[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await supabaseAdmin
    .from('products')
    .select('*')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(`Could not load your products: ${error.message}`);
  return ((data || []) as MerchantProductRow[]).map(toMerchantProduct);
}

/** Active products of every approved merchant, for the public catalog and checkout. */
export async function activeMerchantProducts(): Promise<MerchantProductRow[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await supabaseAdmin
    .from('products')
    .select('*')
    .eq('is_active', true);
  if (error) {
    console.error('[merchant] could not load merchant products:', error.message);
    return [];
  }
  return (data || []) as MerchantProductRow[];
}

export async function createMerchantProduct(
  store: MerchantStoreRow,
  ownerId: string,
  input: ProductInput,
): Promise<MerchantProduct> {
  if (!isSupabaseConfigured()) unavailable();
  // The catalog row needs its store to exist before the product can reference it.
  const storeId = await ensureVendorStore(store);
  const { data, error } = await supabaseAdmin
    .from('products')
    .insert({
      id: `mp-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      store_id: storeId,
      seller_id: ownerId,
      title: input.title,
      category: input.category,
      price_sle: input.priceSLE,
      original_price_sle: input.priceSLE,
      stock_count: input.stockCount,
      is_active: input.isActive,
      image_url: input.image,
      description: input.description,
    })
    .select('*')
    .single();
  if (error || !data) throw new Error(`Could not save the product: ${error?.message || 'unknown error'}`);
  return toMerchantProduct(data as MerchantProductRow);
}

export async function updateMerchantProduct(
  storeId: string,
  productId: string,
  input: ProductInput,
): Promise<MerchantProduct> {
  if (!isSupabaseConfigured()) unavailable();
  // Store id is part of the filter as well as the id, so one merchant can never edit
  // another store's catalog by guessing a product id.
  const { data, error } = await supabaseAdmin
    .from('products')
    .update({
      title: input.title,
      category: input.category,
      price_sle: input.priceSLE,
      stock_count: input.stockCount,
      is_active: input.isActive,
      image_url: input.image,
      description: input.description,
      updated_at: new Date().toISOString(),
    })
    .eq('id', productId)
    .eq('store_id', storeId)
    .select('*')
    .maybeSingle();
  if (error) throw new Error(`Could not save the product: ${error.message}`);
  if (!data) throw new Error('Product not found in your store');
  return toMerchantProduct(data as MerchantProductRow);
}

export async function deleteMerchantProduct(storeId: string, productId: string): Promise<void> {
  if (!isSupabaseConfigured()) unavailable();
  const { error } = await supabaseAdmin
    .from('products')
    .delete()
    .eq('id', productId)
    .eq('store_id', storeId);
  if (error) throw new Error(`Could not remove the product: ${error.message}`);
}

export async function updateMerchantStore(
  submissionId: string,
  input: StoreProfileInput,
): Promise<MerchantStoreRow> {
  if (!isSupabaseConfigured()) unavailable();
  const { data, error } = await supabaseAdmin
    .from('store_submissions')
    .update({
      tagline: input.tagline || null,
      description: input.description || null,
      location_hub: input.locationHub || null,
      province: input.province || null,
      street_address: input.streetAddress || null,
      ...(input.phone ? { phone: input.phone } : {}),
      payout_provider: input.payoutProvider || null,
      payout_phone: input.payoutPhone || null,
      logo: input.logo || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', submissionId)
    // Status is part of the filter so a pending application cannot be edited into a store.
    .eq('status', 'approved')
    .select('*')
    .maybeSingle();
  if (error) throw new Error(`Could not save your store: ${error.message}`);
  if (!data) throw new Error('Your store is not live, so it cannot be edited yet');
  const saved = data as MerchantStoreRow;
  // Keep the mirror the catalog references in step with the storefront's own row.
  await ensureVendorStore(saved).catch((mirrorError) => {
    console.error('[merchant] could not update the store mirror:', mirrorError);
  });
  return saved;
}

/** Revenue and recent sales for one store, from the persisted line items. */
export async function merchantSales(storeId: string): Promise<MerchantSalesSummary> {
  if (!isSupabaseConfigured()) return EMPTY_SALES;

  const { data: items, error } = await supabaseAdmin
    .from('order_items')
    .select('order_id, title, quantity, unit_price_sle, created_at, fulfillment_status')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) throw new Error(`Could not load your sales: ${error.message}`);

  const rows = (items || []) as Array<{
    order_id: string;
    title: string;
    quantity: number;
    unit_price_sle: number | string;
    created_at: string;
    fulfillment_status: FulfillmentStatus;
  }>;

  const totals = summarizeOrderItems(
    rows.map((row) => ({
      orderId: row.order_id,
      quantity: numberOr(row.quantity),
      unitPriceSLE: numberOr(row.unit_price_sle),
      createdAt: row.created_at,
    })),
  );

  // One entry per order, so a multi-item order is not shown — or acted on — twice.
  const linesByOrder = new Map<string, typeof rows>();
  for (const row of rows) {
    const lines = linesByOrder.get(row.order_id);
    if (lines) lines.push(row);
    else linesByOrder.set(row.order_id, [row]);
  }
  // Rows arrive newest first, so both lists keep recency order. Awaiting dispatch is
  // every order this store has not handed over yet, not just the eight shown below.
  const allOrderIds = [...linesByOrder.keys()];
  const statusOf = (orderId: string): FulfillmentStatus =>
    (linesByOrder.get(orderId)?.[0]?.fulfillment_status || 'placed') as FulfillmentStatus;
  const awaitingIds = allOrderIds.filter((orderId) => statusOf(orderId) === 'placed');
  const recentIds = allOrderIds.slice(0, 8);
  // The dashboard filters on this list, so it is capped rather than unbounded.
  const dispatchIds = awaitingIds.slice(0, 50);

  // One query serves both the recent-sales list and the awaiting-dispatch filter.
  const metadataIds = [...new Set([...recentIds, ...dispatchIds])];
  let ordersById = new Map<string, { tracking_number: string; order_status: string; recipient_name: string }>();
  if (metadataIds.length) {
    const { data: orders, error: ordersError } = await supabaseAdmin
      .from('orders')
      .select('id, tracking_number, order_status, recipient_name')
      .in('id', metadataIds);
    if (ordersError) {
      console.error('[merchant] could not load recent orders:', ordersError.message);
    } else {
      ordersById = new Map(
        ((orders || []) as Array<{
          id: string;
          tracking_number: string;
          order_status: string;
          recipient_name: string;
        }>).map((order) => [order.id, order]),
      );
    }
  }

  const toOrder = (orderId: string): MerchantOrderSummary => {
    const lines = linesByOrder.get(orderId) || [];
    const order = ordersById.get(orderId);
    const quantity = lines.reduce((sum, line) => sum + numberOr(line.quantity), 0);
    const total = lines.reduce(
      (sum, line) => sum + numberOr(line.quantity) * numberOr(line.unit_price_sle),
      0,
    );
    const titles = lines.map((line) => line.title);
    return {
      orderId,
      trackingNumber: order?.tracking_number || '',
      status: statusOf(orderId),
      recipientName: order?.recipient_name || '',
      itemsSummary:
        titles.length > 2
          ? `${titles.slice(0, 2).join(', ')} +${titles.length - 2} more`
          : titles.join(', '),
      quantity,
      totalSLE: Math.round(total * 100) / 100,
      createdAt: lines[0]?.created_at || new Date().toISOString(),
    };
  };

  return {
    ...totals,
    recentOrders: recentIds.map(toOrder),
    awaitingDispatch: dispatchIds.map(toOrder),
    awaitingDispatchCount: awaitingIds.length,
  };
}

/**
 * Moves one store's lines of an order to a new fulfilment stage and rolls the overall
 * order status up from every store's lines. Other stores in the order are untouched.
 */
export async function updateOrderFulfillment(
  storeId: string,
  orderId: string,
  status: FulfillmentStatus,
): Promise<{ status: FulfillmentStatus; orderStatus: 'placed' | 'in_transit' | 'delivered' }> {
  if (!isSupabaseConfigured()) unavailable();
  if (!MERCHANT_FULFILLMENT_ACTIONS.includes(status)) {
    throw new Error(`An order can only be marked ${MERCHANT_FULFILLMENT_ACTIONS.join(' or ')}`);
  }

  const { data: mine, error: mineError } = await supabaseAdmin
    .from('order_items')
    .select('id')
    .eq('order_id', orderId)
    .eq('store_id', storeId);
  if (mineError) throw new Error(`Could not load the order: ${mineError.message}`);
  if (!mine?.length) throw new Error('That order does not contain anything from your store');

  const { error } = await supabaseAdmin
    .from('order_items')
    .update({ fulfillment_status: status })
    .eq('order_id', orderId)
    .eq('store_id', storeId);
  if (error) throw new Error(`Could not update the order: ${error.message}`);

  const { data: allLines, error: allError } = await supabaseAdmin
    .from('order_items')
    .select('fulfillment_status')
    .eq('order_id', orderId);
  if (allError) {
    console.error('[merchant] could not read the order lines:', allError.message);
    return { status, orderStatus: status === 'delivered' ? 'delivered' : 'in_transit' };
  }

  const orderStatus = overallOrderStatus(
    ((allLines || []) as Array<{ fulfillment_status: string }>).map((line) => line.fulfillment_status),
  );

  const { error: orderError } = await supabaseAdmin
    .from('orders')
    .update({ order_status: orderStatus, updated_at: new Date().toISOString() })
    .eq('id', orderId)
    // A cancelled order stays cancelled; a merchant cannot reopen it by dispatching.
    .neq('order_status', 'cancelled');
  if (orderError) console.error('[merchant] could not update the order status:', orderError.message);

  return { status, orderStatus };
}

export async function merchantOverview(ownerId: string): Promise<MerchantOverview> {
  const store = await approvedStoreForOwner(ownerId);
  if (!store) return { store: null, products: [], sales: EMPTY_SALES };
  const storeId = store.created_store_id || `store-${store.id.slice(0, 8)}`;
  // Opening the dashboard is also what makes sure the store's catalog row exists.
  await ensureVendorStore(store).catch((mirrorError) => {
    console.error('[merchant] could not prepare the store mirror:', mirrorError);
  });
  const [products, sales] = await Promise.all([
    listMerchantProducts(storeId),
    merchantSales(storeId).catch((error) => {
      console.error('[merchant] sales summary failed:', error);
      return EMPTY_SALES;
    }),
  ]);
  return { store: toMerchantStoreView(store), products, sales };
}

/** Persists an order and its line items, then takes the sold units out of stock. */
export async function recordOrder(
  order: { id: string; trackingNumber: string; buyerId?: string; recipientName: string; phone: string; destinationId: string; streetAddress: string; landmark?: string | null; paymentMethod: string; paymentStatus: string; orderStatus: string; subtotalSLE: number; deliveryFeeSLE: number; totalSLE: number },
  items: OrderItemInput[],
): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const { error } = await supabaseAdmin.from('orders').insert({
    id: order.id,
    tracking_number: order.trackingNumber,
    buyer_id: order.buyerId || null,
    recipient_name: order.recipientName,
    phone: order.phone,
    destination_id: order.destinationId,
    street_address: order.streetAddress,
    landmark: order.landmark || null,
    payment_method: order.paymentMethod,
    payment_status: order.paymentStatus,
    order_status: order.orderStatus,
    subtotal_sle: order.subtotalSLE,
    delivery_fee_sle: order.deliveryFeeSLE,
    total_sle: order.totalSLE,
  });
  if (error) throw new Error(`Could not save the order: ${error.message}`);

  if (items.length) {
    const { error: itemsError } = await supabaseAdmin.from('order_items').insert(
      items.map((item) => ({
        order_id: item.orderId,
        product_id: item.productId,
        store_id: item.storeId,
        title: item.title,
        quantity: item.quantity,
        unit_price_sle: item.unitPriceSLE,
      })),
    );
    if (itemsError) console.error('[orders] could not save line items:', itemsError.message);
  }
}

/** Decrements stock for merchant products after an order, never below zero. */
export async function decrementMerchantStock(
  lines: Array<{ productId: string; quantity: number }>,
): Promise<void> {
  if (!isSupabaseConfigured() || !lines.length) return;
  const ids = lines.map((line) => line.productId);
  const { data, error } = await supabaseAdmin
    .from('products')
    .select('id, stock_count')
    .in('id', ids);
  if (error) {
    console.error('[orders] could not read merchant stock:', error.message);
    return;
  }
  for (const row of (data || []) as Array<{ id: string; stock_count: number }>) {
    const sold = lines.filter((line) => line.productId === row.id);
    const quantity = sold.reduce((sum, line) => sum + line.quantity, 0);
    const next = Math.max(0, numberOr(row.stock_count) - quantity);
    const { error: updateError } = await supabaseAdmin
      .from('products')
      .update({ stock_count: next, updated_at: new Date().toISOString() })
      .eq('id', row.id);
    if (updateError) console.error('[orders] could not update merchant stock:', updateError.message);
  }
}
