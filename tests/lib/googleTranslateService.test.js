import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { translateText } from "@/lib/services/googleTranslateService";

describe("google translate service", () => {
  beforeEach(() => {
    vi.stubEnv("GOOGLE_TRANSLATE_API_KEY", "test-key");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("translates text with the expected request payload", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: { translations: [{ translatedText: "Bonjour", detectedSourceLanguage: "en" }] },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await translateText("Hello", "fr");

    expect(result).toEqual({
      translatedText: "Bonjour",
      sourceLanguage: "en",
      targetLanguage: "fr",
    });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://translation.googleapis.com/language/translate/v2");
    expect(init.method).toBe("POST");
    const body = init.body.toString();
    expect(body).toContain("q=Hello");
    expect(body).toContain("target=fr");
    expect(body).toContain("format=text");
    expect(body).toContain("key=test-key");
    expect(body).not.toContain("source=");
  });

  it("includes the source language when one is provided", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: { translations: [{ translatedText: "Hello", detectedSourceLanguage: "fr" }] },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await translateText("Bonjour", "en", "fr");
    expect(fetchMock.mock.calls[0][1].body.toString()).toContain("source=fr");
  });

  it("falls back to the requested source when detection is missing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: { translations: [{ translatedText: "Hello" }] } }),
      }),
    );
    const result = await translateText("Bonjour", "en", "auto");
    expect(result.sourceLanguage).toBe("auto");
  });

  it("throws when the API key is not configured", async () => {
    vi.stubEnv("GOOGLE_TRANSLATE_API_KEY", "");
    await expect(translateText("Hello", "fr")).rejects.toThrow("Google Translate API key is not configured");
  });

  it("throws for empty or non-string text", async () => {
    await expect(translateText("", "fr")).rejects.toThrow("must be a non-empty string");
    await expect(translateText(42, "fr")).rejects.toThrow("must be a non-empty string");
  });

  it("throws when the target language is missing", async () => {
    await expect(translateText("Hello")).rejects.toThrow("Target language code is required");
    await expect(translateText("Hello", "")).rejects.toThrow("Target language code is required");
  });

  it("throws when the provider responds with an error status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 403, text: async () => "Forbidden" }),
    );
    await expect(translateText("Hello", "fr")).rejects.toThrow("Google Translate request failed: 403");
  });

  it("throws when the provider returns no translation", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: { translations: [] } }) }),
    );
    await expect(translateText("Hello", "fr")).rejects.toThrow("unexpected response");
  });
});
