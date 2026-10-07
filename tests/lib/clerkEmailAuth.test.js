import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  clerkClient: vi.fn(),
  getUserList: vi.fn(),
  createUser: vi.fn(),
  getUser: vi.fn(),
  updateEmailAddress: vi.fn(),
  createSignInToken: vi.fn(),
  userFindUnique: vi.fn(),
  userUpsert: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({
  clerkClient: mocks.clerkClient,
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    user: {
      findUnique: mocks.userFindUnique,
      upsert: mocks.userUpsert,
    },
  },
}));

import { createEmailSignInTicket } from "@/lib/services/clerkEmailAuth";

function configureClient() {
  mocks.clerkClient.mockResolvedValue({
    users: {
      getUserList: mocks.getUserList,
      createUser: mocks.createUser,
      getUser: mocks.getUser,
    },
    emailAddresses: { updateEmailAddress: mocks.updateEmailAddress },
    signInTokens: { createSignInToken: mocks.createSignInToken },
  });
}

describe("Clerk email OTP authentication", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    configureClient();
    mocks.getUserList.mockResolvedValue({ data: [] });
    mocks.createUser.mockResolvedValue({ id: "user_123" });
    mocks.getUser.mockResolvedValue({
      firstName: "Buyer",
      lastName: "Example",
      imageUrl: "https://img.example/avatar.png",
      emailAddresses: [
        {
          id: "email_123",
          emailAddress: "buyer@example.com",
          verification: { status: "unverified" },
        },
      ],
    });
    mocks.updateEmailAddress.mockResolvedValue({});
    mocks.createSignInToken.mockResolvedValue({ token: "opaque-ticket" });
    mocks.userFindUnique.mockResolvedValue(null);
    mocks.userUpsert.mockResolvedValue({});
  });

  it("creates passwordless users only after verified sign-up codes", async () => {
    const result = await createEmailSignInTicket("buyer@example.com", "signUp");

    expect(result).toEqual({ ok: true, ticket: "opaque-ticket" });
    expect(mocks.createUser).toHaveBeenCalledWith({
      emailAddress: ["buyer@example.com"],
      skipPasswordRequirement: true,
    });
    expect(mocks.updateEmailAddress).toHaveBeenCalledWith("email_123", {
      verified: true,
    });
    expect(mocks.userUpsert).toHaveBeenCalledWith({
      where: { id: "user_123" },
      create: {
        id: "user_123",
        name: "Buyer Example",
        email: "buyer@example.com",
        image: "https://img.example/avatar.png",
        cart: {},
        emailVerified: true,
      },
      update: { email: "buyer@example.com", emailVerified: true },
    });
    expect(mocks.createSignInToken).toHaveBeenCalledWith({
      userId: "user_123",
      expiresInSeconds: 120,
    });
  });

  it("does not create an account in sign-in mode", async () => {
    const result = await createEmailSignInTicket("buyer@example.com", "signIn");

    expect(result).toEqual({ ok: false, reason: "account_not_found" });
    expect(mocks.createUser).not.toHaveBeenCalled();
    expect(mocks.createSignInToken).not.toHaveBeenCalled();
    expect(mocks.userUpsert).not.toHaveBeenCalled();
  });

  it("does not duplicate an existing account in sign-up mode", async () => {
    mocks.getUserList.mockResolvedValue({ data: [{ id: "existing_user" }] });

    const result = await createEmailSignInTicket("buyer@example.com", "signUp");

    expect(result).toEqual({ ok: false, reason: "account_exists" });
    expect(mocks.createUser).not.toHaveBeenCalled();
    expect(mocks.createSignInToken).not.toHaveBeenCalled();
    expect(mocks.userUpsert).not.toHaveBeenCalled();
  });

  it("resolves an account created concurrently during sign-up", async () => {
    mocks.createUser.mockRejectedValue(new Error("duplicate email"));
    mocks.getUserList
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValueOnce({ data: [{ id: "concurrent_user" }] });

    const result = await createEmailSignInTicket("buyer@example.com", "signUp");

    expect(result).toEqual({ ok: true, ticket: "opaque-ticket" });
    expect(mocks.getUser).toHaveBeenCalledWith("concurrent_user");
    expect(mocks.createSignInToken).toHaveBeenCalledWith({
      userId: "concurrent_user",
      expiresInSeconds: 120,
    });
    expect(mocks.userUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "concurrent_user" } })
    );
  });

  it("does not create a session for a soft-deleted account", async () => {
    mocks.getUserList.mockResolvedValue({ data: [{ id: "deleted_user" }] });
    mocks.userFindUnique.mockResolvedValue({ deletedAt: new Date() });

    const result = await createEmailSignInTicket("buyer@example.com", "signIn");

    expect(result).toEqual({ ok: false, reason: "account_disabled" });
    expect(mocks.userUpsert).not.toHaveBeenCalled();
    expect(mocks.createSignInToken).not.toHaveBeenCalled();
  });
});
