import { beforeEach, describe, expect, it, vi } from "vitest";

import prisma from "@/lib/prisma";
import { GET as productGET } from "@/app/api/products/[productId]/route";

vi.mock("@/lib/prisma", () => ({
  default: {
    product: { findFirst: vi.fn() },
  },
}));

/**
 * These tests exercise the API boundary that drives the product detail page's
 * two error states:
 *  - 4xx (404/422)  -> the page renders the "Product not found" dead-link
 *                      state with a "Continue shopping" link.
 *  - 5xx / network  -> the page renders the in-page retry panel with a
 *                      "Retry" button.
 */
describe("product detail page error states (API boundary)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns 404 (not-found state) for a well-formed id of a missing product", async () => {
    prisma.product.findFirst.mockResolvedValue(null);

    const res = await productGET(
      new Request("http://localhost:3000/api/products/nonexistent_id_123"),
      { params: { productId: "nonexistent_id_123" } }
    );

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Product not found" });
  });

  it("returns 422 (not-found state) for a malformed product id, without querying", async () => {
    const res = await productGET(
      new Request("http://localhost:3000/api/products/../../etc/passwd"),
      { params: { productId: "../../etc/passwd" } }
    );

    expect(res.status).toBe(422);
    expect(prisma.product.findFirst).not.toHaveBeenCalled();
  });

  it("returns 500 (retry state) when the database query fails", async () => {
    prisma.product.findFirst.mockRejectedValue(new Error("connection refused"));

    const res = await productGET(
      new Request("http://localhost:3000/api/products/p_1"),
      { params: { productId: "p_1" } }
    );

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual(
      expect.objectContaining({ error: "Unable to fetch product." })
    );
  });

  it("returns 200 with a normalized images array on success (no error state)", async () => {
    prisma.product.findFirst.mockResolvedValue({
      id: "p_1",
      name: "Leather Crossbody Bag",
      mrp: 110,
      price: 84,
      // Legacy seed stored a JSON-encoded string inside the Json column.
      images: '["https://img.example/1.jpg"]',
      rating: [
        { rating: 5, review: "great", createdAt: new Date(), user: { name: "A", image: "" } },
      ],
      store: { id: "st_1", name: "ABU Demo Store" },
    });

    const res = await productGET(
      new Request("http://localhost:3000/api/products/p_1"),
      { params: { productId: "p_1" } }
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.product.images).toEqual(["https://img.example/1.jpg"]);
    expect(Array.isArray(json.product.images)).toBe(true);
  });

});
