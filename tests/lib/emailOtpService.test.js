import { describe, expect, it } from "vitest";
import { generateEmailOtp, isValidEmailOtp } from "@/lib/services/emailOtpService";

describe("email OTP format", () => {
  it("generates six characters containing exactly one letter", () => {
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const code = generateEmailOtp();
      expect(code).toMatch(/^[A-HJ-NP-Z0-9]{6}$/);
      expect(code.match(/[A-Z]/g)).toHaveLength(1);
    }
  });

  it("accepts only six-character codes containing exactly one letter", () => {
    expect(isValidEmailOtp("12345A")).toBe(true);
    expect(isValidEmailOtp("a12345")).toBe(false);
    expect(isValidEmailOtp("12AB45")).toBe(false);
    expect(isValidEmailOtp("123456")).toBe(false);
    expect(isValidEmailOtp("1234A")).toBe(false);
  });
});
