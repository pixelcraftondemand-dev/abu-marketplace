import { NextResponse } from "next/server";

export async function GET() {
    const requiredEnv = [
        "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
        "CLERK_SECRET_KEY",
        "DATABASE_URL",
        "DIRECT_URL",
    ];
    const missing = requiredEnv.filter((key) => !process.env[key]);
    const isProduction = process.env.NODE_ENV === "production";

    return NextResponse.json({
        ok: missing.length === 0,
        ...(isProduction ? {} : {
            missing,
            clerkPublishableKeySet: Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY),
            clerkSecretKeySet: Boolean(process.env.CLERK_SECRET_KEY),
            databaseUrlSet: Boolean(process.env.DATABASE_URL),
            directUrlSet: Boolean(process.env.DIRECT_URL),
        }),
    });
}
