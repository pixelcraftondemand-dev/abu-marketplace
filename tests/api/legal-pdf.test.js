import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { pdfRateLimiter } from "@/lib/security";
import { POST } from "@/app/api/legal/pdf/route";

vi.mock("puppeteer", () => ({
  default: {
    launch: vi.fn(async () => ({
      newPage: async () => ({
        goto: async () => {},
        pdf: async () => Buffer.from("%PDF-1.4 fake"),
      }),
      close: async () => {},
    })),
  },
}));

function buildRequest(url) {
  return new Request("http://localhost:3000/api/legal/pdf", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ url }),
  });
}

describe("POST /api/legal/pdf (SSRF guard)", () => {
  beforeEach(() => {
    pdfRateLimiter._clear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("renders the marketplace's own public pages", async () => {
    const res = await POST(buildRequest("https://abumarketplace.shop/terms"));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/pdf");
  });

  it("rejects internal/cloud-metadata URLs (SSRF)", async () => {
    for (const url of [
      "http://169.254.169.254/latest/meta-data/",
      "http://127.0.0.1:3000/admin",
      "http://localhost:3000/api/admin/dashboard",
      "http://10.0.0.1/",
      "http://metadata.google.internal/",
      "file:///etc/passwd",
      "ftp://abumarketplace.shop/terms",
    ]) {
      const res = await POST(buildRequest(url));
      expect(res.status).toBe(403);
      expect((await res.json()).error).toBe("URL is not allowed.");
    }
  });

  it("rejects arbitrary external domains", async () => {
    const res = await POST(buildRequest("https://evil.example.com/steal"));
    expect(res.status).toBe(403);
  });

  it("rejects non-string / oversized URLs", async () => {
    expect((await POST(buildRequest(123))).status).toBe(400);
    expect((await POST(buildRequest("x".repeat(3000)))).status).toBe(403);
  });

  it("honors NEXT_PUBLIC_APP_URL as an allowed origin", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://app.abumarketplace.shop");
    const res = await POST(buildRequest("https://app.abumarketplace.shop/privacy"));
    expect(res.status).toBe(200);
  });

  it("rate limits PDF generation to prevent resource abuse", async () => {
    let last;
    for (let i = 0; i < 11; i++) {
      last = await POST(buildRequest("https://abumarketplace.shop/terms"));
    }
    expect(last.status).toBe(429);
  });
});
