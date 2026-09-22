const GOOGLE_TRANSLATE_API_URL = "https://translation.googleapis.com/language/translate/v2";

function getApiKey(): string | undefined {
  return process?.env?.GOOGLE_TRANSLATE_API_KEY;
}

function normalizeLanguageCode(language: string | undefined | null): string | null {
  if (!language || typeof language !== "string") return null;
  const normalized = language.trim().toLowerCase();
  if (!normalized) return null;
  return normalized;
}

interface TranslateResult {
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
}

export async function translateText(
  text: string,
  targetLanguage: string,
  sourceLanguage: string = "auto"
): Promise<TranslateResult> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("Google Translate API key is not configured");
  }

  if (!text || typeof text !== "string") {
    throw new Error("Text to translate must be a non-empty string");
  }

  const target = normalizeLanguageCode(targetLanguage);
  if (!target) {
    throw new Error("Target language code is required");
  }

  const source = normalizeLanguageCode(sourceLanguage) || "auto";

  const body = new URLSearchParams({
    q: text,
    target,
    format: "text",
    key: apiKey,
  });

  if (source !== "auto") {
    body.append("source", source);
  }

  const response = await fetch(GOOGLE_TRANSLATE_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Translate request failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const translatedText = data?.data?.translations?.[0]?.translatedText;
  if (!translatedText) {
    throw new Error("Google Translate returned an unexpected response");
  }

  return {
    translatedText,
    sourceLanguage: data.data.translations[0].detectedSourceLanguage || source,
    targetLanguage: target,
  };
}
