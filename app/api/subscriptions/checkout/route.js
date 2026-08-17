import { NextResponse } from "next/server";
import { z } from "zod";
import { getVerifiedUserFromRequest } from "@/lib/serverAuth";
import { premiumTiers } from "@/lib/pricingPlans";
import { getSafeOrigin, subscriptionCheckoutRateLimiter } from "@/lib/security";
import { initiatePayment } from "@/lib/services/flutterwave";

const checkoutSchema = z.object({
  tierId: z.enum(["explorer", "plus", "pro"]).default("plus"),
});

export async function POST(request) {
  try {
    // Membership checkout moves money — require a verified email server-side
    // (Flutterwave needs the customer email; verification is the same gate
    // used by orders and wallet top-ups).
    const verifiedUser = await getVerifiedUserFromRequest();
    const userId = verifiedUser?.id;
    if (!userId) {
      return NextResponse.json({ error: "not authorized" }, { status: 401 });
    }
    if (!verifiedUser.email) {
      return NextResponse.json({ error: "Unable to start checkout." }, { status: 403 });
    }

    // Each request creates a real Flutterwave hosted payment — bound per user.
    const rl = await subscriptionCheckoutRateLimiter.check(userId);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429, headers: { "Retry-After": String(rl.retryAfter || 600) } });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = checkoutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid tier selection." }, { status: 422 });
    }

    const tier = premiumTiers.find((entry) => entry.id === parsed.data.tierId);
    if (!tier) {
      return NextResponse.json({ error: "Unsupported tier." }, { status: 400 });
    }

    if (tier.priceMonthly === 0) {
      return NextResponse.json({ error: "The Explorer plan is free and does not require checkout." }, { status: 400 });
    }

    const origin = getSafeOrigin(request);

    // Membership purchase is a one-time payment — the verified
    // charge.completed webhook grants the membership. tx_ref is a unique
    // per-request reference; the webhook correlates via meta.
    const txRef = `mem_${userId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const hosted = await initiatePayment({
      txRef,
      amount: tier.priceMonthly,
      currency: "USD",
      redirectUrl: `${origin}/pricing?status=success&tier=${tier.id}`,
      customer: {
        email: verifiedUser.email,
        name: verifiedUser.name || undefined,
      },
      meta: {
        appId: "abu-marketplace",
        userId,
        tierId: tier.id,
        subscriptionType: "membership",
      },
      customizations: { description: `${tier.name} Membership` },
    });

    return NextResponse.json({ session: { url: hosted.link } });
  } catch (error) {
    console.error("[subscriptions/checkout]", error);
    return NextResponse.json({ error: "Unable to start checkout." }, { status: 400 });
  }
}
