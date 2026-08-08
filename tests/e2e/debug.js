import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  console.log('Opening page');
  const response = await page.goto('http://localhost:3000', {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  });
  console.log('Response:', response && response.status());
  if (response) {
    console.log('URL:', response.url());
    console.log('Headers:', response.headers()['content-type']);
  }
  await browser.close();
})();
