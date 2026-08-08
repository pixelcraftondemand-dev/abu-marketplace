import { beforeEach, describe, expect, it, vi } from "vitest";

import prisma from "@/lib/prisma";
import authSeller from "@/middlewares/authSeller";
import { getSessionFromRequest } from "@/lib/serverAuth";
import { GET as storeOrdersGET } from "@/app/api/store/orders/route";
import { GET as productsGET } from "@/app/api/products/route";
import { GET as productGET } from "@/app/api/products/[productId]/route";

vi.mock("@/middlewares/authSeller", () => ({
  default: vi.fn(),
}));

vi.mock("@/lib/serverAuth", () => ({
  getSessionFromRequest: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    order: { findMany: vi.fn() },
    product: { findMany: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn() },
  },
}));

describe("data minimization (no sensitive data leakage)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    getSessionFromRequest.mockResolvedValue({ user: { id: "usr_seller" } });
    authSeller.mockResolvedValue("st_1");
  });

  it("store/orders: sellers receive only fulfilment fields, never the full user record", async () => {
    prisma.order.findMany.mockResolvedValue([]);
    const res = await storeOrdersGET(new Request("http://localhost:3000/api/store/orders"));
    expect(res.status).toBe(200);
    const findManyArg = prisma.order.findMany.mock.calls[0][0];
    // The include selects only name/email/image for the user — never cart.
    expect(findManyArg.include.user.select).toEqual(
      expect.objectContaining({ id: true, name: true, email: true, image: true })
    );
    expect(findManyArg.include.user.select.cart).toBeUndefined();
    expect(findManyArg.include.user.select.emailVerified).toBeUndefined();
    // Address limited to fulfilment fields.
    expect(findManyArg.include.address.select).not.toHaveProperty("userId");
  });

  it("public products listing: store objects do not expose internal ids/contacts", async () => {
    prisma.product.findMany.mockResolvedValue([]);
    const res = await productsGET(new Request("http://localhost:3000/api/products"));
    expect(res.status).toBe(200);
    const includeStore = prisma.product.findMany.mock.calls[0][0].include.store;
    // Public storefront fields only.
    expect(includeStore.select).toEqual(
      expect.objectContaining({ id: true, name: true, username: true, logo: true, description: true, halalCertified: true })
    );
    expect(includeStore.select.userId).toBeUndefined();
    expect(includeStore.select.email).toBeUndefined();
    expect(includeStore.select.contact).toBeUndefined();
    expect(includeStore.select.address).toBeUndefined();
  });

  it("public product detail: ratings expose review content but never reviewer ids", async () => {
    prisma.product.findFirst.mockResolvedValue({
      id: "p_1",
      mrp: 50,
      price: 40,
      name: "x",
      rating: [
        { rating: 5, review: "great", createdAt: new Date(), user: { name: "A", image: "" } },
      ],
    });
    const res = await productGET(new Request("http://localhost:3000/api/products/p_1"), {
      params: { productId: "p_1" },
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    const ratingSelect = prisma.product.findFirst.mock.calls[0][0].include.rating.select;
    expect(ratingSelect.userId).toBeUndefined();
    expect(ratingSelect.orderId).toBeUndefined();
    expect(json.product.reviewCount).toBe(1);
    expect(json.product.rating).toBe(5);
  });
});
