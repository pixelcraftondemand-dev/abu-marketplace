export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

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
