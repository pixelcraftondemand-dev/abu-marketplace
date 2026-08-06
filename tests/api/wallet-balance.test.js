import { beforeEach, describe, expect, it, vi } from "vitest";

import prisma from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/serverAuth";
import { GET as getBalance } from "@/app/api/wallet/balance/route";
import { GET as getTransactions } from "@/app/api/wallet/transactions/route";

vi.mock("@/lib/serverAuth", () => ({
  getSessionFromRequest: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    wallet: { findUnique: vi.fn() },
    walletTransaction: { findMany: vi.fn() },
  },
}));

function buildRequest(path) {
  return new Request(`http://localhost:3000${path}`);
}

describe("wallet balance + transactions", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    getSessionFromRequest.mockResolvedValue({ user: { id: "usr_1" } });
  });

  describe("GET /api/wallet/balance", () => {
    it("returns 401 when not authenticated", async () => {
      getSessionFromRequest.mockResolvedValue(null);
      const res = await getBalance(buildRequest("/api/wallet/balance"));
      expect(res.status).toBe(401);
    });

    it("returns the canonical USD balance", async () => {
      prisma.wallet.findUnique.mockResolvedValue({ balance: 42.5 });
      const res = await getBalance(buildRequest("/api/wallet/balance"));
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ balance: 42.5, currency: "USD" });
      expect(prisma.wallet.findUnique).toHaveBeenCalledWith({
        where: { userId: "usr_1" },
        select: { balance: true },
      });
    });

    it("returns zero for a user without a wallet (never throws)", async () => {
      prisma.wallet.findUnique.mockResolvedValue(null);
      const res = await getBalance(buildRequest("/api/wallet/balance"));
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ balance: 0, currency: "USD" });
    });
  });

  describe("GET /api/wallet/transactions", () => {
    it("returns 401 when not authenticated", async () => {
      getSessionFromRequest.mockResolvedValue(null);
      const res = await getTransactions(buildRequest("/api/wallet/transactions"));
      expect(res.status).toBe(401);
    });

    it("returns an empty list when the user has no wallet", async () => {
      prisma.wallet.findUnique.mockResolvedValue(null);
      const res = await getTransactions(buildRequest("/api/wallet/transactions?limit=5"));
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ transactions: [] });
    });

    it("returns the user's ledger newest-first with the requested limit", async () => {
      prisma.wallet.findUnique.mockResolvedValue({ id: "w_1" });
      prisma.walletTransaction.findMany.mockResolvedValue([
        { id: "tx_1", type: "TOPUP", amount: 25, balanceAfter: 25 },
      ]);
      const res = await getTransactions(buildRequest("/api/wallet/transactions?limit=5"));
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({
        transactions: [{ id: "tx_1", type: "TOPUP", amount: 25, balanceAfter: 25 }],
      });
      expect(prisma.walletTransaction.findMany).toHaveBeenCalledWith({
        where: { walletId: "w_1" },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: expect.objectContaining({ id: true, type: true, amount: true }),
      });
    });

    it("clamps the limit to a safe range", async () => {
      prisma.wallet.findUnique.mockResolvedValue({ id: "w_1" });
      prisma.walletTransaction.findMany.mockResolvedValue([]);
      await getTransactions(buildRequest("/api/wallet/transactions?limit=9999"));
      expect(prisma.walletTransaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 50 })
      );
    });
  });
});
