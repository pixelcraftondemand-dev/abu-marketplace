// ─── AMBER PAY — Generate Payment Code ────────────────────────────────────────
//
// POST /api/wallet/payment-code
//
// Generates a payment code for USSD mobile money deposit.
// User dials *123*CODE# on their phone to complete the payment.

import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionFromRequest } from "@/lib/serverAuth";
import { walletTopupRateLimiter } from "@/lib/security";
import { generatePaymentCode } from "@/lib/services/ussdService";

const schema = z.object({
    amount: z.number().min(1).max(10000),
    type: z.enum(["DEPOSIT", "WITHDRAWAL", "CHECKOUT"]).optional().default("DEPOSIT"),
});

export async function POST(request) {
    try {
        const session = await getSessionFromRequest(request);
        const userId = session?.user?.id;
        if (!userId) {
            return NextResponse.json({ error: "not authorized" }, { status: 401 });
        }

        const rl = await walletTopupRateLimiter.check(userId);
        if (!rl.allowed) {
            return NextResponse.json(
                { error: "Too many attempts. Please wait." },
                { status: 429, headers: { "Retry-After": String(rl.retryAfter || 60) } }
            );
        }

        let parsed;
        try {
            const body = await request.json();
            const result = schema.safeParse(body);
            if (!result.success) {
                return NextResponse.json({ error: "Invalid details." }, { status: 422 });
            }
            parsed = result.data;
        } catch {
            return NextResponse.json({ error: "Invalid details." }, { status: 400 });
        }

        const code = await generatePaymentCode(userId, {
            amount: parsed.amount,
            type: parsed.type,
        });

        return NextResponse.json({
            code: code.code,
            dialCode: code.dialCode,
            amount: code.amount,
            type: code.type,
            expiresAt: code.expiresAt,
            instructions: [
                `Copy the code: ${code.dialCode}`,
                `Dial ${code.dialCode} on your phone`,
                `Choose SIM 1 (Orange) or SIM 2 (Afrimoney)`,
                `Enter your mobile money PIN`,
                `Done! Wallet credited instantly`,
            ],
        });
    } catch (error) {
        console.error("[POST /api/wallet/payment-code]", error);
        return NextResponse.json({ error: "Unable to generate code." }, { status: 500 });
    }
}
