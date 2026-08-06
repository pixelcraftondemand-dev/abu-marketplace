import { describe, expect, it } from "vitest";
import {
  PAYMENT_STATES,
  canTransition,
  assertValidTransition,
  isValidPaymentState,
} from "@/lib/services/paymentState";

describe("payment state machine", () => {
  it("exposes all required states", () => {
    expect(PAYMENT_STATES).toMatchObject({
      PENDING: "PENDING",
      PROCESSING: "PROCESSING",
      SUCCEEDED: "SUCCEEDED",
      FAILED: "FAILED",
      CANCELLED: "CANCELLED",
      EXPIRED: "EXPIRED",
      REFUNDED: "REFUNDED",
      PARTIALLY_REFUNDED: "PARTIALLY_REFUNDED",
    });
  });

  it("allows the happy path", () => {
    expect(canTransition("PENDING", "PROCESSING")).toBe(true);
    expect(canTransition("PROCESSING", "SUCCEEDED")).toBe(true);
    expect(canTransition("SUCCEEDED", "PARTIALLY_REFUNDED")).toBe(true);
    expect(canTransition("PARTIALLY_REFUNDED", "REFUNDED")).toBe(true);
    expect(canTransition("SUCCEEDED", "REFUNDED")).toBe(true);
  });

  it("allows failure and expiry paths", () => {
    expect(canTransition("PENDING", "FAILED")).toBe(true);
    expect(canTransition("PROCESSING", "FAILED")).toBe(true);
    expect(canTransition("PENDING", "CANCELLED")).toBe(true);
    expect(canTransition("PENDING", "EXPIRED")).toBe(true);
    expect(canTransition("PROCESSING", "EXPIRED")).toBe(true);
  });

  it("rejects invalid transitions", () => {
    expect(canTransition("REFUNDED", "SUCCEEDED")).toBe(false);
    expect(canTransition("FAILED", "REFUNDED")).toBe(false);
    expect(canTransition("CANCELLED", "SUCCEEDED")).toBe(false);
    expect(canTransition("EXPIRED", "SUCCEEDED")).toBe(false);
    expect(canTransition("SUCCEEDED", "FAILED")).toBe(false);
    expect(canTransition("PENDING", "REFUNDED")).toBe(false);
  });

  it("assertValidTransition throws for invalid transitions", () => {
    expect(() => assertValidTransition("REFUNDED", "SUCCEEDED")).toThrow(/Invalid payment state transition/);
    expect(() => assertValidTransition("FAILED", "REFUNDED")).toThrow(/Invalid payment state transition/);
    expect(() => assertValidTransition("CANCELLED", "SUCCEEDED")).toThrow(/Invalid payment state transition/);
  });

  it("assertValidTransition throws for unknown target states", () => {
    expect(() => assertValidTransition("PENDING", "COMPLETED")).toThrow(/Unknown payment state/);
  });

  it("accepts any state as the initial state", () => {
    expect(canTransition(undefined, "PENDING")).toBe(true);
    expect(canTransition(null, "PROCESSING")).toBe(true);
  });

  it("validates known states", () => {
    expect(isValidPaymentState("SUCCEEDED")).toBe(true);
    expect(isValidPaymentState("COMPLETED")).toBe(false);
  });
});
