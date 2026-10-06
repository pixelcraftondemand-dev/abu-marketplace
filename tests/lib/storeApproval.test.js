import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockSendDecision, mockSendReceived } = vi.hoisted(() => ({
  mockSendDecision: vi.fn(),
  mockSendReceived: vi.fn(),
}));

vi.mock("@/lib/services/storeApplicationEmail", async () => {
  const actual = await vi.importActual("@/lib/services/storeApplicationEmail");
  return {
    ...actual,
    sendStoreDecisionEmail: mockSendDecision,
    sendStoreApplicationReceivedEmail: mockSendReceived,
  };
});

vi.mock("@/lib/prisma", () => ({
  default: {
    store: { findUnique: vi.fn(), update: vi.fn() },
  },
}));

import prisma from "@/lib/prisma";
import {
  STORE_STATUS,
  canResubmit,
  normalizeRejectionReason,
  reviewStore,
} from "@/lib/services/storeApproval";
import {
  buildStoreApplicationReceivedEmail,
  buildStoreDecisionEmail,
} from "@/lib/services/storeApplicationEmail";

const REASON = "Contact details are unreachable";

function existingStore(overrides = {}) {
  return {
    id: "store_1",
    name: "Happy Shop",
    username: "happyshop",
    status: STORE_STATUS.PENDING,
    email: "shop@example.com",
    user: { name: "Fouad", email: "owner@example.com" },
    ...overrides,
  };
}

describe("storeApproval", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockSendDecision.mockResolvedValue(true);
    prisma.store.findUnique.mockResolvedValue(existingStore());
    prisma.store.update.mockResolvedValue({});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("status rules", () => {
    it("only lets a rejected application be resubmitted", () => {
      expect(canResubmit(STORE_STATUS.REJECTED)).toBe(true);
      expect(canResubmit(STORE_STATUS.PENDING)).toBe(false);
      expect(canResubmit(STORE_STATUS.APPROVED)).toBe(false);
      expect(canResubmit(null)).toBe(false);
    });

    it("cleans and clamps a rejection reason", () => {
      expect(normalizeRejectionReason("  bad logo  ")).toBe("bad logo");
      expect(normalizeRejectionReason("")).toBeNull();
      expect(normalizeRejectionReason(null)).toBeNull();
      expect(normalizeRejectionReason("x".repeat(600))).toHaveLength(500);
    });
  });

  describe("approve", () => {
    it("activates the store, records the reviewer, and clears any old rejection", async () => {
      prisma.store.findUnique.mockResolvedValue(
        existingStore({ status: STORE_STATUS.REJECTED })
      );

      const result = await reviewStore({
        storeId: "store_1",
        decision: "approve",
        adminUserId: "admin_1",
      });

      expect(result.ok).toBe(true);
      expect(result.status).toBe(STORE_STATUS.APPROVED);
      expect(result.isActive).toBe(true);

      const data = prisma.store.update.mock.calls[0][0].data;
      expect(data).toMatchObject({
        status: STORE_STATUS.APPROVED,
        isActive: true,
        rejectionReason: null,
        reviewedBy: "admin_1",
      });
      expect(data.reviewedAt).toBeInstanceOf(Date);

      // The seller is told, so an approval is never silent.
      expect(mockSendDecision).toHaveBeenCalledTimes(1);
      expect(mockSendDecision.mock.calls[0][0]).toMatchObject({
        storeName: "Happy Shop",
        decision: "approved",
      });
    });

    it("refuses to re-approve an approved store", async () => {
      prisma.store.findUnique.mockResolvedValue(
        existingStore({ status: STORE_STATUS.APPROVED })
      );

      const result = await reviewStore({ storeId: "store_1", decision: "approve" });

      expect(result).toMatchObject({ ok: false, httpStatus: 409 });
      expect(prisma.store.update).not.toHaveBeenCalled();
    });
  });

  describe("reject", () => {
    it("requires a reason, so the seller always knows what to fix", async () => {
      const missing = await reviewStore({ storeId: "store_1", decision: "reject" });
      expect(missing).toMatchObject({ ok: false, httpStatus: 422 });
      expect(missing.error).toMatch(/why/i);

      const tooShort = await reviewStore({
        storeId: "store_1",
        decision: "reject",
        reason: "no",
      });
      expect(tooShort).toMatchObject({ ok: false, httpStatus: 422 });

      expect(prisma.store.update).not.toHaveBeenCalled();
      expect(mockSendDecision).not.toHaveBeenCalled();
    });

    it("deactivates the store, stores the reason, and emails it to the seller", async () => {
      const result = await reviewStore({
        storeId: "store_1",
        decision: "reject",
        reason: REASON,
        adminUserId: "admin_1",
      });

      expect(result.ok).toBe(true);
      expect(result.status).toBe(STORE_STATUS.REJECTED);
      expect(result.isActive).toBe(false);

      expect(prisma.store.update.mock.calls[0][0].data).toMatchObject({
        status: STORE_STATUS.REJECTED,
        isActive: false,
        rejectionReason: REASON,
        reviewedBy: "admin_1",
      });

      expect(mockSendDecision.mock.calls[0][0]).toMatchObject({
        decision: "rejected",
        reason: REASON,
      });
    });
  });

  describe("validation and failure handling", () => {
    it("rejects a missing storeId or unknown decision without touching the DB", async () => {
      await expect(reviewStore({ storeId: "", decision: "approve" })).resolves.toMatchObject({
        ok: false,
        httpStatus: 422,
      });
      await expect(reviewStore({ storeId: "store_1", decision: "maybe" })).resolves.toMatchObject({
        ok: false,
        httpStatus: 422,
      });
      expect(prisma.store.update).not.toHaveBeenCalled();
    });

    it("returns 404 for an unknown store", async () => {
      prisma.store.findUnique.mockResolvedValue(null);
      await expect(reviewStore({ storeId: "nope", decision: "approve" })).resolves.toMatchObject({
        ok: false,
        httpStatus: 404,
      });
    });

    it("still succeeds when the seller email fails", async () => {
      mockSendDecision.mockResolvedValue(false);

      const result = await reviewStore({ storeId: "store_1", decision: "approve" });

      expect(result.ok).toBe(true);
      expect(result.notified).toBe(false);
    });

    it("surfaces a database failure as a 500 instead of throwing", async () => {
      const error = vi.spyOn(console, "error").mockImplementation(() => {});
      try {
        prisma.store.findUnique.mockRejectedValue(new Error("db down"));
        await expect(reviewStore({ storeId: "store_1", decision: "approve" })).resolves.toMatchObject(
          { ok: false, httpStatus: 500 }
        );
      } finally {
        error.mockRestore();
      }
    });
  });
});

