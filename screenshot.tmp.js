const puppeteer = require("puppeteer");

const targets = [
  { name: "home", url: "http://localhost:3112/en" },
  { name: "cart", url: "http://localhost:3112/en/cart" },
  { name: "wishlist", url: "http://localhost:3112/en/wishlist" },
  { name: "shop", url: "http://localhost:3112/en/shop" },
];

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
    args: ["--no-sandbox", "--disable-gpu", "--window-size=1440,900"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  for (const t of targets) {
    try {
      await page.goto(t.url, { waitUntil: "domcontentloaded", timeout: 60000 });
      await new Promise((r) => setTimeout(r, 6000));
      await page.screenshot({ path: `/tmp/${t.name}.png`, fullPage: false });
      console.log(`saved /tmp/${t.name}.png`);
    } catch (e) {
      console.log(`FAIL ${t.name}: ${e.message}`);
    }
  }
  await browser.close();
})();
