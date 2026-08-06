import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockCreateFunction } = vi.hoisted(() => ({ mockCreateFunction: vi.fn() }));

vi.mock("@/inngest/client", () => ({
  inngest: { createFunction: mockCreateFunction },
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    user: { create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    coupon: { delete: vi.fn() },
  },
}));

vi.mock("@/lib/services/verificationService", () => ({
  issueVerificationEmail: vi.fn(),
}));

import prisma from "@/lib/prisma";
import { issueVerificationEmail } from "@/lib/services/verificationService";

// Import AFTER mocks are registered. The handler is captured ONCE at import
// time (createFunction runs at module load) — never re-read the mock call
// history inside tests, since beforeEach's resetAllMocks clears it.
const { syncUserCreation } = await import("@/inngest/functions.js");

const registrationHandler = mockCreateFunction.mock.calls[0][2];

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
