import { describe, expect, it } from "vitest";
import { premiumTiers } from "@/lib/pricingPlans";

describe("premiumTiers", () => {
  it("exposes three tiers with a clear progression in price and perks", () => {
    expect(premiumTiers).toHaveLength(3);
    expect(premiumTiers[0].name).toBe("Explorer");
    expect(premiumTiers[1].name).toBe("Plus");
    expect(premiumTiers[2].name).toBe("Pro");
    expect(premiumTiers[0].priceMonthly).toBe(0);
    expect(premiumTiers[1].priceMonthly).toBe(9);
    expect(premiumTiers[2].priceMonthly).toBe(29);
    expect(premiumTiers[2].perks.at(-1)).toContain("concierge");
  });
});
