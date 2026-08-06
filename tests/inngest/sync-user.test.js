import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockCreateFunction } = vi.hoisted(() => ({ mockCreateFunction: vi.fn() }));

vi.mock("@/inngest/client", () => ({
  inngest: { createFunction: mockCreateFunction },
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    user: { create: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    store: { updateMany: vi.fn() },
    coupon: { delete: vi.fn() },
  },
}));

vi.mock("@/lib/services/verificationService", () => ({
  issueVerificationEmail: vi.fn(),
}));

vi.mock("@/lib/retention", () => ({
  getDataRetentionUntil: vi.fn(() => new Date("2031-08-06T00:00:00.000Z")),
}));

import prisma from "@/lib/prisma";
import { issueVerificationEmail } from "@/lib/services/verificationService";

// Import AFTER mocks are registered. The handlers are captured ONCE at import
// time (createFunction runs at module load) — never re-read the mock call
// history inside tests, since beforeEach's resetAllMocks clears it.
const { syncUserCreation, syncUserDeletion } = await import("@/inngest/functions.js");

const registrationHandler = mockCreateFunction.mock.calls[0][2];
const deletionHandler = mockCreateFunction.mock.calls.find(
  (call) => call[1]?.event === "clerk/user.deleted"
)?.[2];

describe("account closure (clerk/user.deleted) → syncUserDeletion", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("soft-deletes the account with a retention deadline instead of hard-deleting", async () => {
    await deletionHandler({ event: { data: { id: "usr_1" } } });

    expect(prisma.user.delete).toBeUndefined(); // hard delete must never be called
    expect(prisma.user.updateMany).toHaveBeenCalledWith({
      where: { id: "usr_1" },
      data: expect.objectContaining({
        deletedAt: expect.any(Date),
        dataRetentionUntil: expect.any(Date),
      }),
    });
  });

  it("deactivates the seller storefront while keeping its records", async () => {
    await deletionHandler({ event: { data: { id: "usr_1" } } });

    expect(prisma.store.updateMany).toHaveBeenCalledWith({
      where: { userId: "usr_1" },
      data: { isActive: false },
    });
  });

  it("is idempotent and tolerant of a missing user row", async () => {
    prisma.user.updateMany.mockResolvedValue({ count: 0 });
    await expect(deletionHandler({ event: { data: { id: "usr_missing" } } })).resolves.not.toThrow();
    expect(prisma.user.updateMany).toHaveBeenCalledTimes(1);
  });
});

describe("registration (clerk/user.created) → syncUserCreation", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("creates the account unverified and triggers the verification email", async () => {
    prisma.user.create.mockResolvedValue({});
    issueVerificationEmail.mockResolvedValue({ sent: true });

    await registrationHandler({
      event: {
        data: {
          id: "usr_1",
          first_name: "Amina",
          last_name: "Kargbo",
          image_url: "https://img.clerk.com/x",
          email_addresses: [{ email_address: "amina@example.com" }],
        },
      },
    });

    // User starts with emailVerified defaulting to false — never trusted from the client.
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        id: "usr_1",
        email: "amina@example.com",
        name: "Amina Kargbo",
        image: "https://img.clerk.com/x",
      },
    });
    expect(issueVerificationEmail).toHaveBeenCalledWith("usr_1");
  });

  it("a verification-email failure never breaks account creation", async () => {
    prisma.user.create.mockResolvedValue({});
    issueVerificationEmail.mockRejectedValue(new Error("resend down"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      await registrationHandler({
        event: { data: { id: "usr_2", first_name: "B", last_name: "C", image_url: "", email_addresses: [{ email_address: "b@example.com" }] } },
      });
      // Account still created; the email failure is swallowed + logged.
      expect(prisma.user.create).toHaveBeenCalledTimes(1);
    } finally {
      spy.mockRestore();
    }
  });
});
