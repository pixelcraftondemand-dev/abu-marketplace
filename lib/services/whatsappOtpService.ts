/**
 * WhatsApp OTP sign-in for ABU Marketplace.
 *
 * Flow: buyer enters their WhatsApp number -> we generate a 6-digit code and
 * deliver it through the WhatsApp Business Cloud API (Meta) as an
 * `authentication` template -> the buyer types the code -> we consume it and
 * hand the caller a Clerk sign-in ticket (see clerkWhatsappAuth.ts).
 *
 * Why our own OTP instead of Clerk's phone factor: Clerk only sends SMS. The
 * Sierra Leone pilot is WhatsApp-first, so the code has to arrive inside
 * WhatsApp. Codes therefore live in the existing `verification` table with a
 * `whatsapp:<e164-digits>` identifier â€” same single-live-code + atomic-consume
 * guarantees as the email flow, no schema change.
 *
 * Security properties:
 *  - The raw code is never stored or logged. It is stored as an HMAC-SHA256
 *    digest keyed with a server secret (a bare SHA-256 over a 6-digit code is
 *    trivially reversible in a 10^6 keyspace from a DB dump).
 *  - One live code per number: issuing a new one deletes the previous.
 *  - The code is consumed inside the same transaction that returns success, so
 *    a code can never be replayed â€” even by two racing requests.
 *  - Wrong-code attempts are counted in the same rate-limit bucket as the
 *    verify endpoint, so a 6-digit space cannot be walked.
 *  - In production, `WHATSAPP_OTP_PROVIDER=mock` is refused, so a misconfigured
 *    deploy can never run the sign-in flow without actually sending the code.
 */
import crypto from "node:crypto";
import prisma from "@/lib/prisma";
import { normalizeWhatsAppNumber } from "@/lib/utils/whatsapp";
import { createDistributedRateLimiter } from "@/lib/services/rateLimitStore";

const OTP_LENGTH = 6;
const DEFAULT_TTL_MINUTES = 5;
const MAX_TTL_MINUTES = 15;
const GRAPH_API_VERSION = "v23.0";

export const WHATSAPP_OTP_IDENTIFIER_PREFIX = "whatsapp:";

/** 3 codes per number per 10 minutes â€” an SMS/WhatsApp pumping ceiling. */
export const whatsappOtpSendRateLimiter = createDistributedRateLimiter({
  windowMs: 10 * 60_000,
  max: 3,
  name: "whatsapp-otp-send",
});

/** 10 verify attempts per number per 10 minutes â€” bounds code guessing. */
export const whatsappOtpVerifyRateLimiter = createDistributedRateLimiter({
  windowMs: 10 * 60_000,
  max: 10,
  name: "whatsapp-otp-verify",
});

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

/** `mock` (default) never calls Meta. `meta` is the live Cloud API. */
export function getWhatsappOtpProvider(): "mock" | "meta" {
  const raw = String(process.env.WHATSAPP_OTP_PROVIDER || "mock").trim().toLowerCase();
  return raw === "meta" ? "meta" : "mock";
}

function getTtlMinutes(): number {
  const raw = Number(process.env.WHATSAPP_OTP_TTL_MINUTES);
  if (Number.isFinite(raw) && raw > 0 && raw <= MAX_TTL_MINUTES) return Math.floor(raw);
  return DEFAULT_TTL_MINUTES;
}

function getOtpSecret(): string {
  const secret =
    process.env.WHATSAPP_OTP_SECRET ||
    process.env.CLERK_SECRET_KEY ||
    "";
  if (!secret) {
    throw new Error(
      "WHATSAPP_OTP_SECRET (or CLERK_SECRET_KEY) must be set to hash WhatsApp OTP codes."
    );
  }
  return secret;
}

/** Cryptographically secure 6-digit code, e.g. "048192". */
export function generateWhatsappOtp(): string {
  return crypto
    .randomInt(0, 10 ** OTP_LENGTH)
    .toString()
    .padStart(OTP_LENGTH, "0");
}

