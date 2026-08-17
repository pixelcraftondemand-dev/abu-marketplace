import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  default: {
    product: { findMany: vi.fn() },
    store: { findMany: vi.fn() },
  },
}));

import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import prisma from "@/lib/prisma";

// Both files must derive their base URL from NEXT_PUBLIC_APP_URL (not a
// hardcoded domain), so they follow the deployment (local/preview/prod).
const BASE = "https://app.abumarketplace.shop";

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_APP_URL", BASE);
});

describe("robots.txt", () => {
  it("allows crawling and references the sitemap", () => {
    const config = robots();
    const rule = config.rules[0];
    expect(rule.userAgent).toBe("*");
    expect(rule.allow).toBe("/");
    expect(config.sitemap).toBe(`${BASE}/sitemap.xml`);
  });

  it("blocks app-only and auth routes from crawling", () => {
    const disallow = robots().rules[0].disallow;
    for (const path of ["/api/", "/admin/", "/store/", "/sign-in", "/sign-up", "/cart", "/wallet"]) {
      expect(disallow).toContain(path);
    }
    // Localized app pages are blocked via the wildcard variants too.
    for (const path of ["/*/cart", "/*/wallet", "/*/verify-email", "/*/create-store", "/*/loading"]) {
      expect(disallow).toContain(path);
    }
  });
});

describe("sitemap.xml", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("emits every locale for every static route plus products and stores", async () => {
    prisma.product.findMany.mockResolvedValue([
      { id: "prod_1", updatedAt: new Date("2026-08-01T00:00:00Z") },
    ]);
    prisma.store.findMany.mockResolvedValue([
      { username: "happyshop", updatedAt: new Date("2026-08-02T00:00:00Z") },
    ]);

    const entries = await sitemap();
    const locales = ["en", "fr", "pt", "kri", "ha", "yo", "ig", "wo", "ff", "ak"];

    for (const locale of locales) {
      expect(entries.some((e) => e.url === `${BASE}/${locale}`)).toBe(true);
      expect(entries.some((e) => e.url === `${BASE}/${locale}/shop`)).toBe(true);
      expect(entries.some((e) => e.url === `${BASE}/${locale}/services`)).toBe(true);
      expect(entries.some((e) => e.url === `${BASE}/${locale}/product/prod_1`)).toBe(true);
      expect(entries.some((e) => e.url === `${BASE}/${locale}/shop/happyshop`)).toBe(true);
    }

    // Home entries carry the highest priority; dynamic entries keep updatedAt.
    const home = entries.find((e) => e.url === `${BASE}/en`);
    expect(home.priority).toBe(1);
    const product = entries.find((e) => e.url === `${BASE}/en/product/prod_1`);
    expect(product.lastModified).toBeInstanceOf(Date);
  });

  it("still returns the static routes when the database is unavailable", async () => {
    prisma.product.findMany.mockRejectedValue(new Error("db down"));
    prisma.store.findMany.mockRejectedValue(new Error("db down"));

    const entries = await sitemap();
    expect(entries.length).toBeGreaterThan(0);
    expect(entries.some((e) => e.url === `${BASE}/fr/services`)).toBe(true);
    // No product/store URLs when the DB failed.
    expect(entries.some((e) => e.url.includes("/product/"))).toBe(false);
  });
});
