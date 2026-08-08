import prisma from "@/lib/prisma";
import crypto from "node:crypto";
import { z } from "zod";
import { getSafeOrigin, isValidId, checkoutRateLimiter } from "@/lib/security";
import { getSessionFromRequest, getVerifiedUserFromRequest } from "@/lib/serverAuth";
import { PaymentMethod } from "@prisma/client";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { isValidCurrency } from "@/lib/utils/currency";
import { isCashOnDeliveryAvailable } from "@/lib/paymentOptions";
import { reserveStock, releaseStock, StockUnavailableError } from "@/lib/services/paymentService";
import { debitWallet, WalletInsufficientFundsError } from "@/lib/services/walletService";
import { PAYMENT_STATES } from "@/lib/services/paymentState";
import { logPayment, getRequestId } from "@/lib/paymentLog";

const MAX_ORDER_ITEMS = 50;
const MAX_ITEM_QUANTITY = 99;
const DELIVERY_FEE = 5; // canonical USD
const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9._-]{8,128}$/;
const SESSION_REUSE_WINDOW_MS = 25 * 60 * 1000; // reuse an in-flight session for 25 min

// Runtime validation — never trust the client for amounts/prices. This schema
// only accepts ids, quantities, and the (display-only) currency.
const checkoutSchema = z.object({
  addressId: z.string().min(1).max(100),
  items: z
    .array(
      z.object({
        id: z.string().min(1).max(100),
        quantity: z.number().int().min(1).max(MAX_ITEM_QUANTITY),
      })
    )
    .min(1)
    .max(MAX_ORDER_ITEMS),
  paymentMethod: z.enum(["COD", "STRIPE", "WALLET"]),
  couponCode: z.string().trim().min(3).max(32).optional().nullable(),
  idempotencyKey: z.string().regex(IDEMPOTENCY_KEY_PATTERN).optional().nullable(),
  currency: z.string().max(8).optional().nullable(),
  country: z.string().trim().max(100).optional().nullable(),
});

