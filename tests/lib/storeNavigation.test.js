import { describe, expect, it } from "vitest";
import { getStoreLinkTarget } from "@/lib/storeNavigation";

describe("getStoreLinkTarget", () => {
  it("returns the public storefront route for an approved store owner", () => {
    expect(
      getStoreLinkTarget({
        isSignedIn: true,
        isSeller: true,
        storeUsername: "abu_style",
      })
    ).toBe("/shop/abu_style");
  });

  it("returns the create-store route for signed-in users without a store", () => {
    expect(
      getStoreLinkTarget({
        isSignedIn: true,
        isSeller: false,
        storeUsername: undefined,
      })
    ).toBe("/create-store");
  });

  it("returns the sign-in route for signed-out users", () => {
    expect(
      getStoreLinkTarget({
        isSignedIn: false,
        isSeller: false,
        storeUsername: undefined,
      })
    ).toBe("/sign-in");
  });
});
