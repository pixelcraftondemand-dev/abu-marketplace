// ─────────────────────────────────────────────────────────────────────────────
// FILEPATH: app/api/admin/is-admin/route.js
// ─────────────────────────────────────────────────────────────────────────────
import authAdmin from "@/middlewares/authAdmin";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function GET(request) {
    try {
        const { userId } = getAuth(request);
        const isAdmin = await authAdmin(userId);
        return NextResponse.json({ isAdmin: !!isAdmin });
    } catch (error) {
        console.error("[GET /api/admin/is-admin]", error);
        return NextResponse.json({ isAdmin: false }, { status: 500 });
    }
}