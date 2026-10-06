// ──────────────────────────────────────────────────────────────────────────────
// FILEPATH: app/api/store/create/route.js
// ──────────────────────────────────────────────────────────────────────────────
import prisma from "@/lib/prisma";
import getImageKit from "@/configs/imageKit";
import { sniffImageMagicBytes, sanitizeText, storeCreateRateLimiter } from "@/lib/security";
import { getSessionFromRequest } from "@/lib/serverAuth";
import { isValidWhatsAppNumber, normalizeWhatsAppNumber } from "@/lib/utils/whatsapp";
import { STORE_STATUS, canResubmit } from "@/lib/services/storeApproval";
import { sendStoreApplicationReceivedEmail } from "@/lib/services/storeApplicationEmail";
import { NextResponse } from "next/server";

// ── Constants ──────────────────────────────────────────────────────────────────
const USERNAME_REGEX  = /^[a-z0-9_]{3,30}$/;
const PHONE_REGEX     = /^\+?[0-9\s\-(). ]{7,20}$/;
const MAX_LOGO_BYTES  = 2 * 1024 * 1024; // 2 MB
const ALLOWED_MIME    = ["image/jpeg", "image/png", "image/webp", "image/gif"];

// ── Helpers ────────────────────────────────────────────────────────────────────

function sanitize(value, maxLen) {
    return sanitizeText(value, maxLen);
}

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

// ── GET /api/store/create ──────────────────────────────────────────────────────

export async function GET(request) {
    try {
        const session = await getSessionFromRequest(request);
        const userId = session?.user?.id;

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
        }

        const store = await prisma.store.findUnique({
            where:  { userId },
            select: {
                status: true,
                username: true,
                rejectionReason: true,
                // The editable fields are returned so a rejected seller can fix
                // their application instead of retyping all of it.
                name: true,
                description: true,
                email: true,
                contact: true,
                whatsappNumber: true,
                address: true,
                logo: true,
            },
        });

        return NextResponse.json({
            status: store?.status ?? null,
            storeUsername: store?.username ?? null,
            // Shown on the application page so a rejected seller knows exactly
            // what to fix before resubmitting.
            rejectionReason: store?.rejectionReason ?? null,
            canResubmit: canResubmit(store?.status),
            store: store
                ? {
                      name: store.name,
                      username: store.username,
                      description: store.description,
                      email: store.email,
                      contact: store.contact,
                      whatsappNumber: store.whatsappNumber || "",
                      address: store.address,
                      logo: store.logo,
                  }
                : null,
        });

    } catch (error) {
        console.error("[GET /api/store/create]", error);
        return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
    }
}

// ── POST /api/store/create ─────────────────────────────────────────────────────

