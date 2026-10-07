import { describe, expect, it } from "vitest";
import { getStoreLinkTarget } from "@/lib/storeNavigation";

describe("getStoreLinkTarget", () => {
  it("returns the seller dashboard route for an approved store owner", () => {
    expect(
      getStoreLinkTarget({
        isSignedIn: true,
        isSeller: true,
      })
    ).toBe("/store/dashboard");
  });

  it("returns the create-store route for signed-in users without a store", () => {
    expect(
      getStoreLinkTarget({
        isSignedIn: true,
        isSeller: false,
      })
    ).toBe("/create-store");
  });

  it("returns store onboarding for signed-out users", () => {
    expect(
      getStoreLinkTarget({
        isSignedIn: false,
        isSeller: false,
      })
    ).toBe("/create-store");
  });
});
