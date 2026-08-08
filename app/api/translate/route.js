import { NextResponse } from "next/server";
import { translateText } from "@/lib/services/googleTranslateService";
import { translateRateLimiter } from "@/lib/security";

// Marketplace locales that Google Translate actually supports. The tenth
// marketplace locale, Krio ("kri"), is not offered by Google Translate, so it
// is intentionally absent here.
const TRANSLATABLE_TARGETS = new Set(["en", "fr", "pt", "ha", "yo", "ig", "wo", "ff", "ak"]);

const MAX_TEXT_LENGTH = 5000;

export async function POST(request) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rl = translateRateLimiter.check(ip);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many translation requests. Please wait a moment." }, { status: 429 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }
    const { text, target, source } = body || {};

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return NextResponse.json({ error: "Text to translate is required." }, { status: 400 });
    }
    if (text.length > MAX_TEXT_LENGTH) {
      return NextResponse.json({ error: `Text must not exceed ${MAX_TEXT_LENGTH} characters.` }, { status: 422 });
    }
    if (!target || typeof target !== "string" || !TRANSLATABLE_TARGETS.has(target.toLowerCase())) {
      return NextResponse.json(
        { error: "Unsupported target language. Supported: en, fr, pt, ha, yo, ig, wo, ff, ak." },
        { status: 422 },
      );
    }
    if (source != null && (typeof source !== "string" || source.trim() === "")) {
      return NextResponse.json({ error: "Invalid source language." }, { status: 422 });
    }

    const result = await translateText(text, target, source || "auto");
    return NextResponse.json(result);
  } catch (err) {
    // A missing API key is a configuration issue, not an unexpected failure —
    // warn instead of flooding error logs on every request.
    if (err?.message?.includes("API key is not configured")) {
      console.warn("[POST /api/translate] Google Translate API key is not configured");
      return NextResponse.json({ error: "Translation is not configured." }, { status: 503 });
    }
    console.error("[POST /api/translate]", err?.message || err);
    return NextResponse.json({ error: "Translation failed." }, { status: 502 });
  }
}
