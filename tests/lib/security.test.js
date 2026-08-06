import { describe, expect, it } from "vitest";

import { sniffImageMagicBytes, sanitizeText, isValidId, normalizeCart } from "@/lib/security";

function toBuffer(hex) {
  return Buffer.from(hex.replace(/\s/g, ""), "hex");
}

describe("sniffImageMagicBytes", () => {
  it("detects real JPEG, PNG, GIF, and WebP signatures", () => {
    expect(sniffImageMagicBytes(toBuffer("ff d8 ff e0 00 10 4a 46 49 46 00 01"))).toBe("image/jpeg");
    expect(sniffImageMagicBytes(toBuffer("89 50 4e 47 0d 0a 1a 0a 00 00 00 0d"))).toBe("image/png");
    expect(sniffImageMagicBytes(toBuffer("47 49 46 38 39 61 01 00 01 00 80 00"))).toBe("image/gif");
    expect(sniffImageMagicBytes(toBuffer("52 49 46 46 24 00 00 00 57 45 42 50"))).toBe("image/webp");
  });

  it("rejects HTML, SVG, and other spoofed files", () => {
    // A malicious file labelled "image/png" but actually HTML.
    expect(sniffImageMagicBytes(Buffer.from("<!DOCTYPE html><html><script>alert(1)</script></html>"))).toBeNull();
    // SVG payload.
    expect(sniffImageMagicBytes(Buffer.from("<?xml version=\"1.0\"?><svg onload=alert(1)>"))).toBeNull();
    // Truncated / too short.
    expect(sniffImageMagicBytes(Buffer.from("ff d8 ff"))).toBeNull();
    // Executable (MZ header).
    expect(sniffImageMagicBytes(Buffer.from("MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00"))).toBeNull();
  });
});

describe("sanitizeText", () => {
  it("strips control characters and truncates", () => {
    expect(sanitizeText("ab\u0000cd", 100)).toBe("abcd");
    expect(sanitizeText("abcdef", 3)).toBe("abc");
    expect(sanitizeText(123, 5)).toBe("");
  });
});

describe("isValidId", () => {
  it("accepts safe ids and rejects traversal/control chars", () => {
    expect(isValidId("prod_abc-123")).toBe(true);
    expect(isValidId("../../etc/passwd")).toBe(false);
    expect(isValidId("a b")).toBe(false);
  });
});

describe("normalizeCart", () => {
  it("rejects malformed carts, bad ids, and non-integer quantities", () => {
    expect(normalizeCart(null).error).toBeTruthy();
    expect(normalizeCart([1, 2]).error).toBeTruthy();
    expect(normalizeCart({ "../../x": 1 }).error).toBeTruthy();
    expect(normalizeCart({ "prod_1": 1.5 }).error).toBeTruthy();
    expect(normalizeCart({ "prod_1": 0 }).error).toBeTruthy();
    expect(normalizeCart({ "prod_1": 100 }).error).toBeTruthy();
    expect(normalizeCart({ "prod_1": 2 }).cart).toEqual({ "prod_1": 2 });
  });
});
