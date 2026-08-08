import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import prisma from "@/lib/prisma";
import { adminSupportReplyRateLimiter, ratingRateLimiter } from "@/lib/security";
import { getSessionFromRequest } from "@/lib/serverAuth";
import authAdmin from "@/middlewares/authAdmin";
import authSeller from "@/middlewares/authSeller";
import { GET as productGET } from "@/app/api/products/[productId]/route";
import { POST as storeOrdersPOST } from "@/app/api/store/orders/route";
import { POST as couponPOST } from "@/app/api/coupon/route";
import { POST as ratingPOST } from "@/app/api/rating/route";
import { POST as supportReplyPOST } from "@/app/api/admin/support-reply/route";

vi.mock("@/middlewares/authAdmin", () => ({ default: vi.fn() }));
vi.mock("@/middlewares/authSeller", () => ({ default: vi.fn() }));
vi.mock("@/lib/serverAuth", () => ({ getSessionFromRequest: vi.fn() }));

vi.mock("@/lib/prisma", () => ({
  default: {
    product: { findUnique: vi.fn(), findFirst: vi.fn() },
    order: { findFirst: vi.fn(), update: vi.fn() },
    coupon: { findUnique: vi.fn() },
    rating: { create: vi.fn() },
    supportTicket: { findUnique: vi.fn() },
    supportMessage: { create: vi.fn() },
  },
}));

function buildJSON(url, body, headers = {}) {
  return new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

describe("security hardening", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    adminSupportReplyRateLimiter._clear();
    ratingRateLimiter._clear();
    getSessionFromRequest.mockResolvedValue({ user: { id: "usr_1" } });
    authAdmin.mockResolvedValue(true);
    authSeller.mockResolvedValue("st_1");
  });

  afterEach(() => {
    adminSupportReplyRateLimiter._clear();
    ratingRateLimiter._clear();
  });

  describe("product detail: public catalog only", () => {
    it("rejects malformed product ids before querying", async () => {
      const res = await productGET(new Request("http://localhost:3000/api/products/../../etc"), {
        params: { productId: "../../etc" },
      });
      expect(res.status).toBe(422);
      expect(prisma.product.findFirst).not.toHaveBeenCalled();
    });

    it("only serves in-stock products from active approved stores", async () => {
      prisma.product.findFirst.mockResolvedValue({ id: "p_1", mrp: 50, price: 40, rating: [] });
      const res = await productGET(new Request("http://localhost:3000/api/products/p_1"), {
        params: { productId: "p_1" },
      });
      expect(res.status).toBe(200);
      const where = prisma.product.findFirst.mock.calls[0][0].where;
      expect(where.inStock).toBe(true);
      expect(where.store).toEqual({ is: { isActive: true, status: "approved" } });
    });
  });

  describe("store orders: forward-only status transitions", () => {
    it("rejects a regression (DELIVERED -> ORDER_PLACED)", async () => {
      prisma.order.findFirst.mockResolvedValue({ id: "o_1", status: "DELIVERED" });
      const res = await storeOrdersPOST(
        buildJSON("http://localhost:3000/api/store/orders", { orderId: "o_1", status: "ORDER_PLACED" })
      );
      expect(res.status).toBe(422);
      expect(await res.json()).toEqual({ error: "Order status cannot move backwards." });
      expect(prisma.order.update).not.toHaveBeenCalled();
    });

    it("allows advancing the status (PROCESSING -> SHIPPED)", async () => {
      prisma.order.findFirst.mockResolvedValue({ id: "o_1", status: "PROCESSING" });
      const res = await storeOrdersPOST(
        buildJSON("http://localhost:3000/api/store/orders", { orderId: "o_1", status: "SHIPPED" })
      );
      expect(res.status).toBe(200);
      expect(prisma.order.update).toHaveBeenCalledWith(
        { where: { id: "o_1" }, data: { status: "SHIPPED" } }
      );
    });

    it("treats an unknown order as not found (never cross-store access)", async () => {
      prisma.order.findFirst.mockResolvedValue(null);
      const res = await storeOrdersPOST(
        buildJSON("http://localhost:3000/api/store/orders", { orderId: "o_other", status: "PROCESSING" })
      );
      expect(res.status).toBe(404);
    });
  });

  describe("coupon validation: response minimization", () => {
    it("never returns internal counters or audit fields", async () => {
      prisma.coupon.findUnique.mockResolvedValue({
        code: "SAVE10",
        description: "Ten percent off",
        discount: 10,
        forNewUser: false,
        forMember: false,
        isPublic: true,
        usageCount: 99,
        maxUses: 100,
        expiresAt: new Date(Date.now() + 86_400_000),
        createdAt: new Date(),
      });
      const res = await couponPOST(
        buildJSON("http://localhost:3000/api/coupon", { code: "save10" })
      );
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.coupon).toEqual({
        code: "SAVE10",
        discount: 10,
        forNewUser: false,
        expiresAt: expect.any(String), // ISO date string over JSON
      });
      expect(json.coupon.usageCount).toBeUndefined();
      expect(json.coupon.maxUses).toBeUndefined();
      expect(json.coupon.isPublic).toBeUndefined();
    });
  });

  describe("ratings: atomic duplicate prevention + validation", () => {
    it("maps a concurrent duplicate insert (P2002) to 'already rated'", async () => {
      prisma.order.findFirst.mockResolvedValue({ id: "o_1" });
      prisma.rating.create.mockRejectedValue({ code: "P2002" });
      const res = await ratingPOST(
        buildJSON("http://localhost:3000/api/rating", {
          orderId: "o_1",
          productId: "p_1",
          rating: 5,
          review: "great",
        })
      );
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: "Product already rated" });
    });

    it("rejects invalid ids", async () => {
      const res = await ratingPOST(
        buildJSON("http://localhost:3000/api/rating", {
          orderId: "../../x",
          productId: "p_1",
          rating: 5,
          review: "great",
        })
      );
      expect(res.status).toBe(422);
      expect(prisma.order.findFirst).not.toHaveBeenCalled();
    });
  });

  describe("admin support reply: validation + rate limit", () => {
    it("rejects oversized replies", async () => {
      const res = await supportReplyPOST(
        buildJSON("http://localhost:3000/api/admin/support-reply", {
          ticketId: "t_12345",
          reply: "x".repeat(4001),
        })
      );
      expect(res.status).toBe(422);
      expect(prisma.supportMessage.create).not.toHaveBeenCalled();
    });

    it("rejects malformed ticket ids", async () => {
      const res = await supportReplyPOST(
        buildJSON("http://localhost:3000/api/admin/support-reply", {
          ticketId: "../../etc/passwd",
          reply: "hello",
        })
      );
      expect(res.status).toBe(422);
    });

    it("returns 404 when the ticket does not exist", async () => {
      prisma.supportTicket.findUnique.mockResolvedValue(null);
      const res = await supportReplyPOST(
        buildJSON("http://localhost:3000/api/admin/support-reply", {
          ticketId: "t_nope",
          reply: "hello",
        })
      );
      expect(res.status).toBe(404);
      expect(prisma.supportMessage.create).not.toHaveBeenCalled();
    });

    it("rate limits admin replies", async () => {
      prisma.supportTicket.findUnique.mockResolvedValue({ id: "t_12345" });
      let last;
      for (let i = 0; i < 31; i++) {
        last = await supportReplyPOST(
          buildJSON("http://localhost:3000/api/admin/support-reply", {
            ticketId: "t_12345",
            reply: `reply ${i}`,
          })
        );
      }
      expect(last.status).toBe(429);
    });
  });
});
