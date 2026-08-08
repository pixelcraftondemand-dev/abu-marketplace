import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(120000);
  page.on('console', (msg) => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', (err) => console.log('PAGE ERROR:', err.message));
  page.on('requestfailed', (req) => {
    const failure = req.failure();
    console.log('REQUEST FAILED:', req.url(), failure && failure.errorText);
  });
  page.on('response', (res) => {
    if (res.status() >= 400) {
      console.log('RESPONSE', res.status(), res.url());
    }
  });

  const paths = ['/', '/about', '/collections'];
  for (const path of paths) {
    console.log('Navigating to', path);
    try {
      const res = await page.goto(`http://localhost:3000${path}`, {
        waitUntil: 'domcontentloaded',
        timeout: 120000,
      });
      console.log('GOTO STATUS', path, res && res.status(), res && res.url());
      const html = await page.content();
      console.log('HTML len', html.length, 'for', path);
    } catch (err) {
      console.error('NAV ERROR', path, err.message);
      break;
    }
  }
  await browser.close();
})();