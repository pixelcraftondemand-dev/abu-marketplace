import { NextResponse } from "next/server";
import { z } from "zod";
import Stripe from "stripe";
import { getSessionFromRequest } from "@/lib/serverAuth";
import { premiumTiers } from "@/lib/pricingPlans";
import { getSafeOrigin } from "@/lib/security";

const checkoutSchema = z.object({
  tierId: z.enum(["explorer", "plus", "pro"]).default("plus"),
});

const getStripe = () => new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(request) {
  try {
    const session = await getSessionFromRequest(request);
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "not authorized" }, { status: 401 });
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

    const stripe = getStripe();
    const origin = getSafeOrigin(request);
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: tier.priceMonthly * 100,
            product_data: {
              name: `${tier.name} Membership`,
              description: tier.description,
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}/pricing?status=success&tier=${tier.id}`,
      cancel_url: `${origin}/pricing?status=cancelled&tier=${tier.id}`,
      metadata: {
        appId: "abu-marketplace",
        userId,
        tierId: tier.id,
        subscriptionType: "membership",
      },
    });

    return NextResponse.json({ session: checkoutSession });
  } catch (error) {
    console.error("[subscriptions/checkout]", error);
    return NextResponse.json({ error: "Unable to start checkout." }, { status: 400 });
  }
}