describe("store application emails", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://www.abumarketplace.shop");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("tells the team a seller is waiting, with a link to the review queue", () => {
    const mail = buildStoreApplicationReceivedEmail({
      storeName: "Happy Shop",
      username: "happyshop",
      ownerName: "Fouad",
      ownerEmail: "owner@example.com",
      storeEmail: "shop@example.com",
    });

    expect(mail.subject).toBe("[ABU Stores] New application: Happy Shop");
    expect(mail.html).toContain("https://www.abumarketplace.shop/admin/approve");
    expect(mail.html).toContain("https://www.abumarketplace.shop/shop/happyshop");
    expect(mail.text).toContain("Happy Shop");
  });

  it("sends a rejection email with the reason and a resubmit link", () => {
    const mail = buildStoreDecisionEmail({
      storeName: "Happy Shop",
      username: "happyshop",
      storeEmail: "shop@example.com",
      decision: "rejected",
      reason: REASON,
    });

    expect(mail.subject).toMatch(/needs changes/i);
    expect(mail.html).toContain(REASON);
    expect(mail.html).toContain("/create-store");
    expect(mail.text).toContain(REASON);
  });

  it("escapes seller-supplied text in both emails", () => {
    const mail = buildStoreDecisionEmail({
      storeName: '<img src=x onerror="alert(1)">',
      username: "happyshop",
      decision: "rejected",
      reason: '<script>alert(1)</script>',
    });

    expect(mail.html).not.toContain("<script>");
    expect(mail.html).not.toContain('onerror="alert(1)"');
    expect(mail.html).toContain("&lt;script&gt;");
  });
});
