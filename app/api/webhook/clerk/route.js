import { Webhook } from "svix";
import { headers } from "next/headers";
import { inngest } from "@/inngest/client";
import { clerkWebhookRateLimiter } from "@/lib/security";
import { hashIp } from "@/lib/paymentLog";

export async function POST(request) {
    // Signature verification is the real gate, but a generous per-IP limit
    // stops replay/flood abuse of the Inngest dispatch.
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rl = await clerkWebhookRateLimiter.check(hashIp(ip));
    if (!rl.allowed) {
        return new Response("Too many requests", { status: 429, headers: { "Retry-After": String(rl.retryAfter || 600) } });
    }

    const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

    if (!WEBHOOK_SECRET) {
        console.error("[Clerk Webhook] CLERK_WEBHOOK_SECRET is not set.");
        return new Response("Server misconfiguration", { status: 500 });
    }

    const headerPayload = await headers();
    const svix_id        = headerPayload.get("svix-id");
    const svix_timestamp = headerPayload.get("svix-timestamp");
    const svix_signature = headerPayload.get("svix-signature");

    if (!svix_id || !svix_timestamp || !svix_signature) {
        return new Response("Missing Svix headers", { status: 400 });
    }

    const payload = await request.text();
    const wh = new Webhook(WEBHOOK_SECRET);
    let evt;

    try {
        evt = wh.verify(payload, {
            "svix-id":        svix_id,
            "svix-timestamp": svix_timestamp,
            "svix-signature": svix_signature,
        });
    } catch (err) {
        console.error("[Clerk Webhook] Signature verification failed:", err.message);
        return new Response("Invalid signature", { status: 400 });
    }

    try {
        await inngest.send({ name: evt.type, data: evt.data });
    } catch (err) {
        console.error("[Clerk Webhook] Failed to send to Inngest:", err.message);
        return new Response("Failed to process event", { status: 500 });
    }

    return new Response("OK", { status: 200 });
}