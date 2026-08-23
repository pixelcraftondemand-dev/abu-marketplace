import prisma from "@/lib/prisma";
import { z } from "zod";
import { NextResponse } from "next/server";
import { getSessionFromRequest, getVerifiedUserFromRequest } from "@/lib/serverAuth";
import authAdmin from "@/middlewares/authAdmin";
import { PSP_STATES, transitionPspStatus } from "@/lib/services/pspStateMachine";
import { appendAuditLog } from "@/lib/services/auditLog";
import { recordPaymentCapture } from "@/lib/services/ledger";
import { getRequestId } from "@/lib/paymentLog";

// ─── Validation schemas ──────────────────────────────────────────────────────

const listQuerySchema = z.object({
  merchantId: z.string().optional(),
  status: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

const captureSchema = z.object({
  transactionId: z.string().min(1).max(100),
  amount: z.number().positive().max(10_000_000),
});

const failSchema = z.object({
  transactionId: z.string().min(1).max(100),
  reason: z.string().max(500).optional(),
});

// ─── GET /api/psp/transactions ──────────────────────────────────────────────

export async function GET(request) {
  try {
    const session = await getSessionFromRequest();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    const isAdmin = await authAdmin(userId);

    const { searchParams } = new URL(request.url);
    const parsed = listQuerySchema.safeParse({
      merchantId: searchParams.get("merchantId") || undefined,
      status: searchParams.get("status") || undefined,
      from: searchParams.get("from") || undefined,
      to: searchParams.get("to") || undefined,
      limit: searchParams.get("limit") || undefined,
      offset: searchParams.get("offset") || undefined,
    });

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid query parameters." }, { status: 422 });
    }

    const { merchantId, status, from, to, limit, offset } = parsed.data;

    const where = {};

    // Non-admin users can only see their own transactions
    if (!isAdmin) {
      where.userId = userId;
    } else if (merchantId) {
      where.merchantId = merchantId;
    }

    if (status) where.pspStatus = status;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const [transactions, total] = await Promise.all([
      prisma.pspTransaction.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
        select: {
          id: true,
          paymentId: true,
          merchantId: true,
          userId: true,
          amount: true,
          capturedAmount: true,
          settledAmount: true,
          currency: true,
          pspStatus: true,
          version: true,
          idempotencyKey: true,
          providerRef: true,
          authorizedAt: true,
          capturedAt: true,
          settledAt: true,
          failedAt: true,
          failureReason: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.pspTransaction.count({ where }),
    ]);

    return NextResponse.json({ transactions, total, limit, offset });
  } catch (error) {
    console.error("[GET /api/psp/transactions]", error);
    return NextResponse.json({ error: "Unable to fetch transactions." }, { status: 500 });
  }
}

// ─── POST /api/psp/transactions — Authorize a new PSP transaction ────────────

export async function POST(request) {
  const requestId = getRequestId(request);
  try {
    const session = await getSessionFromRequest();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    const verifiedUser = await getVerifiedUserFromRequest();
    if (!verifiedUser) {
      return NextResponse.json({ error: "Email verification required." }, { status: 403 });
    }

    const body = await request.json();
    const { action } = body;

    if (action === "capture") {
      return handleCapture(body, userId, requestId);
    }
    if (action === "fail") {
      return handleFail(body, userId, requestId);
    }

    // Default: create and authorize a new PSP transaction
    return handleAuthorize(body, userId, requestId);
  } catch (error) {
    console.error("[POST /api/psp/transactions]", error?.message || error);
    return NextResponse.json({ error: "Unable to process request." }, { status: 500 });
  }
}

// ─── Authorize a new PSP transaction ─────────────────────────────────────────

async function handleAuthorize(body, userId, requestId) {
  const schema = z.object({
    paymentId: z.string().min(1).max(100),
    merchantId: z.string().min(1).max(100),
    amount: z.number().positive().max(10_000_000),
    currency: z.string().max(8).default("USD"),
    idempotencyKey: z.string().min(8).max(128).optional(),
  });

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid authorization request.", details: parsed.error.issues }, { status: 422 });
  }

  const { paymentId, merchantId, amount, currency, idempotencyKey } = parsed.data;

  // Idempotency check
  if (idempotencyKey) {
    const existing = await prisma.pspTransaction.findUnique({ where: { idempotencyKey } });
    if (existing) {
      if (existing.userId !== userId) {
        return NextResponse.json({ error: "Idempotency key already in use." }, { status: 403 });
      }
      return NextResponse.json({ transaction: existing, reused: true });
    }
  }

  const transaction = await prisma.pspTransaction.create({
    data: {
      paymentId,
      merchantId,
      userId,
      amount,
      capturedAmount: 0,
      settledAmount: 0,
      currency,
      pspStatus: PSP_STATES.PENDING,
      idempotencyKey: idempotencyKey || `auth_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    },
  });

  // Transition to AUTHORIZED
  const transition = await transitionPspStatus(prisma, transaction.id, PSP_STATES.PENDING, PSP_STATES.AUTHORIZED, transaction.version);
  if (!transition.applied) {
    return NextResponse.json({ error: "Authorization failed (concurrent modification)." }, { status: 409 });
  }

  await appendAuditLog(prisma, {
    pspTransactionId: transaction.id,
    actor: userId,
    action: "authorize",
    previousState: PSP_STATES.PENDING,
    newState: PSP_STATES.AUTHORIZED,
    metadata: { amount, currency, merchantId },
  });

  const updated = await prisma.pspTransaction.findUnique({ where: { id: transaction.id } });
  return NextResponse.json({ transaction: updated });
}

// ─── Capture funds on an authorized transaction ──────────────────────────────

async function handleCapture(body, userId, requestId) {
  const parsed = captureSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid capture request." }, { status: 422 });
  }

  const { transactionId, amount } = parsed.data;

  const txn = await prisma.pspTransaction.findUnique({ where: { id: transactionId } });
  if (!txn) {
    return NextResponse.json({ error: "Transaction not found." }, { status: 404 });
  }

  if (txn.pspStatus !== PSP_STATES.AUTHORIZED) {
    return NextResponse.json({ error: `Cannot capture: transaction is ${txn.pspStatus}.` }, { status: 409 });
  }

  if (amount > txn.amount) {
    return NextResponse.json({ error: "Capture amount exceeds authorized amount." }, { status: 422 });
  }

  const transition = await transitionPspStatus(prisma, txn.id, PSP_STATES.AUTHORIZED, PSP_STATES.CAPTURED, txn.version);
  if (!transition.applied) {
    return NextResponse.json({ error: "Capture failed (concurrent modification)." }, { status: 409 });
  }

  await prisma.pspTransaction.update({
    where: { id: txn.id },
    data: { capturedAmount: amount },
  });

  // Record in ledger
  await recordPaymentCapture(prisma, {
    pspTransactionId: txn.id,
    amount,
    description: `Payment captured for transaction ${txn.id}`,
    referenceType: "psp_transaction",
    referenceId: txn.id,
  });

  await appendAuditLog(prisma, {
    pspTransactionId: txn.id,
    actor: userId,
    action: "capture",
    previousState: PSP_STATES.AUTHORIZED,
    newState: PSP_STATES.CAPTURED,
    metadata: { amount, requestId },
  });

  const updated = await prisma.pspTransaction.findUnique({ where: { id: txn.id } });
  return NextResponse.json({ transaction: updated });
}

// ─── Mark a transaction as failed ────────────────────────────────────────────

async function handleFail(body, userId, requestId) {
  const parsed = failSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid fail request." }, { status: 422 });
  }

  const { transactionId, reason } = parsed.data;

  const txn = await prisma.pspTransaction.findUnique({ where: { id: transactionId } });
  if (!txn) {
    return NextResponse.json({ error: "Transaction not found." }, { status: 404 });
  }

  if (![PSP_STATES.PENDING, PSP_STATES.AUTHORIZED].includes(txn.pspStatus)) {
    return NextResponse.json({ error: `Cannot fail: transaction is ${txn.pspStatus}.` }, { status: 409 });
  }

  const transition = await transitionPspStatus(prisma, txn.id, txn.pspStatus, PSP_STATES.FAILED, txn.version);
  if (!transition.applied) {
    return NextResponse.json({ error: "Fail transition failed (concurrent modification)." }, { status: 409 });
  }

  await prisma.pspTransaction.update({
    where: { id: txn.id },
    data: { failureReason: reason || "Payment failed" },
  });

  await appendAuditLog(prisma, {
    pspTransactionId: txn.id,
    actor: userId,
    action: "fail",
    previousState: txn.pspStatus,
    newState: PSP_STATES.FAILED,
    metadata: { reason, requestId },
  });

  const updated = await prisma.pspTransaction.findUnique({ where: { id: txn.id } });
  return NextResponse.json({ transaction: updated });
}
