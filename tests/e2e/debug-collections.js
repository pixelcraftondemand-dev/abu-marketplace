import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(120000);

  page.on('request', (req) => console.log('REQUEST:', req.method(), req.url()));
  page.on('requestfailed', (req) => {
    const failure = req.failure();
    console.log('REQUEST FAILED:', req.url(), failure && failure.errorText);
  });
  page.on('response', async (res) => {
    if (res.status() >= 400) {
      console.log('RESPONSE:', res.status(), res.url());
      if (res.url().includes('/_next/static')) {
        const text = await res.text().catch(() => '<<body read failed>>');
        console.log('BODY:', text.slice(0, 200));
      }
    }
  });
  page.on('console', (msg) => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', (err) => console.log('PAGE ERROR:', err.message));

  try {
    console.log('Navigating to /collections');
    const response = await page.goto('http://localhost:3000/collections', {
      waitUntil: 'load',
      timeout: 120000,
    });
    console.log('PAGE RESPONSE:', response && response.status(), response && response.url());
    const html = await page.content();
    console.log('PAGE HTML LEN:', html.length);
    console.log(html.slice(0, 1000));
  } catch (e) {
    console.error('NAV ERROR:', e.message);
  } finally {
    await browser.close();
  }
})();