// ─── AMBER PAY — USSD Gateway Callback ────────────────────────────────────────
//
// POST /api/ussd
//
// Receives USSD session callbacks from the gateway (Africa's Talking, Beem,
// etc.) and returns the next menu prompt.
//
// Gateway sends:
//   - sessionId: unique session identifier
//   - phoneNumber: user's phone number
//   - serviceCode: USSD short code (e.g. "*123#")
//   - text: user's input so far (e.g. "1*50")
//
// We respond with:
//   - "CON <text>" — continue session (show menu, wait for input)
//   - "END <text>" — end session (show message, close)

import { NextResponse } from "next/server";
import { processUssdRequest } from "@/lib/services/ussdService";
import { validateUssdRequest, parseUssdRequest, formatUssdResponse } from "@/lib/services/ussdProviders";

export async function POST(request) {
    try {
        const body = await request.json();

        // Validate request using configured provider
        if (!validateUssdRequest(body, request.headers)) {
            return new NextResponse("END Unauthorized.", { status: 401 });
        }

        // Parse request using configured provider
        const { sessionId, phoneNumber, serviceCode, text } = parseUssdRequest(body);

        if (!phoneNumber) {
            return new NextResponse("END Missing phone number.", { status: 400 });
        }

        // Process the USSD request through our menu system
        const rawResponse = await processUssdRequest({
            phoneNumber: normalizePhone(phoneNumber),
            text: text || "",
            sessionId: sessionId || "",
            serviceCode: serviceCode || "",
        });

        // Format response using configured provider
        const response = formatUssdResponse(rawResponse);

        // USSD responses must be plain text — no JSON
        return new NextResponse(response, {
            status: 200,
            headers: { "Content-Type": "text/plain" },
        });
    } catch (error) {
        console.error("[POST /api/ussd]", error);
        return new NextResponse("END An error occurred. Please try again.", {
            status: 200, // Return 200 so the gateway shows our error message
            headers: { "Content-Type": "text/plain" },
        });
    }
}

// Also handle GET for health checks / testing
export async function GET() {
    return new NextResponse(
        "AMBER PAY USSD Gateway — Active\n" +
        "Short code: *123#\n" +
        "Send POST requests with: sessionId, phoneNumber, serviceCode, text",
        { status: 200, headers: { "Content-Type": "text/plain" } }
    );
}

/**
 * Normalize phone number to E.164 format.
 * Sierra Leone numbers: +232 XX XXX XXXX
 */
function normalizePhone(phone) {
    if (!phone) return phone;
    // Strip whitespace and dashes
    let cleaned = phone.replace(/[\s\-()]/g, "");
    // If starts with 232, add +
    if (cleaned.startsWith("232") && !cleaned.startsWith("+")) {
        cleaned = "+" + cleaned;
    }
    // If starts with 0, replace with +232
    if (cleaned.startsWith("0")) {
        cleaned = "+232" + cleaned.slice(1);
    }
    // If doesn't start with +, add it
    if (!cleaned.startsWith("+")) {
        cleaned = "+" + cleaned;
    }
    return cleaned;
}