/** HMAC-SHA256 of a code â€” the only form ever persisted. */
export function hashWhatsappOtp(code: string): string {
  if (!code || typeof code !== "string") {
    throw new Error("WhatsApp OTP code is required.");
  }
  return crypto.createHmac("sha256", getOtpSecret()).update(code).digest("hex");
}

/**
 * Normalise user input ("076 123 456", "+232 76 123 456") to international
 * digits and reject anything that is not a plausible number. Returns null when
 * unusable so callers can answer with one generic error.
 */
export function toWhatsappDigits(raw: unknown): string | null {
  const digits = normalizeWhatsAppNumber(raw);
  if (!digits || digits.length < 8 || digits.length > 15) return null;
  return digits;
}

export function whatsappIdentifier(digits: string): string {
  return `${WHATSAPP_OTP_IDENTIFIER_PREFIX}${digits}`;
}

export function isWhatsappIdentifier(identifier: string): boolean {
  return identifier.startsWith(WHATSAPP_OTP_IDENTIFIER_PREFIX);
}

// â”€â”€â”€ Meta WhatsApp Business Cloud API â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface MetaSendResult {
  ok: boolean;
  status: number;
  detail?: string;
}

/**
 * Send the authentication template through the Cloud API.
 *
 * The template must be an approved `authentication` template whose body takes
 * one parameter (the code) â€” create it in Meta Business Manager and set its
 * name in WHATSAPP_OTP_TEMPLATE.
 */
