// ─── AMBER PAY — Payment Code Status ──────────────────────────────────────────
//
// GET /api/wallet/payment-code/status?code=XXXXXX
//
// Returns the current status of a payment code.
// The web app polls this after showing the code to the user.

import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/serverAuth";
import { getPaymentCodeStatus } from "@/lib/services/ussdService";

export async function GET(request) {
    try {
        const session = await getSessionFromRequest(request);
        const userId = session?.user?.id;
        if (!userId) {
            return NextResponse.json({ error: "not authorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const code = searchParams.get("code");

        if (!code || code.length !== 6) {
            return NextResponse.json({ error: "Invalid code." }, { status: 422 });
        }

        const status = await getPaymentCodeStatus(code);

        if (!status) {
            return NextResponse.json({ error: "Code not found." }, { status: 404 });
        }

        return NextResponse.json({ code: status });
    } catch (error) {
        console.error("[GET /api/wallet/payment-code/status]", error);
        return NextResponse.json({ error: "Unable to check status." }, { status: 500 });
    }
}