export async function POST(request) {
  const requestId = getRequestId(request);
  let parsed;
  try {
    const body = await request.json();
    const result = checkoutSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid checkout details.", details: result.error.issues.map((i) => i.path.join(".")) },
        { status: 422 }
      );
    }
    parsed = result.data;
  } catch {
    return NextResponse.json({ error: "Invalid checkout details." }, { status: 400 });
  }

  try {
    const session = await getSessionFromRequest(request);
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "not authorized" }, { status: 401 });
    }

    // Rate limit per user — retries are safe via idempotency, so a modest limit
    // never blocks legitimate retries.
    const rl = checkoutRateLimiter.check(userId);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many attempts. Please wait a moment and try again." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfter || 60) } }
      );
    }

    const { addressId, items, couponCode, paymentMethod, currency, country } = parsed;
    const isStripe = paymentMethod === "STRIPE";

    if (!isValidId(addressId)) {
      return NextResponse.json({ error: "Invalid address." }, { status: 422 });
    }

    // Every order requires a verified email server-side, for all payment
    // methods. The client-side VerificationGate keeps unverified accounts off
    // the pages, and this check guarantees it at the API boundary — no client
    // state can bypass it, and OAuth sign-ins are subject to the same rule.
    const verifiedUser = await getVerifiedUserFromRequest();
    if (!verifiedUser) {
      return NextResponse.json(
        { error: "Please verify your email address before placing an order." },
        { status: 403 }
      );
    }

    // A client-supplied idempotency key makes retries provably single-charge.
    // When absent we generate one and return it so the client can reuse it.
    const idempotencyKey = (parsed.idempotencyKey || crypto.randomUUID()).slice(0, 128);

    if (currency != null && !isValidCurrency(currency)) {
      return NextResponse.json({ error: "Unsupported currency." }, { status: 422 });
    }

    // ── Idempotency: return the existing attempt instead of charging again ─────
    if (parsed.idempotencyKey) {
      const existing = await prisma.payment.findUnique({ where: { idempotencyKey } });
      if (existing) {
        if (existing.userId !== userId) {
          return NextResponse.json({ error: "Idempotency key is already in use." }, { status: 403 });
        }
        if (existing.status === PAYMENT_STATES.SUCCEEDED) {
          return NextResponse.json({ alreadyProcessed: true, paymentId: existing.id });
        }
        if (existing.providerSessionUrl && isStripe) {
          return NextResponse.json({ session: { url: existing.providerSessionUrl }, paymentId: existing.id, reused: true });
        }
        return NextResponse.json(
          { error: "Checkout already in progress.", paymentId: existing.id },
          { status: 409 }
        );
      }
    } else if (isStripe) {
      // Retry safety without a client key: if this user already has a live,
      // unexpired checkout session, return it instead of charging again.
      const recent = await prisma.payment.findFirst({
        where: {
          userId,
          status: { in: [PAYMENT_STATES.PENDING, PAYMENT_STATES.PROCESSING] },
          providerSessionUrl: { not: null },
        },
        orderBy: { createdAt: "desc" },
        select: { id: true, providerSessionUrl: true, createdAt: true },
      });
      if (recent && Date.now() - recent.createdAt.getTime() < SESSION_REUSE_WINDOW_MS) {
        return NextResponse.json({ session: { url: recent.providerSessionUrl }, paymentId: recent.id, reused: true });
      }
    } else if (paymentMethod === "WALLET") {
      // Retry safety without a client key for wallet payments: a wallet
      // checkout settles instantly, so a recent SUCCEEDED payment means the
      // previous attempt already went through — return alreadyProcessed
      // instead of debiting the wallet a second time.
      const recent = await prisma.payment.findFirst({
        where: {
          userId,
          status: PAYMENT_STATES.SUCCEEDED,
          createdAt: { gte: new Date(Date.now() - SESSION_REUSE_WINDOW_MS) },
        },
        orderBy: { createdAt: "desc" },
        select: { id: true, createdAt: true },
      });
      if (recent) {
        return NextResponse.json({ alreadyProcessed: true, paymentId: recent.id });
      }
    }

    if (!isValidId(addressId)) {
      return NextResponse.json({ error: "Invalid address." }, { status: 422 });
    }

    const address = await prisma.address.findFirst({
      where: { id: addressId, userId },
      select: { id: true, country: true },
    });

    if (!address) {
      return NextResponse.json({ error: "Address not found." }, { status: 404 });
    }

    if (paymentMethod === "COD" && !isCashOnDeliveryAvailable()) {
      return NextResponse.json({ error: "Cash on delivery is unavailable at the moment." }, { status: 403 });
    }

    // ── Coupon validation (server-side; usage limit enforced atomically later) ──
    let coupon = null;
    if (couponCode) {
      coupon = await prisma.coupon.findUnique({ where: { code: couponCode.toUpperCase() } });
      if (!coupon) {
        return NextResponse.json({ error: "Coupon not found" }, { status: 400 });
      }
      if (coupon.expiresAt < new Date()) {
        return NextResponse.json({ error: "Coupon has expired" }, { status: 400 });
      }
      if (coupon.discount < 0 || coupon.discount > 100) {
        return NextResponse.json({ error: "Coupon is invalid" }, { status: 400 });
      }
      if (coupon.forNewUser) {
        const userOrders = await prisma.order.findMany({ where: { userId } });
        if (userOrders.length > 0) {
          return NextResponse.json({ error: "Coupon valid for new users only." }, { status: 400 });
        }
      }
      if (coupon.forMember) {
        return NextResponse.json({ error: "Coupon valid for members only." }, { status: 400 });
      }
    }

    // ── Fetch canonical product prices and precompute totals ───────────────────
    const requestedItems = new Map();
    for (const item of items) {
      if (!isValidId(item.id)) {
        return NextResponse.json({ error: "Invalid product id." }, { status: 422 });
      }
      requestedItems.set(item.id, (requestedItems.get(item.id) || 0) + item.quantity);
    }

    const products = await prisma.product.findMany({
      where: { id: { in: [...requestedItems.keys()] } },
      select: { id: true, price: true, storeId: true, inStock: true },
    });

    if (products.length !== requestedItems.size) {
      return NextResponse.json({ error: "One or more products were not found." }, { status: 404 });
    }

    const ordersByStore = new Map();
    for (const product of products) {
      if (!product.inStock) {
        return NextResponse.json({ error: "One or more products are out of stock." }, { status: 400 });
      }
      if (!ordersByStore.has(product.storeId)) {
        ordersByStore.set(product.storeId, []);
      }
      ordersByStore.get(product.storeId).push({
        id: product.id,
        quantity: requestedItems.get(product.id),
        price: product.price, // canonical price — client never supplies amounts
      });
    }

    // Per-store totals from canonical prices only (client amounts are ignored).
    const storeTotals = [];
    let fullAmount = 0;
    let isDeliveryFeeAdded = false;
    for (const [storeId, sellerItems] of ordersByStore.entries()) {
      let total = sellerItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
      if (couponCode) {
        total -= (total * coupon.discount) / 100;
      }
      if (!isDeliveryFeeAdded) {
        total += DELIVERY_FEE;
        isDeliveryFeeAdded = true;
      }
      total = parseFloat(total.toFixed(2));
      fullAmount += total;
      storeTotals.push({ storeId, sellerItems, total });
    }
    fullAmount = parseFloat(fullAmount.toFixed(2));

    // ── Atomic transaction: payment + orders + inventory + coupon usage ─────────
    // A single transaction means a failure (stock, coupon, DB) rolls everything
    // back — no partial orders, no phantom reservations, no double decrements.
    let payment = null;
    let orderIds = [];
    try {
      await prisma.$transaction(async (tx) => {
        // Payment row for card (PENDING, verified later by webhook) and wallet
        // (SUCCEEDED — settled instantly from pre-funded balance). The unique
        // idempotencyKey means concurrent duplicates cannot both insert; the
        // loser hits P2002 below and returns the winner's outcome.
        if (paymentMethod !== "COD") {
          payment = await tx.payment.create({
            data: {
              idempotencyKey,
              userId,
              amount: fullAmount,
              currency: "USD",
              status: isStripe ? PAYMENT_STATES.PENDING : PAYMENT_STATES.SUCCEEDED,
            },
          });
        }

        // Inventory: atomic conditional decrement (stock >= quantity). Throws →
        // full rollback. Never trusts frontend stock info.
        await reserveStock(tx, requestedItems);

        // Coupon usage: atomic increment guarded by maxUses (if set).
        if (couponCode && coupon && coupon.maxUses != null) {
          const used = await tx.coupon.updateMany({
            where: { code: coupon.code, usageCount: { lt: coupon.maxUses } },
            data: { usageCount: { increment: 1 } },
          });
          if (used.count !== 1) {
            throw new Error("COUPON_LIMIT_REACHED");
          }
        }

        // Wallet payment: atomic debit (balance >= amount) inside the same
        // transaction — no double-spend, no partial debit. The ledger row's
        // unique (referenceType, referenceId) guard makes the debit idempotent.
        if (paymentMethod === "WALLET") {
          await debitWallet(tx, userId, fullAmount, {
            referenceId: payment.id,
            referenceType: "order",
            description: "Checkout payment",
          });
        }

        for (const { storeId, sellerItems, total } of storeTotals) {
          const order = await tx.order.create({
            data: {
              userId,
              storeId,
              addressId,
              total,
              paymentMethod,
              isCouponUsed: coupon ? true : false,
              coupon: coupon ? coupon : {},
              ...(payment
                ? {
                    paymentId: payment.id,
                    paymentStatus: isStripe ? PAYMENT_STATES.PENDING : PAYMENT_STATES.SUCCEEDED,
                  }
                : {}),
              // Wallet payments settle instantly (pre-funded).
              ...(paymentMethod === "WALLET" ? { isPaid: true } : {}),
              orderItems: {
                create: sellerItems.map((item) => ({
                  productId: item.id,
                  quantity: item.quantity,
                  price: item.price,
                })),
              },
            },
          });
          orderIds.push(order.id);
        }
      });
    } catch (error) {
      if (error?.code === "P2002") {
        // A concurrent request won this idempotency key. Return its outcome —
        // never create a second charge.
        const winner = await prisma.payment.findUnique({ where: { idempotencyKey } });
        if (winner && winner.userId === userId && winner.providerSessionUrl) {
          return NextResponse.json({ session: { url: winner.providerSessionUrl }, paymentId: winner.id, reused: true });
        }
        if (winner && winner.status === PAYMENT_STATES.SUCCEEDED) {
          return NextResponse.json({ alreadyProcessed: true, paymentId: winner.id });
        }
        return NextResponse.json({ error: "Checkout already in progress." }, { status: 409 });
      }
      if (error instanceof StockUnavailableError) {
        logPayment({ event: "checkout.insufficient_stock", requestId, productId: error.productId });
        return NextResponse.json({ error: "One or more products are no longer in stock." }, { status: 422 });
      }
      if (error?.message === "COUPON_LIMIT_REACHED") {
        return NextResponse.json({ error: "Coupon usage limit reached." }, { status: 409 });
      }
      if (error instanceof WalletInsufficientFundsError) {
        logPayment({ event: "checkout.insufficient_wallet", requestId });
        return NextResponse.json({ error: "Insufficient wallet balance." }, { status: 422 });
      }
      throw error;
    }

    if (isStripe) {
      // ── Create the provider checkout session (outside the DB transaction) ─────
      const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
      const origin = getSafeOrigin(request);
      try {
        const checkoutSession = await stripe.checkout.sessions.create(
          {
            payment_method_types: ["card"],
            line_items: [
              {
                price_data: {
                  currency: "usd",
                  product_data: { name: "Order" },
                  unit_amount: Math.round(fullAmount * 100),
                },
                quantity: 1,
              },
            ],
            expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
            mode: "payment",
            success_url: `${origin}/loading?nextUrl=orders`,
            cancel_url: `${origin}/cart`,
            metadata: {
              orderIds: orderIds.join(","),
              userId,
              appId: "abu-marketplace",
              paymentId: payment.id,
            },
          },
          { idempotencyKey: `checkout_${payment.id}` } // Stripe-side idempotency
        );

        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            providerSessionId: checkoutSession.id,
            providerSessionUrl: checkoutSession.url,
            status: PAYMENT_STATES.PROCESSING,
          },
        });

        logPayment({ event: "checkout.created", paymentId: payment.id, userId, amount: fullAmount, currency: "USD", requestId });
        return NextResponse.json({ session: checkoutSession, paymentId: payment.id, idempotencyKey });
      } catch (error) {
        // Session creation failed — release reserved inventory and mark the
        // attempt FAILED. Orders are kept (paymentStatus FAILED) for audit.
        logPayment({ event: "checkout.session_create_failed", paymentId: payment.id, failureCategory: "provider_error", requestId });
        const orderRows = await prisma.order.findMany({
          where: { paymentId: payment.id },
          select: { orderItems: { select: { productId: true, quantity: true } } },
        });
        await releaseStock(
          prisma,
          orderRows.flatMap((o) => o.orderItems)
        );
        await prisma.payment.update({ where: { id: payment.id }, data: { status: PAYMENT_STATES.FAILED } });
        await prisma.order.updateMany({ where: { paymentId: payment.id }, data: { paymentStatus: PAYMENT_STATES.FAILED } });
        return NextResponse.json({ error: "Unable to start payment. Please try again." }, { status: 502 });
      }
    }

    // ── COD/WALLET: clear the cart and confirm ─────────────────────────────────
    await prisma.user.update({
      where: { id: userId },
      data: { cart: {} },
    });

    if (paymentMethod === "WALLET") {
      logPayment({ event: "checkout.wallet_placed", paymentId: payment.id, userId, amount: fullAmount, currency: "USD", requestId });
      // Return the idempotency key so the client can retry safely after a
      // timeout — a retry with this key returns alreadyProcessed, never a
      // second wallet debit.
      return NextResponse.json({ message: "Orders Placed Successfully", paymentId: payment.id, idempotencyKey });
    }

    logPayment({ event: "checkout.cod_placed", userId, requestId });
    return NextResponse.json({ message: "Orders Placed Successfully" });
  } catch (error) {
    console.error("[POST /api/orders]", error);
    return NextResponse.json({ error: "Unable to place order." }, { status: 400 });
  }
}

// Get all orders for a user
export async function GET(request) {
  try {
    const session = await getSessionFromRequest(request);
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "not authorized" }, { status: 401 });
    }
    const orders = await prisma.order.findMany({
      where: {
        userId,
        OR: [
          { paymentMethod: { in: [PaymentMethod.COD, PaymentMethod.WALLET] } },
          { AND: [{ paymentMethod: PaymentMethod.STRIPE }, { isPaid: true }] },
        ],
      },
      include: {
        orderItems: { include: { product: true } },
        address: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ orders });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Unable to fetch orders." }, { status: 400 });
  }
}
