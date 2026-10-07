import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSessionFromRequest: vi.fn(),
  authSeller: vi.fn(),
  orderFindMany: vi.fn(),
  productFindMany: vi.fn(),
  ratingFindMany: vi.fn(),
  storeFindUnique: vi.fn(),
}));

vi.mock("@/lib/serverAuth", () => ({
  getSessionFromRequest: mocks.getSessionFromRequest,
}));

vi.mock("@/middlewares/authSeller", () => ({
  default: mocks.authSeller,
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    order: { findMany: mocks.orderFindMany },
    product: { findMany: mocks.productFindMany },
    rating: { findMany: mocks.ratingFindMany },
    store: { findUnique: mocks.storeFindUnique },
  },
}));

import { GET } from "@/app/api/store/dashboard/route";

describe("GET /api/store/dashboard", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.getSessionFromRequest.mockResolvedValue({ user: { id: "seller_1" } });
    mocks.authSeller.mockResolvedValue("store_1");
    mocks.orderFindMany.mockResolvedValue([]);
    mocks.productFindMany.mockResolvedValue([]);
    mocks.ratingFindMany.mockResolvedValue([]);
    mocks.storeFindUnique.mockResolvedValue({ name: "Market Shop", username: "marketshop" });
  });

  it("requires an approved active seller", async () => {
    mocks.authSeller.mockResolvedValue(false);

    const response = await GET(new Request("http://localhost:3000/api/store/dashboard"));

    expect(response.status).toBe(401);
    expect(mocks.orderFindMany).not.toHaveBeenCalled();
  });

  it("returns seller dashboard data and excludes cancelled orders from sales", async () => {
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 5);
    mocks.orderFindMany.mockResolvedValue([
      { id: "paid", total: 40, status: "PAID", createdAt: currentMonth },
      { id: "delivered", total: 30, status: "DELIVERED", createdAt: currentMonth },
      { id: "placed", total: 10, status: "ORDER_PLACED", createdAt: currentMonth },
      { id: "cancelled", total: 100, status: "CANCELLED", createdAt: currentMonth },
    ]);
    mocks.productFindMany.mockResolvedValue([
      { id: "product_1", name: "Lamp", category: "Home & Kitchen" },
    ]);
    mocks.ratingFindMany.mockResolvedValue([{ rating: 5 }]);

    const response = await GET(new Request("http://localhost:3000/api/store/dashboard"));
    const { dashboardData } = await response.json();
    const currentMonthSeries = dashboardData.salesSeries.find(
      (entry) => entry.month === now.toLocaleString("en-US", { month: "short" })
    );

    expect(response.status).toBe(200);
    expect(dashboardData).toMatchObject({
      store: { name: "Market Shop", username: "marketshop" },
      totalOrders: 3,
      totalSales: 80,
      totalProducts: 1,
      averageRating: 5,
      monthlySales: 80,
      monthlyOrders: 3,
      pendingOrders: 1,
      averageOrderValue: 27,
      topCategory: "Home & Kitchen",
    });
    expect(dashboardData.recentOrders.map((order) => order.id)).not.toContain("cancelled");
    expect(currentMonthSeries.sales).toBe(80);
    expect(mocks.storeFindUnique).toHaveBeenCalledWith({
      where: { id: "store_1" },
      select: { name: true, username: true },
    });
  });

  it("returns a server error when the dashboard query fails", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.orderFindMany.mockRejectedValue(new Error("database unavailable"));

    try {
      const response = await GET(new Request("http://localhost:3000/api/store/dashboard"));

      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({ error: "Unable to fetch dashboard data." });
    } finally {
      log.mockRestore();
    }
  });
});