export async function sendWhatsappOtpMessage(
  digits: string,
  code: string
): Promise<MetaSendResult> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const templateName = process.env.WHATSAPP_OTP_TEMPLATE || "abu_signin_code";
  const templateLang = process.env.WHATSAPP_OTP_TEMPLATE_LANG || "en_US";
  const copyCodeText = String(process.env.WHATSAPP_OTP_BUTTON_TEXT || "Copy Code").trim().slice(0, 25);
  const codeExpirationMinutes = Number(process.env.WHATSAPP_OTP_EXPIRATION_MINUTES || 5);

  if (!phoneNumberId || !accessToken) {
    return {
      ok: false,
      status: 0,
      detail:
        "WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN must be set to send WhatsApp OTP codes.",
    };
  }

  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages`;
  const body = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: digits,
    type: "template",
    template: {
      name: templateName,
      language: { code: templateLang },
      components: [
        {
          type: "body",
          add_security_recommendation: true,
          parameters: [{ type: "text", text: code }],
        },
        {
          type: "footer",
          code_expiration_minutes:
            Number.isFinite(codeExpirationMinutes) && codeExpirationMinutes > 0
              ? Math.min(codeExpirationMinutes, 15)
              : 5,
        },
        {
          type: "buttons",
          buttons: [
            {
              type: "otp",
              otp_type: "copy_code",
              text: copyCodeText || "Copy Code",
            },
          ],
        },
      ],
    },
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      // Never echo the code or the token into logs â€” just the provider's error.
      const text = await res.text().catch(() => "");
      console.error("[whatsappOtp] Cloud API rejected the send", {
        status: res.status,
        detail: text.slice(0, 400),
      });
      return { ok: false, status: res.status, detail: text.slice(0, 400) };
    }

    return { ok: true, status: res.status };
  } catch (error) {
    console.error(
      "[whatsappOtp] Cloud API request failed",
      error instanceof Error ? error.message : String(error)
    );
    return {
      ok: false,
      status: 0,
      detail: error instanceof Error ? error.message : "network_error",
    };
  }
}

// â”€â”€â”€ Issue + verify â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type IssueWhatsappOtpResult =
  | { sent: true; expiresInMinutes: number; devCode?: string }
  | { sent: false; reason: "invalid_number" | "provider_error"; message?: string };

/**
 * Issue (and deliver) a sign-in code for a WhatsApp number.
 *
 * Rate limiting is the caller's job â€” the route checks both the number and the
 * request IP, because this endpoint is unauthenticated by definition.
 */
export async function issueWhatsappOtp(
  rawPhone: unknown
): Promise<IssueWhatsappOtpResult> {
  const digits = toWhatsappDigits(rawPhone);
  if (!digits) return { sent: false, reason: "invalid_number" };

  const identifier = whatsappIdentifier(digits);
  const expiresInMinutes = getTtlMinutes();
  const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

  // Single live code per number.
  await prisma.verification.deleteMany({ where: { identifier } });

  let code = "";
  let stored = false;
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = generateWhatsappOtp();
    try {
      await prisma.verification.create({
        data: {
          id: crypto.randomUUID(),
          identifier,
          value: hashWhatsappOtp(candidate),
          expiresAt,
        },
      });
      code = candidate;
      stored = true;
      break;
    } catch (error: unknown) {
      // P2002 = unique constraint on `value`: another number holds this digest.
      if ((error as { code?: string })?.code === "P2002") continue;
      throw error;
    }
  }

  if (!stored) {
    return {
      sent: false,
      reason: "provider_error",
      message: "Could not allocate a sign-in code. Please try again.",
    };
  }

  const provider = getWhatsappOtpProvider();

  // Safety interlock: a production deploy must never run the sign-in flow
  // without actually sending the code to the buyer's phone.
  if (provider === "mock" && isProduction()) {
    await prisma.verification.deleteMany({ where: { identifier } });
    console.error(
      "[whatsappOtp] WHATSAPP_OTP_PROVIDER is 'mock' in production â€” refusing to issue a code."
    );
    return { sent: false, reason: "provider_error", message: "WhatsApp sign-in is unavailable." };
  }

  if (provider === "mock") {
    // Development only: log so a dev can complete the flow without Meta access.
    console.warn(
      `[whatsappOtp] mock provider â€” sign-in code for ${digits} is ${code}`
    );
    return { sent: true, expiresInMinutes, devCode: code };
  }

  const result = await sendWhatsappOtpMessage(digits, code);
  if (!result.ok) {
    // Do not leave an undeliverable code lying in the table.
    await prisma.verification.deleteMany({ where: { identifier } });
    return { sent: false, reason: "provider_error", message: "We couldn't send your code." };
  }

  return { sent: true, expiresInMinutes };
}

export type VerifyWhatsappOtpResult =
  | { status: "verified"; phone: string }
  | { status: "invalid" }
  | { status: "expired" }
  | { status: "server_error" };

/**
 * Verify a code for a number. The lookup + delete happen in one transaction, so
 * a code can be replayed exactly zero times.
 */
export async function verifyWhatsappOtp(
  rawPhone: unknown,
  rawCode: unknown
): Promise<VerifyWhatsappOtpResult> {
  const digits = toWhatsappDigits(rawPhone);
  const code = typeof rawCode === "string" ? rawCode.trim() : "";
  if (!digits || !/^\d{6}$/.test(code)) return { status: "invalid" };

  const identifier = whatsappIdentifier(digits);
  let tokenHash: string;
  try {
    tokenHash = hashWhatsappOtp(code);
  } catch (error) {
    console.error("[whatsappOtp.verifyWhatsappOtp]", error);
    return { status: "server_error" };
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const record = await tx.verification.findFirst({
        where: { identifier, value: tokenHash },
        select: { id: true, expiresAt: true },
      });
      if (!record) return { status: "invalid" as const };

      if (record.expiresAt < new Date()) {
        await tx.verification.delete({ where: { id: record.id } });
        return { status: "expired" as const };
      }

      await tx.verification.delete({ where: { id: record.id } });
      return { status: "verified" as const, phone: digits };
    });
  } catch (error) {
    console.error("[whatsappOtp.verifyWhatsappOtp]", error);
    return { status: "server_error" };
  }
}
