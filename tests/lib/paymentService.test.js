import { describe, expect, it, vi } from "vitest";
import {
  reserveStock,
  releaseStock,
  transitionPaymentStatus,
  StockUnavailableError,
  toCents,
} from "@/lib/services/paymentService";

function makeDb(overrides = {}) {
  const db = {
    payment: { updateMany: vi.fn(() => ({ count: 1 })) },
    product: { updateMany: vi.fn(() => ({ count: 1 })) },
    ...overrides,
  };
  return db;
}

describe("transitionPaymentStatus", () => {
  it("applies the transition when the row is still in the expected state", async () => {
    const db = makeDb();
    const result = await transitionPaymentStatus(db, "pay_1", "PROCESSING", "SUCCEEDED");
    expect(result).toEqual({ applied: true });
    expect(db.payment.updateMany).toHaveBeenCalledWith({
      where: { id: "pay_1", status: "PROCESSING" },
      data: { status: "SUCCEEDED" },
    });
  });

  it("reports not-applied when the row already moved (optimistic concurrency)", async () => {
    const db = makeDb({ payment: { updateMany: vi.fn(() => ({ count: 0 })) } });
    const result = await transitionPaymentStatus(db, "pay_1", "PROCESSING", "SUCCEEDED");
    expect(result).toEqual({ applied: false });
  });

  it("throws on an invalid transition instead of corrupting state", async () => {
    const db = makeDb();
    await expect(transitionPaymentStatus(db, "pay_1", "FAILED", "SUCCEEDED")).rejects.toThrow(
      /Invalid payment state transition/
    );
    expect(db.payment.updateMany).not.toHaveBeenCalled();
  });
});

describe("reserveStock", () => {
  it("decrements tracked products atomically", async () => {
    const db = makeDb();
    await reserveStock(db, new Map([["prod_1", 2], ["prod_2", 1]]));
    expect(db.product.updateMany).toHaveBeenNthCalledWith(1, {
      where: { id: "prod_1", OR: [{ stock: null }, { stock: { gte: 2 } }] },
      data: { stock: { decrement: 2 } },
    });
    expect(db.product.updateMany).toHaveBeenNthCalledWith(2, {
      where: { id: "prod_2", OR: [{ stock: null }, { stock: { gte: 1 } }] },
      data: { stock: { decrement: 1 } },
    });
  });

  it("throws StockUnavailableError when stock cannot be reserved", async () => {
    const db = makeDb({ product: { updateMany: vi.fn(() => ({ count: 0 })) } });
    await expect(reserveStock(db, new Map([["prod_1", 5]]))).rejects.toBeInstanceOf(StockUnavailableError);
  });
});

describe("releaseStock", () => {
  it("increments product stock back (idempotent)", async () => {
    const db = makeDb();
    await releaseStock(db, [
      { productId: "prod_1", quantity: 2 },
      { id: "prod_2", quantity: 1 },
    ]);
    expect(db.product.updateMany).toHaveBeenCalledWith({
      where: { id: "prod_1" },
      data: { stock: { increment: 2 } },
    });
    expect(db.product.updateMany).toHaveBeenCalledWith({
      where: { id: "prod_2" },
      data: { stock: { increment: 1 } },
    });
  });

  it("skips malformed items", async () => {
    const db = makeDb();
    await releaseStock(db, [{ productId: "prod_1", quantity: 0 }, { productId: null, quantity: 1 }]);
    expect(db.product.updateMany).not.toHaveBeenCalled();
  });
});

describe("toCents", () => {
  it("converts canonical USD amounts to cents", () => {
    expect(toCents(25)).toBe(2500);
    expect(toCents(0.5)).toBe(50);
    expect(toCents(10.99)).toBe(1099);
  });
});
