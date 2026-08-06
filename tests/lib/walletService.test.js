import { describe, expect, it, vi } from "vitest";

import {
  WalletInsufficientFundsError,
  creditWallet,
  debitWallet,
  getOrCreateWallet,
  roundMoney,
} from "@/lib/services/walletService";

function makeDb({ balance = 0 } = {}) {
  const wallet = { id: "w_1", userId: "usr_1", balance };
  const db = {
    wallet: {
      findUnique: vi.fn().mockResolvedValue(wallet),
      create: vi.fn(),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    walletTransaction: {
      create: vi.fn().mockResolvedValue({ id: "tx_1" }),
    },
  };
  db.$transaction = vi.fn(async (fn) => fn(db));
  return db;
}

describe("walletService", () => {
  it("rounds money to cents", () => {
    expect(roundMoney(10.005)).toBe(10.01);
    expect(roundMoney(0.1 + 0.2)).toBe(0.3);
  });

  describe("getOrCreateWallet", () => {
    it("returns the existing wallet", async () => {
      const db = makeDb();
      expect(await getOrCreateWallet(db, "usr_1")).toMatchObject({ id: "w_1" });
    });

    it("creates a wallet on first use and survives a concurrent-create race", async () => {
      const db = makeDb();
      db.wallet.findUnique.mockResolvedValueOnce(null);
      db.wallet.create.mockRejectedValueOnce({ code: "P2002" }); // another request won
      const wallet = await getOrCreateWallet(db, "usr_1");
      expect(wallet.id).toBe("w_1");
      expect(db.wallet.findUnique).toHaveBeenCalledTimes(2);
    });
  });

  describe("creditWallet (top-up)", () => {
    it("records a TOPUP ledger row and increments the balance", async () => {
      const db = makeDb({ balance: 0 });
      const result = await creditWallet(db, "usr_1", 25, {
        referenceId: "pay_1",
        referenceType: "payment",
      });

      expect(result).toMatchObject({ balance: 25, alreadyApplied: false });
      expect(db.walletTransaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: "TOPUP",
          amount: 25,
          balanceAfter: 25,
          referenceId: "pay_1",
          referenceType: "payment",
        }),
      });
      expect(db.wallet.updateMany).toHaveBeenCalledWith({
        where: { id: "w_1" },
        data: { balance: { increment: 25 } },
      });
    });

    it("is idempotent: a duplicate ledger reference never double-credits", async () => {
      const db = makeDb({ balance: 25 });
      db.walletTransaction.create.mockRejectedValueOnce({ code: "P2002" });

      const result = await creditWallet(db, "usr_1", 25, {
        referenceId: "pay_1",
        referenceType: "payment",
      });

      expect(result.alreadyApplied).toBe(true);
      expect(result.balance).toBe(50); // reported view, but balance NOT incremented
      expect(db.wallet.updateMany).not.toHaveBeenCalled();
    });

    it("rejects non-positive credits", async () => {
      const db = makeDb();
      await expect(creditWallet(db, "usr_1", 0)).rejects.toThrow("must be positive");
      await expect(creditWallet(db, "usr_1", -5)).rejects.toThrow("must be positive");
    });
  });

  describe("debitWallet (checkout payment)", () => {
    it("debits the balance and records a PAYMENT ledger row", async () => {
      const db = makeDb({ balance: 50 });
      const result = await debitWallet(db, "usr_1", 30, {
        referenceId: "pay_1",
        referenceType: "order",
      });

      expect(result).toEqual({ balance: 20 });
      expect(db.wallet.updateMany).toHaveBeenCalledWith({
        where: { id: "w_1", balance: { gte: 30 } },
        data: { balance: { decrement: 30 } },
      });
      expect(db.walletTransaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ type: "PAYMENT", amount: -30, balanceAfter: 20 }),
      });
    });

    it("throws when the balance cannot cover the debit (no negative balances)", async () => {
      const db = makeDb({ balance: 10 });
      db.wallet.updateMany.mockResolvedValueOnce({ count: 0 }); // guard fails
      await expect(debitWallet(db, "usr_1", 30)).rejects.toBeInstanceOf(
        WalletInsufficientFundsError
      );
      expect(db.walletTransaction.create).not.toHaveBeenCalled();
    });

    it("throws when the wallet does not exist", async () => {
      const db = makeDb();
      db.wallet.findUnique.mockResolvedValueOnce(null);
      await expect(debitWallet(db, "usr_1", 5)).rejects.toBeInstanceOf(
        WalletInsufficientFundsError
      );
    });
  });
});
