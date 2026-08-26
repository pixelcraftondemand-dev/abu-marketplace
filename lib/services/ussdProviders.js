// ─── AMBER PAY — USSD Provider Interface ──────────────────────────────────────
//
// Pluggable provider system for USSD gateways. Each provider implements
// the same interface, so we can switch gateways without changing the
// USSD menu logic.
//
// Supported providers:
//   - africastalking: Africa's Talking (most popular in Africa)
//   - beem: Beem Africa
//   - custom: Generic HTTP callback (any gateway)
//
// Set USSD_PROVIDER env var to select (default: "africastalking").

// ─── Provider Interface ───────────────────────────────────────────────────────

/**
 * @typedef {Object} UssdProvider
 * @property {string} name - Provider name
 * @property {Function} validateRequest - Validate incoming request signature
 * @property {Function} parseRequest - Parse provider-specific request format
 * @property {Function} formatResponse - Format response for provider
 */

// ─── Africa's Talking ─────────────────────────────────────────────────────────

const africastalking = {
    name: "africastalking",

    /**
     * Validate Africa's Talking request.
     * AT uses a username + API key in the request body.
     */
    validateRequest(body, headers) {
        const username = process.env.AT_USSD_USERNAME;
        const apiKey = process.env.AT_USSD_API_KEY;

        // In sandbox, validation is relaxed
        if (process.env.NODE_ENV !== "production") return true;

        // Validate against configured credentials
        if (username && body.username !== username) {
            console.warn("[USSD/AT] Invalid username:", body.username);
            return false;
        }
        return true;
    },

    /**
     * Parse Africa's Talking USSD request.
     * AT sends: { sessionId, phoneNumber, serviceCode, text }
     */
    parseRequest(body) {
        return {
            sessionId: body.sessionId || "",
            phoneNumber: body.phoneNumber || body.phone || "",
            serviceCode: body.serviceCode || "",
            text: body.text || "",
        };
    },

    /**
     * Format response for Africa's Talking.
     * AT expects plain text with CON/END prefix.
     */
    formatResponse(ussdResponse) {
        return ussdResponse; // Already in CON/END format
    },
};

// ─── Beem Africa ──────────────────────────────────────────────────────────────

const beem = {
    name: "beem",

    validateRequest(body, headers) {
        // Beem uses a secret hash for validation
        const secret = process.env.BEEM_USSD_SECRET;
        if (!secret) return true; // Skip in dev

        const signature = headers.get("x-beem-signature");
        if (!signature) return false;

        // TODO: Implement HMAC signature verification
        return true;
    },

    parseRequest(body) {
        return {
            sessionId: body.session_id || body.sessionId || "",
            phoneNumber: body.phone_number || body.phoneNumber || body.phone || "",
            serviceCode: body.service_code || body.serviceCode || "",
            text: body.text || "",
        };
    },

    formatResponse(ussdResponse) {
        // Beem also uses CON/END format
        return ussdResponse;
    },
};

// ─── Custom / Generic Provider ────────────────────────────────────────────────

const custom = {
    name: "custom",

    validateRequest(body, headers) {
        // Validate using a shared secret in the header
        const secret = process.env.USSD_WEBHOOK_SECRET;
        if (!secret) return true;
        const provided = headers.get("x-webhook-secret");
        return provided === secret;
    },

    parseRequest(body) {
        // Flexible parsing — accept various field names
        return {
            sessionId: body.sessionId || body.session_id || body.id || "",
            phoneNumber: body.phoneNumber || body.phone_number || body.phone || body.msisdn || "",
            serviceCode: body.serviceCode || body.service_code || body.short_code || "",
            text: body.text || body.input || body.dial || "",
        };
    },

    formatResponse(ussdResponse) {
        return ussdResponse;
    },
};

// ─── Provider Registry ────────────────────────────────────────────────────────

const providers = {
    africastalking,
    beem,
    custom,
};

/**
 * Get the configured USSD provider.
 */
export function getProvider() {
    const name = (process.env.USSD_PROVIDER || "africastalking").toLowerCase();
    const provider = providers[name];
    if (!provider) {
        console.warn(`[USSD] Unknown provider "${name}", falling back to africastalking`);
        return africastalking;
    }
    return provider;
}

/**
 * Validate an incoming USSD request using the configured provider.
 */
export function validateUssdRequest(body, headers) {
    const provider = getProvider();
    return provider.validateRequest(body, headers);
}

/**
 * Parse an incoming USSD request using the configured provider.
 */
export function parseUssdRequest(body) {
    const provider = getProvider();
    return provider.parseRequest(body);
}

/**
 * Format a USSD response using the configured provider.
 */
export function formatUssdResponse(ussdResponse) {
    const provider = getProvider();
    return provider.formatResponse(ussdResponse);
}

export default providers;
