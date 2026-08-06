import crypto from "node:crypto";

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

/**
 * SHA-256 hex digest — the only form support-ticket bearer credentials should
 * be stored in. A leaked database dump can never be replayed as a live token.
 */
export function hashAccessToken(token) {
  if (!token || typeof token !== "string") return null;
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function sanitizeText(value, maxLength) {
    if (typeof value !== "string") return "";
    return value.replace(/[\u0000-\u001F\u007F]/g, "").trim().slice(0, maxLength);
}

export function isValidId(value) {
    return typeof value === "string" && /^[A-Za-z0-9_-]{3,100}$/.test(value);
}

export function normalizeCart(cart, { maxItems = 100, maxQuantity = 99 } = {}) {
    if (!cart || typeof cart !== "object" || Array.isArray(cart)) {
        return { error: "Cart must be an object." };
    }

    const entries = Object.entries(cart);
    if (entries.length > maxItems) {
        return { error: `Cart cannot contain more than ${maxItems} products.` };
    }

    const normalized = {};
    for (const [productId, quantity] of entries) {
        if (!isValidId(productId)) {
            return { error: "Cart contains an invalid product id." };
        }
        if (!Number.isInteger(quantity) || quantity < 1 || quantity > maxQuantity) {
            return { error: `Cart quantities must be whole numbers from 1 to ${maxQuantity}.` };
        }
        normalized[productId] = quantity;
    }

    return { cart: normalized };
}

export function isAllowedImage(file, maxBytes) {
    if (!file || typeof file === "string" || typeof file.arrayBuffer !== "function") {
        return { error: "A valid image file is required." };
    }
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        return { error: "Images must be JPEG, PNG, WebP, or GIF files." };
    }
    if (typeof file.size === "number" && file.size > maxBytes) {
        return { error: `Images must not exceed ${Math.floor(maxBytes / 1024 / 1024)} MB.` };
    }
    return {};
}

/**
 * Verify the actual file signature (magic bytes) matches an allowed image
 * format. The browser-supplied MIME type and filename are not trusted — an
 * attacker can label an HTML/SVG/executable file as image/png. Returns a
 * matching MIME string, or null when the signature is not a known image.
 */
export function sniffImageMagicBytes(buffer) {
    if (!buffer || buffer.length < 12) return null;
    const bytes = [...buffer.subarray(0, 12)];
    const hex = bytes.map((b) => b.toString(16).padStart(2, "0")).join(" ");

    if (hex.startsWith("ff d8 ff")) return "image/jpeg";
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
    if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) return "image/gif";
    // WebP: RIFF....WEBP
    if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
        bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return "image/webp";
    return null;
}

export function getSafeOrigin(request) {
    const configuredOrigin = process.env.NEXT_PUBLIC_APP_URL || "https://abumarketplace.shop";
    const allowedOrigins = new Set([
        configuredOrigin,
        "https://abumarketplace.shop",
        "https://www.abumarketplace.shop",
        "http://localhost:3000",
    ]);

    const origin = request.headers.get("origin");
    return allowedOrigins.has(origin) ? origin : configuredOrigin;
}

// ─── Rate limiting (single-instance, in-memory) ────────────────────────────
// For multi-instance deployments this should be swapped for a shared store
// (e.g. Redis) — the interface is intentionally identical.

export function createRateLimiter({ windowMs = 60_000, max = 20 } = {}) {
    const hits = new Map();

    const prune = () => {
        const now = Date.now();
        for (const [key, entry] of hits) {
            if (now - entry.resetAt > windowMs) hits.delete(key);
        }
    };

    return {
        check(key) {
            if (!key) return { allowed: true };
            if (hits.size > 10_000) prune();

            const now = Date.now();
            const entry = hits.get(key);
            if (!entry || now > entry.resetAt) {
                hits.set(key, { count: 1, resetAt: now + windowMs });
                return { allowed: true, remaining: max - 1 };
            }
            entry.count += 1;
            if (entry.count > max) {
                return { allowed: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
            }
            return { allowed: true, remaining: max - entry.count };
        },
        // Test/teardown hook.
        _clear() {
            hits.clear();
        },
    };
}

// Shared limiters for payment-sensitive endpoints. Webhook endpoints get a
// generous limit because providers legitimately retry delivery; signature
// verification remains the real gate.
export const checkoutRateLimiter = createRateLimiter({ windowMs: 60_000, max: 15 });
export const paymentStatusRateLimiter = createRateLimiter({ windowMs: 60_000, max: 30 });
export const refundRateLimiter = createRateLimiter({ windowMs: 60_000, max: 20 });
export const webhookRateLimiter = createRateLimiter({ windowMs: 60_000, max: 120 });
export const walletTopupRateLimiter = createRateLimiter({ windowMs: 60_000, max: 10 });
export const ratingRateLimiter = createRateLimiter({ windowMs: 60_000, max: 15 });
export const verificationSendRateLimiter = createRateLimiter({ windowMs: 10 * 60_000, max: 3 });
export const verificationVerifyRateLimiter = createRateLimiter({ windowMs: 10 * 60_000, max: 20 });
export const supportAIRateLimiter = createRateLimiter({ windowMs: 60_000, max: 20 });
export const supportNotifyRateLimiter = createRateLimiter({ windowMs: 10 * 60_000, max: 5 });
export const adminSupportReplyRateLimiter = createRateLimiter({ windowMs: 60_000, max: 30 });
export const pdfRateLimiter = createRateLimiter({ windowMs: 10 * 60_000, max: 10 });

export function normalizeCoupon(coupon) {
    if (!coupon || typeof coupon !== "object" || Array.isArray(coupon)) {
        return { error: "Coupon details are required." };
    }

    const code = sanitizeText(coupon.code, 32).toUpperCase();
    const description = sanitizeText(coupon.description, 200);
    const discount = Number(coupon.discount);
    const expiresAt = new Date(coupon.expiresAt);

    if (!/^[A-Z0-9_-]{3,32}$/.test(code)) {
        return { error: "Coupon code must be 3-32 letters, numbers, underscores, or dashes." };
    }
    if (!description) {
        return { error: "Coupon description is required." };
    }
    if (!Number.isFinite(discount) || discount <= 0 || discount > 90) {
        return { error: "Coupon discount must be between 1 and 90 percent." };
    }
    if (Number.isNaN(expiresAt.getTime()) || expiresAt <= new Date()) {
        return { error: "Coupon expiry must be a future date." };
    }

    return {
        coupon: {
            code,
            description,
            discount,
            forNewUser: Boolean(coupon.forNewUser),
            forMember: Boolean(coupon.forMember),
            isPublic: Boolean(coupon.isPublic),
            expiresAt,
        },
    };
}
