import prisma from "@/lib/prisma";
import { z } from "zod";
import { isValidId, checkoutRateLimiter } from "@/lib/security";
import { getSessionFromRequest } from "@/lib/serverAuth";
import { PaymentMethod } from "@prisma/client";
import { NextResponse } from "next/server";
import { isValidCurrency } from "@/lib/utils/currency";
import { DELIVERY_FEE, FREE_DELIVERY_THRESHOLD, isCashOnDeliveryAvailable } from "@/lib/paymentOptions";
import { reserveStock, releaseStock, StockUnavailableError } from "@/lib/services/paymentService";
import { logPayment, getRequestId } from "@/lib/paymentLog";
import { evaluateCheckoutRisk } from "@/lib/services/fraudPrevention";
import { validateCheckoutPrices } from "@/lib/services/priceGuard";
import { validateAmount, roundMoney } from "@/lib/services/money"

const MAX_ORDER_ITEMS = 50;
const MAX_ITEM_QUANTITY = 99;
const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9._-]{8,128}$/;

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
  paymentMethod: z.literal("COD"),
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

    // Rate limit checkout attempts per user to throttle repeated requests.
    const rl = await checkoutRateLimiter.check(userId);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many attempts. Please wait a moment and try again." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfter || 60) } }
      );
    }

    const { addressId, items, couponCode, paymentMethod, currency } = parsed;

    // ── PSP: Fraud prevention check ──────────────────────────────────────────
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const deviceFingerprint = request.headers.get("x-device-fingerprint") || null;
    const riskResult = await evaluateCheckoutRisk(prisma, {
      userId,
      orderAmount: 0, // will be calculated after product fetch
      ipAddress: ip,
      deviceFingerprint,
    });
    if (riskResult.action === "BLOCK") {
      logPayment({ event: "checkout.fraud_blocked", userId, riskScore: riskResult.riskScore, requestId });
      return NextResponse.json(
        { error: "Unable to process your order. Please contact support." },
        { status: 403 }
      );
    }

    if (!isValidId(addressId)) {
      return NextResponse.json({ error: "Invalid address." }, { status: 422 });
    }

    if (currency != null && !isValidCurrency(currency)) {
      return NextResponse.json({ error: "Unsupported currency." }, { status: 422 });
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

    if (!isCashOnDeliveryAvailable()) {
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
    // Use TOCTOU-safe price validation: server-side re-fetch guarantees we never
    // trust stale client-side prices.
    const validatedItems = await validateCheckoutPrices(prisma, items.map((item) => ({
      id: item.id,
      quantity: item.quantity,
    })));

    if (!validatedItems.valid) {
      return NextResponse.json({ error: validatedItems.message || "Invalid checkout items." }, { status: 422 });
    }

    if (validatedItems.priceChanged) {
      logPayment({ event: "checkout.price_changed", userId, requestId });
      return NextResponse.json(
        { error: "Prices have changed since you added items to cart. Please review your order.", priceChanged: true },
        { status: 409 }
      );
    }

    const storeTotals = [];
    let subtotal = 0;
    for (const [storeId, sellerItems] of ordersByStore.entries()) {
      let total = sellerItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
      if (couponCode) {
        total -= (total * coupon.discount) / 100;
      }
      total = roundMoney(total);
      subtotal += total;
      storeTotals.push({ storeId, sellerItems, total });
    }
    // Delivery is charged once per order (landing on the first store's order,
    // matching the historical behavior), and is free at/above the threshold.
    const deliveryFee = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
    if (deliveryFee > 0 && storeTotals.length > 0) {
      storeTotals[0].total = roundMoney(storeTotals[0].total + deliveryFee);
    }
    const fullAmount = roundMoney(subtotal + deliveryFee);

    // Validate final amount server-side
    if (!validateAmount(fullAmount)) {
      return NextResponse.json({ error: "Invalid order total." }, { status: 422 });
    }

    // ── Atomic transaction: orders + inventory + coupon usage ─────────────────
    // A single transaction means a failure (stock, coupon, DB) rolls everything
    // back — no partial orders, no phantom reservations, no double decrements.
    try {
      await prisma.$transaction(async (tx) => {
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

        // Social proof: count units toward the products' lifetime sold tally.
        for (const [productId, qty] of requestedItems) {
          await tx.product.update({
            where: { id: productId },
            data: { soldCount: { increment: qty } },
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
              orderItems: {
                create: sellerItems.map((item) => ({
                  productId: item.id,
                  quantity: item.quantity,
                  price: item.price,
                })),
              },
            },
          });
        }
      });
    } catch (error) {
      if (error instanceof StockUnavailableError) {
        logPayment({ event: "checkout.insufficient_stock", requestId, productId: error.productId });
        return NextResponse.json({ error: "One or more products are no longer in stock." }, { status: 422 });
      }
      if (error?.message === "COUPON_LIMIT_REACHED") {
        return NextResponse.json({ error: "Coupon usage limit reached." }, { status: 409 });
      }
      throw error;
    }

    // ── COD: clear the cart and confirm ────────────────────────────────────────
    await prisma.user.update({
      where: { id: userId },
      data: { cart: {} },
    });

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
        paymentMethod: { in: [PaymentMethod.COD, PaymentMethod.WALLET] },
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
