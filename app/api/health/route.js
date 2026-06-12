import { NextResponse } from "next/server";

export async function GET() {
    return NextResponse.json({
        ok: true,
        clerkPublishableKeySet: Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY),
        clerkSecretKeySet: Boolean(process.env.CLERK_SECRET_KEY),
        databaseUrlSet: Boolean(process.env.DATABASE_URL),
        directUrlSet: Boolean(process.env.DIRECT_URL),
    });
}
