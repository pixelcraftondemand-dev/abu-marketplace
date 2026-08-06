import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import prisma from "@/lib/prisma";
import { sendOrderConfirmation } from "@/lib/orderEmail";

const { mockSend } = vi.hoisted(() => ({ mockSend: vi.fn() }));

vi.mock("@/lib/resend", () => ({
  resend: { emails: { send: mockSend } },
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    user: { findUnique: vi.fn() },
    order: { findMany: vi.fn() },
  },
}));

const user = { email: "buyer@example.com", name: "Buyer" };

const orders = [
  {
    id: "ord_1234567890",
    total: 100,
    store: { name: "Halal Foods" },
    orderItems: [{ product: { name: "Zamzam Water" }, quantity: 2, price: 40 }],
  },
];

describe("sendOrderConfirmation", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("skips sending when the user has no email", async () => {
    prisma.user.findUnique.mockResolvedValue({ email: null, name: "Buyer" });
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      await sendOrderConfirmation("usr_1", ["ord_1"]);
    } finally {
      spy.mockRestore();
    }
    expect(prisma.order.findMany).not.toHaveBeenCalled();
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("skips sending when no matching orders are found", async () => {
    prisma.user.findUnique.mockResolvedValue(user);
    prisma.order.findMany.mockResolvedValue([]);
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      await sendOrderConfirmation("usr_1", ["ord_1"]);
    } finally {
      spy.mockRestore();
    }
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("sends a confirmation email with order and store details", async () => {
    vi.stubEnv("EMAIL_FROM", "ABU Marketplace <noreply@abumarketplace.shop>");
    prisma.user.findUnique.mockResolvedValue(user);
    prisma.order.findMany.mockResolvedValue(orders);
    mockSend.mockResolvedValue({ data: { id: "email_1" } });

    await sendOrderConfirmation("usr_1", ["ord_1234567890"]);

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: "usr_1" },
      select: { email: true, name: true },
    });
    expect(prisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: ["ord_1234567890"] }, userId: "usr_1" },
        include: {
          orderItems: { include: { product: true } },
          store: true,
        },
      })
    );
    expect(mockSend).toHaveBeenCalledTimes(1);
    const sendArg = mockSend.mock.calls[0][0];
    expect(sendArg.from).toBe("ABU Marketplace <noreply@abumarketplace.shop>");
    expect(sendArg.to).toEqual(["buyer@example.com"]);
    expect(sendArg.subject).toContain("Order confirmed");
    expect(sendArg.html).toContain("Halal Foods");
    expect(sendArg.html).toContain("Zamzam Water");
    expect(sendArg.html).toContain("Order total");
    expect(sendArg.html).toContain("/orders");
    expect(sendArg.text).toContain("Halal Foods");
    expect(sendArg.text).toContain("Zamzam Water");
  });

  it("falls back to the default from-address when no from env is set", async () => {
    prisma.user.findUnique.mockResolvedValue(user);
    prisma.order.findMany.mockResolvedValue(orders);
    mockSend.mockResolvedValue({ data: { id: "email_1" } });

    await sendOrderConfirmation("usr_1", ["ord_1234567890"]);

    expect(mockSend.mock.calls[0][0].from).toBe("ABU Marketplace <noreply@abumarketplace.shop>");
  });

  it("escapes product names in the HTML body", async () => {
    vi.stubEnv("EMAIL_FROM", "ABU Marketplace <noreply@abumarketplace.shop>");
    prisma.user.findUnique.mockResolvedValue(user);
    prisma.order.findMany.mockResolvedValue([
      {
        id: "ord_1234567890",
        total: 50,
        store: { name: "Store & Sons" },
        orderItems: [{ product: { name: "Item <b>bold</b>" }, quantity: 1, price: 50 }],
      },
    ]);
    mockSend.mockResolvedValue({ data: { id: "email_1" } });

    await sendOrderConfirmation("usr_1", ["ord_1234567890"]);

    const html = mockSend.mock.calls[0][0].html;
    expect(html).toContain("Store &amp; Sons");
    expect(html).toContain("Item &lt;b&gt;bold&lt;/b&gt;");
    expect(html).not.toContain("<b>bold</b>");
  });
});
