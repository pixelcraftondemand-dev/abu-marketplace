import { describe, expect, it } from "vitest";
import { dictionaries, getDictionary, translate, translatedLanguages } from "@/lib/i18n";

function collectKeys(obj, prefix = "") {
  const keys = [];
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object") keys.push(...collectKeys(v, path));
    else keys.push(path);
  }
  return keys;
}

describe("i18n", () => {
  it("ships English, French, and Krio dictionaries", () => {
    expect(Object.keys(dictionaries).sort()).toEqual(["en", "fr", "kri"]);
    expect(translatedLanguages).toEqual(expect.arrayContaining(["English", "French", "Krio"]));
  });

  it("translates keys into each language", () => {
    expect(translate("nav.shop", "English")).toBe("Shop");
    expect(translate("nav.shop", "French")).toBe("Boutique");
    // Krio uses the English loanword; it must still resolve to a real string.
    expect(translate("nav.shop", "Krio")).toBeTruthy();
  });

  it("resolves every English key in every shipped language (no gaps)", () => {
    const keys = collectKeys(dictionaries.en);
    expect(keys.length).toBeGreaterThan(100);
    for (const lang of ["English", "French", "Krio"]) {
      for (const key of keys) {
        const value = translate(key, lang);
        expect(value).toBeTruthy();
        expect(value).not.toBe(key);
      }
    }
  });

  it("falls back to English for unsupported languages", () => {
    expect(translate("nav.shop", "Arabic")).toBe("Shop");
    expect(translate("nav.shop", undefined)).toBe("Shop");
    expect(translate("nav.shop", "Wolof")).toBe("Shop");
  });

  it("returns the raw key when no translation exists anywhere", () => {
    expect(translate("totally.missing.key", "English")).toBe("totally.missing.key");
  });

  it("interpolates {params} placeholders", () => {
    expect(translate("home.showingProducts", "English", { count: 3, total: 8 }))
      .toBe("Showing 3 of 8 products");
    expect(translate("productDetails.reviews", "English", { count: 12 })).toBe("12 Reviews");
  });

  it("keeps unknown placeholders as-is", () => {
    expect(translate("home.showingProducts", "English", { count: 1 })).toContain("{total}");
  });

  it("returns the English dictionary for unknown languages", () => {
    expect(getDictionary("Wolof")).toBe(dictionaries.en);
    expect(getDictionary(undefined)).toBe(dictionaries.en);
  });
});
