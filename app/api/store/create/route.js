// ─────────────────────────────────────────────────────────────────────────────
// FILEPATH: app/api/store/create/route.js
// ─────────────────────────────────────────────────────────────────────────────
import prisma from "@/lib/prisma";
import imagekit from "@/configs/imageKit";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// ── Constants ─────────────────────────────────────────────────────────────────
const USERNAME_REGEX  = /^[a-z0-9_]{3,30}$/;
const PHONE_REGEX     = /^\+?[0-9\s\-(). ]{7,20}$/;
const MAX_LOGO_BYTES  = 2 * 1024 * 1024; // 2 MB
const ALLOWED_MIME    = ["image/jpeg", "image/png", "image/webp", "image/gif"];

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Trims and hard-caps a string — prevents oversized payloads reaching the DB */
function sanitize(value, maxLen) {
    if (typeof value !== "string") return "";
    return value.trim().slice(0, maxLen);
}

/** Returns an array of error strings, empty if all fields are valid */
function validateFields({ name, username, description, email, contact, address }) {
    const errors = [];

    if (!name || name.length < 2 || name.length > 100)
        errors.push("Store name must be 2–100 characters.");

    if (!USERNAME_REGEX.test(username))
        errors.push("Username must be 3–30 characters: lowercase letters, numbers, and underscores only.");

    if (!description || description.length < 10 || description.length > 1000)
        errors.push("Description must be 10–1000 characters.");

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        errors.push("A valid store email is required.");

    if (!contact || !PHONE_REGEX.test(contact))
        errors.push("A valid contact number is required.");

    if (!address || address.length < 5 || address.length > 300)
        errors.push("Address must be 5–300 characters.");

    return errors;
}

// ── GET /api/store/create ─────────────────────────────────────────────────────
// Returns the current user's store application status, or null if none exists.

export async function GET(request) {
    try {
        const { userId } = getAuth(request);

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
        }

        const store = await prisma.store.findUnique({
            where:  { userId },
            select: { status: true },
        });

        return NextResponse.json({ status: store?.status ?? null });

    } catch (error) {
        console.error("[GET /api/store/create]", error);
        return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
    }
}

// ── POST /api/store/create ────────────────────────────────────────────────────
// Validates all fields, uploads logo to ImageKit, creates store with status
// "pending" and isActive false — ready for admin review.

export async function POST(request) {
    try {
        const { userId } = getAuth(request);

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
        }

        // Confirm this user exists in our DB (synced via Clerk webhook)
        const dbUser = await prisma.user.findUnique({
            where:  { id: userId },
            select: { id: true, store: { select: { id: true, status: true } } },
        });

        if (!dbUser) {
            return NextResponse.json(
                { error: "User account not found. Please sign out and sign back in." },
                { status: 404 }
            );
        }

        // One application per account, any status
        if (dbUser.store) {
            return NextResponse.json(
                { error: `You already have a store application (status: "${dbUser.store.status}"). Only one application is allowed per account.` },
                { status: 409 }
            );
        }

        // Parse multipart form data
        const formData = await request.formData();

        const name        = sanitize(formData.get("name")        ?? "", 100);
        const username    = sanitize(formData.get("username")    ?? "", 30).toLowerCase();
        const description = sanitize(formData.get("description") ?? "", 1000);
        const email       = sanitize(formData.get("email")       ?? "", 254);
        const contact     = sanitize(formData.get("contact")     ?? "", 20);
        const address     = sanitize(formData.get("address")     ?? "", 300);
        const imageFile   = formData.get("image");

        // Server-side field validation
        const errors = validateFields({ name, username, description, email, contact, address });
        if (errors.length) {
            return NextResponse.json({ error: errors.join(" ") }, { status: 422 });
        }

        // Validate image presence and type
        if (!imageFile || typeof imageFile === "string") {
            return NextResponse.json({ error: "A store logo image is required." }, { status: 422 });
        }
        if (!ALLOWED_MIME.includes(imageFile.type)) {
            return NextResponse.json(
                { error: "Logo must be a JPEG, PNG, WebP, or GIF image." },
                { status: 422 }
            );
        }

        const imageBuffer = Buffer.from(await imageFile.arrayBuffer());

        if (imageBuffer.byteLength > MAX_LOGO_BYTES) {
            return NextResponse.json({ error: "Logo must not exceed 2 MB." }, { status: 422 });
        }

        // Check username uniqueness BEFORE uploading to ImageKit
        // (avoids orphaned uploads if this check would have blocked anyway)
        const takenUsername = await prisma.store.findUnique({
            where:  { username },
            select: { id: true },
        });

        if (takenUsername) {
            return NextResponse.json(
                { error: "That username is already taken. Please choose a different one." },
                { status: 409 }
            );
        }

        // Upload logo to ImageKit
        const upload = await imagekit.upload({
            file:              imageBuffer,
            fileName:          `store-logo-${userId}-${Date.now()}`,
            folder:            "/store-logos",
            useUniqueFileName: true,
        });

        if (!upload?.url) {
            return NextResponse.json(
                { error: "Logo upload failed. Please try again." },
                { status: 500 }
            );
        }

        // Create the store — Prisma uses parameterized queries internally,
        // so there is zero SQL injection risk here regardless of input content.
        await prisma.store.create({
            data: {
                userId,
                name,
                username,
                description,
                email,
                contact,
                address,
                logo:     upload.url,
                status:   "pending",
                isActive: false,
            },
        });

        return NextResponse.json(
            { message: "Your store application has been submitted and is pending admin review." },
            { status: 201 }
        );

    } catch (error) {
        console.error("[POST /api/store/create]", error);

        // P2002 = Prisma unique constraint violation (race condition on username)
        if (error.code === "P2002") {
            const field = error.meta?.target?.includes("username") ? "username" : "account";
            return NextResponse.json(
                { error: `A store with that ${field} already exists. Please choose a different one.` },
                { status: 409 }
            );
        }

        return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
    }
}