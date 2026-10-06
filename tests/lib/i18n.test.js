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

// Sierra Leone pilot: English plus Krio ship real dictionaries; anything else
// falls back to English.
const SHIPPED_LANGUAGES = ["English", "Krio"];

describe("i18n", () => {
  it("ships the supported language dictionaries", () => {
    expect(Object.keys(dictionaries).sort()).toEqual(["en", "kri"]);
    expect(translatedLanguages).toEqual(expect.arrayContaining(SHIPPED_LANGUAGES));
  });

  it("translates keys into each shipped language", () => {
    expect(translate("nav.shop", "English")).toBe("Shop");
    expect(translate("nav.home", "Krio")).toBe("Ɔm");
    expect(translate("nav.shop", "Krio")).toBe("Shop");
  });

  it("resolves every English key in every shipped language (no gaps)", () => {
    const keys = collectKeys(dictionaries.en);
    expect(keys.length).toBeGreaterThan(100);
    for (const lang of SHIPPED_LANGUAGES) {
      for (const key of keys) {
        const value = translate(key, lang);
        expect(value).toBeTruthy();
        expect(value).not.toBe(key);
      }
    }
  });

  it("falls back to English for unsupported languages", () => {
    expect(translate("nav.shop", "French")).toBe("Shop");
    expect(translate("nav.shop", "Arabic")).toBe("Shop");
    expect(translate("nav.shop", undefined)).toBe("Shop");
    expect(translate("nav.shop", "Swahili")).toBe("Shop");
  });

  it("returns the raw key when no translation exists anywhere", () => {
    expect(translate("totally.missing.key", "English")).toBe("totally.missing.key");
  });

  it("interpolates {params} placeholders", () => {
    expect(translate("home.showingProducts", "English", { count: 3, total: 8 }))
      .toBe("Showing 3 of 8 products");
    expect(translate("productDetails.reviews", "English", { count: 12 })).toBe("12 Reviews");
    expect(translate("footer.rightsReserved", "English", { year: 2026 })).toContain("2026");
  });

  it("keeps unknown placeholders as-is", () => {
    expect(translate("home.showingProducts", "English", { count: 1 })).toContain("{total}");
  });

  it("returns the matching dictionary for every shipped language", () => {
    expect(getDictionary("Krio")).toBe(dictionaries.kri);
    expect(getDictionary("English")).toBe(dictionaries.en);
    expect(getDictionary("Portuguese")).toBe(dictionaries.en);
    expect(getDictionary(undefined)).toBe(dictionaries.en);
    expect(getDictionary("Arabic")).toBe(dictionaries.en);
  });
});
