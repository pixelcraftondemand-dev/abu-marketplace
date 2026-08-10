import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import prisma from "@/lib/prisma";
import {
  addressRateLimiter,
  cartRateLimiter,
  couponRateLimiter,
  exchangeRateLimiter,
  storeActionRateLimiter,
  storeProductRateLimiter,
} from "@/lib/security";
import { getSessionFromRequest } from "@/lib/serverAuth";
import authSeller from "@/middlewares/authSeller";
import { POST as cartPOST } from "@/app/api/cart/route";
import { POST as couponPOST } from "@/app/api/coupon/route";
import { GET as exchangeGET } from "@/app/api/exchange/route";
import { POST as storeOrdersPOST } from "@/app/api/store/orders/route";
import { POST as storeProductPOST } from "@/app/api/store/product/route";
import { POST as addressPOST } from "@/app/api/address/route";

vi.mock("@/middlewares/authSeller", () => ({ default: vi.fn() }));
vi.mock("@/lib/serverAuth", () => ({ getSessionFromRequest: vi.fn() }));

vi.mock("@/lib/prisma", () => ({
  default: {
    user: { update: vi.fn(), findUnique: vi.fn() },
    coupon: { findUnique: vi.fn() },
    order: { findFirst: vi.fn(), update: vi.fn() },
    product: { findMany: vi.fn(), create: vi.fn() },
    address: { create: vi.fn(), findMany: vi.fn() },
  },
}));

vi.mock("@/lib/services/exchangeRateService", () => ({
  getExchangeRates: vi.fn().mockResolvedValue({ base: "USD", rates: {}, stale: false }),
}));

function buildJSON(url, body, method = "POST") {
  return new Request(url, {
    method,
    headers: { "content-type": "application/json" },
    body: method === "GET" ? undefined : JSON.stringify(body),
  });
}

const LIMITERS = [
  cartRateLimiter,
  couponRateLimiter,
  exchangeRateLimiter,
  storeActionRateLimiter,
  storeProductRateLimiter,
  addressRateLimiter,
];

describe("newly rate-limited endpoints return 429 beyond their limit", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    for (const l of LIMITERS) l._clear();
    getSessionFromRequest.mockResolvedValue({ user: { id: "usr_1" } });
    authSeller.mockResolvedValue("st_1");
    prisma.user.update.mockResolvedValue({});
    prisma.coupon.findUnique.mockResolvedValue({
      code: "SAVE10",
      discount: 10,
      forNewUser: false,
      expiresAt: new Date(Date.now() + 86_400_000),
    });
    prisma.order.findFirst.mockResolvedValue({ id: "o_1", status: "ORDER_PLACED" });
    prisma.order.update.mockResolvedValue({});
  });

  afterEach(() => {
    for (const l of LIMITERS) l._clear();
  });

  it("POST /api/cart — allows up to 60 then blocks", async () => {
    let last;
    for (let i = 0; i < 61; i++) {
      last = await cartPOST(buildJSON("http://localhost:3000/api/cart", { cart: { p_1: 1 } }));
    }
    expect(last.status).toBe(429);
  });

  it("POST /api/coupon — allows up to 30 then blocks (brute-force guard)", async () => {
    let last;
    for (let i = 0; i < 31; i++) {
      last = await couponPOST(buildJSON("http://localhost:3000/api/coupon", { code: "SAVE10" }));
    }
    expect(last.status).toBe(429);
  });

  it("GET /api/exchange — allows up to 60 per IP then blocks (upstream API guard)", async () => {
    const { getExchangeRates } = await import("@/lib/services/exchangeRateService");
    getExchangeRates.mockResolvedValue({ base: "USD", rates: {}, stale: false });
    let last;
    const req = new Request("http://localhost:3000/api/exchange", {
      headers: { "x-forwarded-for": "203.0.113.7" },
    });
    for (let i = 0; i < 61; i++) {
      last = await exchangeGET(req);
    }
    expect(last.status).toBe(429);
  });

  it("POST /api/store/orders — allows up to 60 seller actions then blocks", async () => {
    let last;
    for (let i = 0; i < 61; i++) {
      last = await storeOrdersPOST(
        buildJSON("http://localhost:3000/api/store/orders", { orderId: "o_1", status: "PROCESSING" })
      );
    }
    expect(last.status).toBe(429);
  });

  it("POST /api/store/product — allows up to 20 product creations then blocks", async () => {
    // ImageKit upload is mocked away via the config — the limiter runs before it.
    let last;
    const form = new FormData();
    form.set("name", "Test Product");
    form.set("description", "A product used only to exercise the rate limiter.");
    form.set("mrp", "100");
    form.set("price", "90");
    form.set("category", "test");
    for (let i = 0; i < 21; i++) {
      last = await storeProductPOST(new Request("http://localhost:3000/api/store/product", { method: "POST", body: form }));
    }
    expect(last.status).toBe(429);
  });

  it("POST /api/address — allows up to 30 then blocks", async () => {
    let last;
    const address = {
      name: "A Buyer",
      email: "buyer@example.com",
      street: "1 Main St",
      city: "Freetown",
      state: "West",
      zip: "00000",
      country: "SL",
      phone: "+232 00 000 000",
    };
    for (let i = 0; i < 31; i++) {
      last = await addressPOST(buildJSON("http://localhost:3000/api/address", { address }));
    }
    expect(last.status).toBe(429);
  });
});
