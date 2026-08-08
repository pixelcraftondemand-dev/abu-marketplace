import puppeteer from 'puppeteer';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const TIMEOUT = 30000;

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const PUBLIC_ROUTES = [
  '/',
  '/about',
  '/collections',
  '/contact',
  '/cookie-policy',
  '/create-store',
  '/faq',
  '/help',
  '/orders',
  '/pricing',
  '/privacy-policy',
  '/returns',
  '/seller-agreement',
  '/sellers',
  '/shipping',
  '/shop',
  '/sign-in',
  '/sign-up',
  '/terms-and-conditions',
  '/verify-email',
  '/wallet',
  '/wishlist',
];

const PRIVATE_ROUTES = [
  '/account',
  '/admin',
  '/admin/approve',
  '/admin/coupons',
  '/admin/stores',
  '/admin/support',
  '/admin/user-records',
  '/store',
  '/store/add-product',
  '/store/dashboard',
  '/store/manage-product',
  '/store/orders',
];

const API_ENDPOINTS = [
  '/api/products',
  '/api/products?sort=featured',
  '/api/products?search=test',
  '/api/products?category=electronics',
];

async function fetchJson(page, path) {
  const url = `${BASE_URL}${path}`;
  const response = await page.evaluate(async (url) => {
    const res = await fetch(url, { method: 'GET' });
    const body = await res.text();
    return { status: res.status, body };
  }, url);

  if (response.status >= 500) {
    throw new Error(`API request failed: ${path} returned ${response.status} - ${response.body}`);
  }

  let payload;
  try {
    payload = JSON.parse(response.body);
  } catch (error) {
    throw new Error(`API ${path} returned invalid JSON: ${error.message}`);
  }

  return { status: response.status, payload };
}

function isAcceptableAuthStatus(status) {
  return status < 500 || [401, 403, 302, 307].includes(status);
}

const NAVIGATION_OPTIONS = {
  waitUntil: 'domcontentloaded',
  timeout: 120000,
};

async function testRoute(page, path, requireSelector = null) {
  console.log(`Checking route ${path} ...`);
  const response = await page.goto(`${BASE_URL}${path}`, NAVIGATION_OPTIONS);
  assert(response, `${path} did not return a response.`);
  assert(isAcceptableAuthStatus(response.status()), `${path} returned ${response.status()}.`);

  if (requireSelector) {
    await page.waitForSelector(requireSelector, { timeout: TIMEOUT });
  }

  console.log(`${path} is reachable.`);
}

async function testPublicRoutes(page) {
  for (const route of PUBLIC_ROUTES) {
    await testRoute(page, route, route === '/' ? 'a[href^="/product/"]' : null);
  }
}

async function testPrivateRoutes(page) {
  for (const route of PRIVATE_ROUTES) {
    await testRoute(page, route);
  }
}

async function testApiRoutes(page) {
  console.log('Checking public API endpoints...');

  for (const path of API_ENDPOINTS) {
    const { status, payload } = await fetchJson(page, path);
    assert(status === 200, `Expected 200 for ${path}, got ${status}`);
    assert(payload && Array.isArray(payload.products), `${path} did not return { products: [] }`);
    console.log(`  ${path} returned ${payload.products.length} products.`);
  }
}

async function testProductDetail(page) {
  console.log('Checking product detail page...');
  const { payload } = await fetchJson(page, '/api/products?sort=featured');
  const firstProduct = payload.products[0];

  assert(firstProduct, 'No products were returned from /api/products to test a detail page.');

  const path = `/product/${firstProduct.id}`;
  const response = await page.goto(`${BASE_URL}${path}`, { waitUntil: 'networkidle2', timeout: TIMEOUT });
  assert(response, `Product page ${path} did not return a response.`);
  assert(response.status() < 500, `Product page ${path} returned ${response.status()}.`);

  const bodyText = await page.evaluate(() => document.body.innerText);
  assert(bodyText.includes(firstProduct.name), `Product page did not contain expected product name: ${firstProduct.name}`);
  console.log(`Product detail page for ${firstProduct.id} loaded successfully.`);
}

async function run() {
  console.log(`Starting sandbox tests against ${BASE_URL}`);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  page.on('console', (msg) => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', (err) => console.log('PAGE ERROR:', err.message));
  page.on('requestfailed', (request) => {
    const failure = request.failure();
    console.log('REQUEST FAILED:', request.url(), failure && failure.errorText);
  });
  page.on('response', (response) => {
    if (response.status() >= 400) {
      console.log(`RESPONSE ${response.status()} ${response.url()}`);
    }
  });
  page.setDefaultNavigationTimeout(180000);
  page.setDefaultTimeout(180000);

  try {
    await testPublicRoutes(page);
    await testApiRoutes(page);
    await testProductDetail(page);
    await testPrivateRoutes(page);

    console.log('All sandbox tests passed successfully.');
    await browser.close();
    process.exit(0);
  } catch (error) {
    console.error('Sandbox test failure:', error.message || error);
    await browser.close();
    process.exit(1);
  }
}

run();
