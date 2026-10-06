import { describe, expect, it } from "vitest";
import { normalizeImages } from "@/lib/productUtils";

describe("normalizeImages", () => {
  it("passes a native array through unchanged", () => {
    const images = ["https://a.com/1.jpg", "https://a.com/2.jpg"];
    expect(normalizeImages(images)).toEqual(images);
  });

  it("returns an empty array for an empty array", () => {
    expect(normalizeImages([])).toEqual([]);
  });

  it("does not mutate the input array", () => {
    const images = ["https://a.com/1.jpg"];
    normalizeImages(images);
    expect(images).toEqual(["https://a.com/1.jpg"]);
  });

  it("parses a JSON-encoded array string (legacy seed format)", () => {
    expect(
      normalizeImages('["https://a.com/1.jpg","https://a.com/2.jpg"]')
    ).toEqual(["https://a.com/1.jpg", "https://a.com/2.jpg"]);
  });

  it("treats a single URL string as a one-item array", () => {
    expect(normalizeImages("https://a.com/1.jpg")).toEqual([
      "https://a.com/1.jpg",
    ]);
  });

  it("returns an empty array for an empty string", () => {
    expect(normalizeImages("")).toEqual([]);
  });

  it("treats non-JSON strings as a single image URL", () => {
    expect(normalizeImages("not-json")).toEqual(["not-json"]);
  });

  it("drops non-string entries from arrays", () => {
    expect(
      normalizeImages(["https://a.com/1.jpg", null, 42, { url: "x" }])
    ).toEqual(["https://a.com/1.jpg"]);
  });

  it("drops non-string entries parsed from a JSON array", () => {
    expect(normalizeImages('["https://a.com/1.jpg", null, 42]')).toEqual([
      "https://a.com/1.jpg",
    ]);
  });

  it("returns an empty array for non-array, non-string inputs", () => {
    expect(normalizeImages(undefined)).toEqual([]);
    expect(normalizeImages(null)).toEqual([]);
    expect(normalizeImages(123)).toEqual([]);
    expect(normalizeImages({})).toEqual([]);
  });

  it("treats a JSON object (not array) as a single legacy string", () => {
    // JSON.parse succeeds but is not an array — the raw string is kept as a
    // one-item array so `images[0]` still resolves for legacy consumers.
    expect(normalizeImages('{"url":"https://a.com/1.jpg"}')).toEqual([
      '{"url":"https://a.com/1.jpg"}',
    ]);
  });

  it("always yields an indexable [0] for legacy single-image shapes", () => {
    expect(normalizeImages("https://a.com/1.jpg")[0]).toBe(
      "https://a.com/1.jpg"
    );
  });
});
