import assert from 'node:assert/strict';
import test from 'node:test';
import {
  EMPTY_SALES,
  MERCHANT_FULFILLMENT_ACTIONS,
  overallOrderStatus,
  readProductInput,
  readStoreProfileInput,
  summarizeOrderItems,
  toMerchantProduct,
  toPublicProduct,
  toMerchantStoreView,
  type MerchantProductRow,
} from '../server/merchant.ts';

const DAY = 24 * 60 * 60 * 1000;

test('a product needs a title, a category, a positive price and a stock count', () => {
  const missingTitle = readProductInput({ title: '  ', category: 'Solar & Power', priceSLE: 100 });
  assert.equal(missingTitle.ok, false);

  const missingCategory = readProductInput({ title: 'Panel', category: '', priceSLE: 100 });
  assert.equal(missingCategory.ok, false);

  const freePrice = readProductInput({ title: 'Panel', category: 'Solar & Power', priceSLE: 0 });
  assert.equal(freePrice.ok, false);

  const negativeStock = readProductInput({
    title: 'Panel',
    category: 'Solar & Power',
    priceSLE: 100,
    stockCount: -2,
  });
  assert.equal(negativeStock.ok, false);

  const valid = readProductInput({
    title: '  200W Panel ',
    category: 'Solar & Power',
    priceSLE: '1250.5',
    stockCount: '7',
    description: ' Monocrystalline ',
  });
  assert.equal(valid.ok, true);
  if (!valid.ok) return;
  assert.equal(valid.value.title, '200W Panel');
  assert.equal(valid.value.priceSLE, 1250.5);
  assert.equal(valid.value.stockCount, 7);
  assert.equal(valid.value.isActive, true);
});

test('editing a product keeps its image and description when the form omits them', () => {
  const result = readProductInput(
    { title: 'Panel', category: 'Solar & Power', priceSLE: 100, stockCount: 3 },
    { image: 'https://cdn.example/panel.jpg', description: 'Old copy', isActive: false },
  );
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.value.image, 'https://cdn.example/panel.jpg');
  assert.equal(result.value.description, 'Old copy');
  assert.equal(result.value.isActive, false);
});

test('the store profile accepts only the editable fields and trims them', () => {
  const profile = readStoreProfileInput({
    tagline: '  Genuine goods ',
    description: 'We sell solar',
    locationHub: 'Freetown Central',
    province: 'Western Area',
    streetAddress: '12 Pademba Road',
    phone: '076123456',
    payoutProvider: 'orange',
    payoutPhone: '076123456',
    logo: 'https://cdn.example/logo.jpg',
    // Fields the merchant must not edit themselves are ignored.
    name: 'Hijacked Store',
    slug: 'hijacked',
    status: 'approved',
  });
  assert.equal(profile.tagline, 'Genuine goods');
  assert.equal(profile.phone, '076123456');
  assert.deepEqual(Object.keys(profile).sort(), [
    'description',
    'locationHub',
    'logo',
    'payoutPhone',
    'payoutProvider',
    'phone',
    'province',
    'streetAddress',
    'tagline',
  ]);
});

test('sales totals add up revenue, units and distinct orders inside the 30-day window', () => {
  const now = Date.parse('2026-11-27T12:00:00.000Z');
  const totals = summarizeOrderItems(
    [
      { orderId: 'o1', quantity: 2, unitPriceSLE: 100, createdAt: new Date(now - DAY).toISOString() },
      { orderId: 'o1', quantity: 1, unitPriceSLE: 50, createdAt: new Date(now - DAY).toISOString() },
      { orderId: 'o2', quantity: 4, unitPriceSLE: 25, createdAt: new Date(now - 40 * DAY).toISOString() },
    ],
    now,
  );

  assert.equal(totals.revenueSLE, 350);
  assert.equal(totals.unitsSold, 7);
  assert.equal(totals.orderCount, 2);
  assert.equal(totals.revenueLast30SLE, 250);
  assert.equal(totals.unitsLast30, 3);
  assert.equal(totals.ordersLast30, 1);
});

test('an empty catalog reports zeroes rather than nulls', () => {
  const totals = summarizeOrderItems([]);
  assert.deepEqual(totals, {
    revenueSLE: 0,
    unitsSold: 0,
    orderCount: 0,
    revenueLast30SLE: 0,
    unitsLast30: 0,
    ordersLast30: 0,
  });
  assert.deepEqual(EMPTY_SALES.recentOrders, []);
});

test('a catalog row becomes a shoppable product that names its store', () => {
  const row: MerchantProductRow = {
    id: 'mp-1',
    store_id: 'store-abc',
    seller_id: 'user-1',
    title: '200W Solar Panel',
    category: 'Solar & Power',
    price_sle: '1450.00',
    original_price_sle: null,
    stock_count: 6,
    is_active: true,
    image_url: null,
    description: null,
    created_at: null,
    updated_at: null,
  };

  const merchantProduct = toMerchantProduct(row);
  assert.equal(merchantProduct.priceSLE, 1450);
  assert.equal(merchantProduct.stockCount, 6);
  assert.equal(merchantProduct.isActive, true);
  assert.match(merchantProduct.image, /flagship_smartphone/);

  const publicProduct = toPublicProduct(row, 'Amans', 'Freetown Central');
  assert.equal(publicProduct.id, 'mp-1');
  assert.equal(publicProduct.storeId, 'store-abc');
  assert.equal(publicProduct.sellerName, 'Amans');
  assert.equal(publicProduct.sellerLocation, 'Freetown Central');
  assert.equal(publicProduct.isVerifiedSeller, true);
  assert.equal(publicProduct.priceSLE, 1450);
  assert.match(publicProduct.description, /Amans/);
});

test('the order status follows the stores inside it', () => {
  assert.equal(overallOrderStatus([]), 'placed');
  assert.equal(overallOrderStatus(['placed', 'placed']), 'placed');
  assert.equal(overallOrderStatus(['placed', 'dispatched']), 'in_transit');
  assert.equal(overallOrderStatus(['dispatched']), 'in_transit');
  assert.equal(overallOrderStatus(['delivered', 'delivered']), 'delivered');
  // One store still holding the parcel keeps the order open.
  assert.equal(overallOrderStatus(['delivered', 'dispatched']), 'in_transit');
  assert.equal(overallOrderStatus(['delivered', 'placed']), 'in_transit');
});

test('a merchant can only move an order forward', () => {
  assert.deepEqual(MERCHANT_FULFILLMENT_ACTIONS, ['dispatched', 'delivered']);
});

test('a merchant store view exposes the public id and slug the dashboard links to', () => {
  const view = toMerchantStoreView({
    id: '0f2e5957-13ef-425b-8baa-87134e7f5853',
    owner_id: 'user-1',
    owner_email: 'merchant@example.com',
    owner_name: 'Merchant',
    name: 'Amans',
    slug: 'amans',
    tagline: null,
    description: null,
    location_hub: 'Freetown Central',
    province: 'Western Area',
    street_address: '12 New London Street',
    phone: '076123456',
    payout_provider: 'orange',
    payout_phone: '076123456',
    logo: null,
    status: 'approved',
    review_note: null,
    reviewed_at: '2026-11-27T13:41:51.671+00:00',
    created_store_id: 'store-0f2e5957',
    created_at: '2026-11-27T13:08:34.998+00:00',
    updated_at: '2026-11-27T13:41:51.671+00:00',
  });

  assert.equal(view.id, 'store-0f2e5957');
  assert.equal(view.slug, 'amans');
  assert.equal(view.name, 'Amans');
  assert.equal(view.status, 'approved');
});
