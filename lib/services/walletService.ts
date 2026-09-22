// Wallet service.
//
// Balances are canonical USD. Every mutation is atomic (conditional updates,
// never read-then-write) and every mutation writes an immutable ledger row.
// The (referenceType, referenceId) unique constraint is the DB-level guarantee
// that a top-up or checkout can never be applied twice.

import { PrismaClient } from "@prisma/client";

// ─── Types ──────────────────────────────────────────────────────────────────

/**
 * Accepts both PrismaClient and the TransactionClient returned by
 * `$transaction`. Prisma supports nested transactions via savepoints at
 * runtime, but the TransactionClient type omits `$transaction`, so we
 * union with `any` for nested-call flexibility.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PrismaDb = PrismaClient | any;

interface CreditWalletOpts {
  referenceId?: string | null;
  referenceType?: string | null;
  description?: string | null;
}

interface CreditWalletResult {
  balance: number;
  alreadyApplied: boolean;
  transactionId: string | undefined;
}

interface DebitWalletOpts {
  referenceId?: string | null;
  referenceType?: string | null;
  description?: string | null;
}

interface DebitWalletResult {
  balance: number;
}

// ─── Errors ─────────────────────────────────────────────────────────────────

export class WalletInsufficientFundsError extends Error {
  code: string;

  constructor() {
    super("Insufficient wallet balance.");
    this.name = "WalletInsufficientFundsError";
    this.code = "INSUFFICIENT_FUNDS";
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Round to cents to avoid float drift in balances and amounts. */
export function roundMoney(value: number | string): number {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

// ─── Wallet Operations ──────────────────────────────────────────────────────

/**
 * Returns the user's wallet, creating it lazily on first use. Safe under
 * concurrent creation (unique userId constraint -> fetch the winner).
 */
export async function getOrCreateWallet(
  db: PrismaDb,
  userId: string
): Promise<{ id: string; userId: string; balance: number; status: string }> {
  const existing = await db.wallet.findUnique({ where: { userId } });
  if (existing) return existing;
  try {
    return await db.wallet.create({ data: { userId, balance: 0 } });
  } catch (error: unknown) {
    if ((error as { code?: string })?.code === "P2002") {
      return db.wallet.findUnique({ where: { userId } });
    }
    throw error;
  }
}

/**
 * Atomically credit the wallet and record a TOPUP ledger row. `referenceId`
 * (e.g. the payment id) makes the credit idempotent: the unique
 * (referenceType, referenceId) constraint rejects a second ledger row, so
 * callers should treat a P2002 from the ledger insert as "already credited".
 */
export async function creditWallet(
  db: PrismaDb,
  userId: string,
  amount: number,
  { referenceId = null, referenceType = null, description = null }: CreditWalletOpts = {}
): Promise<CreditWalletResult> {
  const credit = roundMoney(amount);
  if (credit <= 0) throw new Error("Wallet credit must be positive.");
  const wallet = await getOrCreateWallet(db, userId);

  // Ledger-first, inside a transaction: the unique (referenceType, referenceId)
  // ledger row is the atomic gate. Only one concurrent credit can insert it;
  // losers roll back with alreadyApplied: true — a top-up can never credit the
  // wallet twice, even under duplicate/concurrent webhook deliveries.
  const outcome = await db.$transaction(async (tx: PrismaDb) => {
    let row;
    try {
      row = await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          userId,
          type: "TOPUP",
          amount: credit,
          balanceAfter: roundMoney(wallet.balance + credit),
          referenceId,
          referenceType,
          description,
        },
      });
    } catch (error: unknown) {
      if ((error as { code?: string })?.code === "P2002")
        return { alreadyApplied: true };
      throw error;
    }
    await tx.wallet.updateMany({
      where: { id: wallet.id },
      data: { balance: { increment: credit } },
    });
    return { alreadyApplied: false, row };
  });

  return {
    balance: roundMoney(wallet.balance + credit),
    alreadyApplied: outcome.alreadyApplied,
    transactionId: outcome.row?.id,
  };
}

/**
 * Atomically debit the wallet inside a transaction and record a PAYMENT ledger
 * row. Throws WalletInsufficientFundsError when the balance is insufficient —
 * callers inside a transaction should let the whole transaction roll back.
 */
export async function debitWallet(
  tx: PrismaDb,
  userId: string,
  amount: number,
  { referenceId = null, referenceType = null, description = null }: DebitWalletOpts = {}
): Promise<DebitWalletResult> {
  const debit = roundMoney(amount);
  if (debit <= 0) throw new Error("Wallet debit must be positive.");
  const wallet = await tx.wallet.findUnique({ where: { userId } });
  if (!wallet) throw new WalletInsufficientFundsError();
  // Atomic guard: only matches when the balance can cover the debit.
  const result = await tx.wallet.updateMany({
    where: { id: wallet.id, balance: { gte: debit } },
    data: { balance: { decrement: debit } },
  });
  if (result.count !== 1) throw new WalletInsufficientFundsError();
  await tx.walletTransaction.create({
    data: {
      walletId: wallet.id,
      userId,
      type: "PAYMENT",
      amount: -debit,
      balanceAfter: roundMoney(wallet.balance - debit),
      referenceId,
      referenceType,
      description,
    },
  });
  return { balance: roundMoney(wallet.balance - debit) };
}
