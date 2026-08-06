import { NextResponse } from "next/server";
import puppeteer from "puppeteer";
import { pdfRateLimiter } from "@/lib/security";

// ── SSRF guard ────────────────────────────────────────────────────────────────
// The headless browser can reach internal network resources and cloud metadata
// endpoints (169.254.169.254 etc.). Only the marketplace's own public pages may
// be rendered — arbitrary user-supplied URLs are rejected before launch.
const ALLOWED_PDF_HOSTS = new Set([
  "abumarketplace.shop",
  "www.abumarketplace.shop",
]);

function isAllowedPdfUrl(raw) {
  if (typeof raw !== "string" || raw.length > 2048) return false;
  let url;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return false;

  // Allow the configured app origin (e.g. a custom domain) and localhost only
  // when the app itself is configured for local development — never in
  // production, so internal hosts can't be reached via the headless browser.
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const isLocalDev = appUrl && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(appUrl);
  if (isLocalDev && (url.hostname === "localhost" || url.hostname === "127.0.0.1")) {
    return true;
  }
  if (appUrl) {
    try {
      const app = new URL(appUrl);
      if (url.hostname === app.hostname) return true;
    } catch {
      /* ignore malformed env */
    }
  }
  return ALLOWED_PDF_HOSTS.has(url.hostname);
}

export async function POST(request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rl = pdfRateLimiter.check(ip);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  let url;
  try {
    const body = await request.json();
    url = body?.url;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }
  if (!isAllowedPdfUrl(url)) {
    return NextResponse.json({ error: "URL is not allowed." }, { status: 403 });
  }

  try {
    const browser = await puppeteer.launch({ args: ["--no-sandbox", "--disable-setuid-sandbox"] });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf({ format: "A4", printBackground: true });
    await browser.close();

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Length": String(pdfBuffer.length),
        "Content-Disposition": 'attachment; filename="document.pdf"',
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
  }
}
