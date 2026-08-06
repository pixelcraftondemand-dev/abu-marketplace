import { describe, expect, it } from "vitest";
import { isCashOnDeliveryAvailable } from "@/lib/paymentOptions";

describe("payment options", () => {
  it("allows cash on delivery for all countries", () => {
    expect(isCashOnDeliveryAvailable()).toBe(true);
  });
});
