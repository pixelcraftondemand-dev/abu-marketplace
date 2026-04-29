// ─────────────────────────────────────────────────────────────────────────────
// FILEPATH: app/api/admin/is-admin/route.js
// ─────────────────────────────────────────────────────────────────────────────
import authAdmin from "@/middlewares/authAdmin";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function GET(request) {
    try {
        const { userId, sessionClaims } = getAuth(request);
        const isAdmin = await authAdmin(userId, sessionClaims);

        if (!isAdmin) {
            return NextResponse.json({ isAdmin: false }, { status: 200 });
        }

        return NextResponse.json({ isAdmin: true });
    } catch (error) {
        console.error("[GET /api/admin/is-admin]", error);
        return NextResponse.json({ isAdmin: false }, { status: 500 });
    }
}