export async function POST(request) {
    try {
        const session = await getSessionFromRequest(request);
        const userId = session?.user?.id;

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
        }

        // Store applications include a logo upload — bound them per account.
        const rl = await storeCreateRateLimiter.check(userId);
        if (!rl.allowed) {
            return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429, headers: { "Retry-After": String(rl.retryAfter || 600) } });
        }

        const dbUser = await prisma.user.findUnique({
            where:  { id: userId },
            select: { id: true, email: true, name: true, store: { select: { id: true, status: true } } },
        });

        if (!dbUser) {
            return NextResponse.json(
                { error: "User account not found. Please sign out and sign back in." },
                { status: 404 }
            );
        }

        // One store per account. A rejected application stays on file so the
        // seller can fix it and resubmit — an approved or in-review application
        // blocks further submissions.
        const existingStore = dbUser.store;
        const isResubmission = Boolean(existingStore && canResubmit(existingStore.status));

        if (existingStore && !isResubmission) {
            const message =
                existingStore.status === STORE_STATUS.APPROVED
                    ? "You already have an approved store. Manage it from your store dashboard."
                    : "Your store application is still under review. We'll email you as soon as it's decided.";
            return NextResponse.json({ error: message }, { status: 409 });
        }

        const formData = await request.formData();

        const name        = sanitize(formData.get("name")        ?? "", 100);
        const username    = sanitize(formData.get("username")    ?? "", 30).toLowerCase();
        const description = sanitize(formData.get("description") ?? "", 1000);
        const email       = sanitize(formData.get("email")       ?? "", 254);
        const contact     = sanitize(formData.get("contact")     ?? "", 20);
        const address     = sanitize(formData.get("address")     ?? "", 300);
        const imageFile   = formData.get("image");

        // WhatsApp is optional, but when supplied it must be a usable number.
        const whatsappRaw = String(formData.get("whatsappNumber") ?? "").trim();
        const whatsappNumber = normalizeWhatsAppNumber(whatsappRaw);

        const errors = validateFields({ name, username, description, email, contact, address });
        if (whatsappRaw && !isValidWhatsAppNumber(whatsappRaw)) {
            errors.push("WhatsApp number must be a valid phone number.");
        }
        if (errors.length) {
            return NextResponse.json({ error: errors.join(" ") }, { status: 422 });
        }

        // A resubmitting seller keeps their existing logo unless they upload a
        // new one; a first-time applicant must provide one.
        const hasNewLogo = imageFile && typeof imageFile !== "string";

        let existingLogo = null;
        if (isResubmission) {
            const current = await prisma.store.findUnique({
                where:  { id: existingStore.id },
                select: { logo: true },
            });
            existingLogo = current?.logo ?? null;
        }

        if (!hasNewLogo && !existingLogo) {
            return NextResponse.json({ error: "A store logo image is required." }, { status: 422 });
        }

        let imageBuffer = null;
        if (hasNewLogo) {
            if (!ALLOWED_MIME.includes(imageFile.type)) {
                return NextResponse.json(
                    { error: "Logo must be a JPEG, PNG, WebP, or GIF image." },
                    { status: 422 }
                );
            }

            imageBuffer = Buffer.from(await imageFile.arrayBuffer());

            if (imageBuffer.byteLength > MAX_LOGO_BYTES) {
                return NextResponse.json({ error: "Logo must not exceed 2 MB." }, { status: 422 });
            }

            // Never trust the browser MIME type — verify the actual file signature.
            if (!sniffImageMagicBytes(imageBuffer)) {
                return NextResponse.json(
                    { error: "Logo file is not a valid image." },
                    { status: 422 }
                );
            }
        }

        // A resubmitting seller may keep their existing username, so exclude
        // their own row from the availability check.
        const takenUsername = await prisma.store.findFirst({
            where: {
                username,
                ...(isResubmission ? { id: { not: existingStore.id } } : {}),
            },
            select: { id: true },
        });

        if (takenUsername) {
            return NextResponse.json(
                { error: "That username is already taken. Please choose a different one." },
                { status: 409 }
            );
        }

        const imagekit = getImageKit();
        let upload = null;

        if (imageBuffer) {
            upload = await imagekit.upload({
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
        }

        const application = {
            name,
            username,
            description,
            email,
            contact,
            address,
            whatsappNumber,
            logo:     upload?.url || existingLogo,
            status:   STORE_STATUS.PENDING,
            isActive: false,
            // A fresh submission starts a clean review: clear the old reason
            // and review trail so the admin sees it as new work.
            rejectionReason: null,
            reviewedAt:      null,
            reviewedBy:      null,
        };

        try {
            if (isResubmission) {
                await prisma.store.update({ where: { id: existingStore.id }, data: application });
            } else {
                await prisma.store.create({ data: { userId, ...application } });
            }
        } catch (writeError) {
            // The logo is already on ImageKit — don't leave an orphan behind
            // when the row could not be written.
            try {
                if (upload?.fileId) await imagekit.deleteFile(upload.fileId);
            } catch (cleanupError) {
                console.error("[POST /api/store/create] logo cleanup failed", cleanupError);
            }
            throw writeError;
        }

        // Best-effort: the team is alerted so the application is not a silent
        // black hole in the admin queue. Never fails the submission.
        await sendStoreApplicationReceivedEmail({
            storeName: name,
            username,
            ownerName: dbUser.name,
            ownerEmail: dbUser.email,
            storeEmail: email,
            applicantEmail: email,
        });

        return NextResponse.json(
            {
                message: isResubmission
                    ? "Your updated application has been submitted and is pending admin review."
                    : "Your store application has been submitted and is pending admin review.",
                status: STORE_STATUS.PENDING,
                canResubmit: false,
            },
            { status: isResubmission ? 200 : 201 }
        );

    } catch (error) {
        console.error("[POST /api/store/create]", error);

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
