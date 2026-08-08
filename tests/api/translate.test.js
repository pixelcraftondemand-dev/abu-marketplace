import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { translateRateLimiter } from "@/lib/security";
import { POST } from "@/app/api/translate/route";
import { translateText } from "@/lib/services/googleTranslateService";

vi.mock("@/lib/services/googleTranslateService", () => ({
  translateText: vi.fn(),
}));

function buildRequest(body) {
  return new Request("http://localhost:3000/api/translate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/translate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    translateRateLimiter._clear();
  });

  afterEach(() => {
    translateRateLimiter._clear();
  });

  it("translates text into a supported marketplace language", async () => {
    translateText.mockResolvedValue({
      translatedText: "Bonjour le monde",
      sourceLanguage: "en",
      targetLanguage: "fr",
    });
    const res = await POST(buildRequest({ text: "Hello world", target: "fr" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      translatedText: "Bonjour le monde",
      sourceLanguage: "en",
      targetLanguage: "fr",
    });
    expect(translateText).toHaveBeenCalledWith("Hello world", "fr", "auto");
  });

  it("accepts an uppercase target (normalized to lowercase)", async () => {
    translateText.mockResolvedValue({ translatedText: "Bonjour", sourceLanguage: "en", targetLanguage: "fr" });
    const res = await POST(buildRequest({ text: "Hello", target: "FR" }));
    expect(res.status).toBe(200);
    expect(translateText).toHaveBeenCalledWith("Hello", "FR", "auto");
  });

  it("passes an explicit source language through", async () => {
    translateText.mockResolvedValue({ translatedText: "Bonjour", sourceLanguage: "en", targetLanguage: "fr" });
    await POST(buildRequest({ text: "Hello", target: "fr", source: "en" }));
    expect(translateText).toHaveBeenCalledWith("Hello", "fr", "en");
  });

  it("rejects a malformed JSON body", async () => {
    const res = await POST(
      new Request("http://localhost:3000/api/translate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{not json",
      }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Invalid request body.");
    expect(translateText).not.toHaveBeenCalled();
  });

  it("rejects a missing, empty, or non-string text", async () => {
    for (const body of [{ target: "fr" }, { text: "", target: "fr" }, { text: "   ", target: "fr" }, { text: 42, target: "fr" }]) {
      const res = await POST(buildRequest(body));
      expect(res.status).toBe(400);
      expect((await res.json()).error).toBe("Text to translate is required.");
    }
    expect(translateText).not.toHaveBeenCalled();
  });

  it("rejects oversized text", async () => {
    const res = await POST(buildRequest({ text: "x".repeat(5001), target: "fr" }));
    expect(res.status).toBe(422);
    expect(translateText).not.toHaveBeenCalled();
  });

  it("rejects unsupported target languages (including Krio)", async () => {
    for (const target of ["kri", "xx", "de", 42]) {
      const res = await POST(buildRequest({ text: "Hello", target }));
      expect(res.status).toBe(422);
    }
    expect(translateText).not.toHaveBeenCalled();
  });

  it("rejects an invalid source language", async () => {
    const res = await POST(buildRequest({ text: "Hello", target: "fr", source: 42 }));
    expect(res.status).toBe(422);
    expect(translateText).not.toHaveBeenCalled();
  });

  it("rate limits translation requests", async () => {
    translateText.mockResolvedValue({ translatedText: "x", sourceLanguage: "en", targetLanguage: "fr" });
    let last;
    for (let i = 0; i < 31; i++) {
      last = await POST(buildRequest({ text: "Hello", target: "fr" }));
    }
    expect(last.status).toBe(429);
  });

  it("returns 503 when the Google Translate API key is not configured", async () => {
    translateText.mockRejectedValue(new Error("Google Translate API key is not configured"));
    const res = await POST(buildRequest({ text: "Hello", target: "fr" }));
    expect(res.status).toBe(503);
  });

  it("returns 502 when the upstream provider fails", async () => {
    translateText.mockRejectedValue(new Error("Google Translate request failed: 403 Forbidden"));
    const res = await POST(buildRequest({ text: "Hello", target: "fr" }));
    expect(res.status).toBe(502);
  });
});
