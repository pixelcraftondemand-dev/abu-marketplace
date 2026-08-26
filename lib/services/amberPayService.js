// ─── AMBER PAY — Core Financial Service ───────────────────────────────────────
//
// AMBER PAY is the marketplace's in-house payment system, built from scratch
// and inspired by Vult (Sierra Leone's digital banking super app).
//
// Unlike integrating with a third-party gateway, AMBER PAY runs entirely
// within the marketplace. Users fund their wallets via agent cash-in, then
// spend at checkout or send P2P transfers. Merchants receive settlements
// from the platform's escrow.
//
// Core flows:
//   1. WALLET: Every user gets a wallet (USD canonical, SLL display)
//   2. CASH-IN: Agent network for physical cash deposits
//   3. CHECKOUT: Wallet debit for marketplace orders
//   4. P2P: Instant wallet-to-wallet transfers
//   5. SETTLEMENT: Merchant payouts from escrow

import { roundMoney } from "./walletService";

// ─── Constants ────────────────────────────────────────────────────────────────

/** Platform fee percentage on transactions (2% for MVP) */
export const PLATFORM_FEE_RATE = 0.02;

/** Maximum single P2P transfer (USD) */
export const MAX_P2P_TRANSFER = 10000;

/** Minimum P2P transfer (USD) */
export const MIN_P2P_TRANSFER = 0.5;

/** Agent commission rate (2%) */
export const AGENT_COMMISSION_RATE = 0.02;

/** Top-up request expiry (30 minutes) */
export const TOPUP_REQUEST_TTL_MS = 30 * 60 * 1000;

/** Settlement cycle: merchants are paid weekly */
export const SETTLEMENT_CYCLE_DAYS = 7;

/** Platform fee percentage for settlements */
export const MERCHANT_FEE_RATE = 0.05; // 5% platform commission

// ─── Wallet Operations ────────────────────────────────────────────────────────

/**
 * Credit a wallet from agent cash-in. Called after the agent confirms
 * they received cash from the user.
 *
 * @param {PrismaClient} db - Database client
 * @param {string} userId - User whose wallet to credit
 * @param {number} amount - Amount in USD to credit
 * @param {Object} opts - Additional options
 * @returns {Object} Updated balance
 */
export async function cashInWallet(db, userId, amount, { agentId, agentTransactionId, description } = {}) {
  const credit = roundMoney(amount);
  if (credit <= 0) throw new Error("Cash-in amount must be positive.");

  const wallet = await db.wallet.findUnique({ where: { userId } });
  if (!wallet) throw new Error("User has no wallet.");
  if (wallet.status !== "active") throw new Error("Wallet is not active.");

  const fee = roundMoney(credit * AGENT_COMMISSION_RATE);
  const netAmount = roundMoney(credit - fee);

  // Atomic credit with idempotent ledger row
  const outcome = await db.$transaction(async (tx) => {
    let row;
    try {
      row = await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          userId,
          type: "TOPUP",
          amount: credit,
          balanceAfter: roundMoney(wallet.balance + credit),
          currency: "USD",
          referenceType: "agent_transaction",
          referenceId: agentTransactionId || null,
          description: description || `Cash-in via agent (${credit} USD)`,
          metadata: { agentId, fee, netAmount },
        },
      });
    } catch (error) {
      if (error?.code === "P2002") return { alreadyApplied: true };
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
 * Debit a wallet for marketplace checkout.
 */
export async function checkoutDebit(db, userId, amount, { orderId, description } = {}) {
  const debit = roundMoney(amount);
  if (debit <= 0) throw new Error("Checkout amount must be positive.");

  const wallet = await db.wallet.findUnique({ where: { userId } });
  if (!wallet) throw new Error("User has no wallet.");
  if (wallet.status !== "active") throw new Error("Wallet is not active.");
  if (wallet.balance < debit) {
    throw new InsufficientFundsError(wallet.balance, debit);
  }

  const fee = roundMoney(debit * PLATFORM_FEE_RATE);

  const outcome = await db.$transaction(async (tx) => {
    // Atomic guard: balance >= debit
    const result = await tx.wallet.updateMany({
      where: { id: wallet.id, balance: { gte: debit } },
      data: { balance: { decrement: debit } },
    });
    if (result.count !== 1) throw new InsufficientFundsError(wallet.balance, debit);

    await tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        userId,
        type: "PAYMENT",
        amount: -debit,
        balanceAfter: roundMoney(wallet.balance - debit),
        currency: "USD",
        referenceType: "order",
        referenceId: orderId || null,
        description: description || `Marketplace checkout (${debit} USD)`,
        metadata: { fee },
      },
    });
    return { balance: roundMoney(wallet.balance - debit) };
  });

  return outcome;
}

// ─── P2P Transfers ────────────────────────────────────────────────────────────

/**
 * Send money from one user's wallet to another.
 *
 * @param {PrismaClient} db
 * @param {string} senderId
 * @param {string} receiverId
 * @param {number} amount - Amount in USD
 * @param {Object} opts
 * @returns {Object} Transfer details
 */
export async function sendP2P(db, senderId, receiverId, amount, { description, idempotencyKey } = {}) {
  if (senderId === receiverId) throw new Error("Cannot send money to yourself.");

  const transferAmount = roundMoney(amount);
  if (transferAmount < MIN_P2P_TRANSFER) {
    throw new Error(`Minimum transfer is $${MIN_P2P_TRANSFER}.`);
  }
  if (transferAmount > MAX_P2P_TRANSFER) {
    throw new Error(`Maximum transfer is $${MAX_P2P_TRANSFER}.`);
  }

  const fee = roundMoney(transferAmount * PLATFORM_FEE_RATE);
  const netAmount = roundMoney(transferAmount - fee);

  // Fetch both wallets
  const [senderWallet, receiverWallet] = await Promise.all([
    db.wallet.findUnique({ where: { userId: senderId } }),
    db.wallet.findUnique({ where: { userId: receiverId } }),
  ]);

  if (!senderWallet) throw new Error("Sender has no wallet.");
  if (!receiverWallet) throw new Error("Recipient has no wallet.");
  if (senderWallet.status !== "active") throw new Error("Sender wallet is not active.");
  if (receiverWallet.status !== "active") throw new Error("Recipient wallet is not active.");
  if (senderWallet.balance < transferAmount) {
    throw new InsufficientFundsError(senderWallet.balance, transferAmount);
  }

  const key = idempotencyKey || `p2p_${senderId}_${receiverId}_${Date.now()}`;

  // Atomic P2P: debit sender + credit receiver in one transaction
  const result = await db.$transaction(async (tx) => {
    // Deduct from sender
    const senderResult = await tx.wallet.updateMany({
      where: { id: senderWallet.id, balance: { gte: transferAmount } },
      data: { balance: { decrement: transferAmount } },
    });
    if (senderResult.count !== 1) throw new InsufficientFundsError(senderWallet.balance, transferAmount);

    // Credit receiver
    await tx.wallet.updateMany({
      where: { id: receiverWallet.id },
      data: { balance: { increment: netAmount } },
    });

    // Record sender's debit
    await tx.walletTransaction.create({
      data: {
        walletId: senderWallet.id,
        userId: senderId,
        type: "P2P_SEND",
        amount: -transferAmount,
        balanceAfter: roundMoney(senderWallet.balance - transferAmount),
        currency: "USD",
        referenceType: "p2p_transfer",
        referenceId: key,
        description: description || `Sent to user (${transferAmount} USD)`,
        metadata: { receiverId, fee, netAmount },
      },
    });

    // Record receiver's credit
    await tx.walletTransaction.create({
      data: {
        walletId: receiverWallet.id,
        userId: receiverId,
        type: "P2P_RECEIVE",
        amount: netAmount,
        balanceAfter: roundMoney(receiverWallet.balance + netAmount),
        currency: "USD",
        referenceType: "p2p_transfer",
        referenceId: key,
        description: description || `Received from user (${netAmount} USD)`,
        metadata: { senderId, fee, grossAmount: transferAmount },
      },
    });

    // Create the transfer record
    const transfer = await tx.p2PTransfer.create({
      data: {
        senderId,
        receiverId,
        senderWalletId: senderWallet.id,
        receiverWalletId: receiverWallet.id,
        amount: transferAmount,
        fee,
        netAmount,
        currency: "USD",
        description,
        status: "completed",
        idempotencyKey: key,
        completedAt: new Date(),
      },
    });

    return transfer;
  });

  return {
    transferId: result.id,
    amount: transferAmount,
    fee,
    netAmount,
    senderBalance: roundMoney(senderWallet.balance - transferAmount),
    receiverBalance: roundMoney(receiverWallet.balance + netAmount),
  };
}

// ─── Top-Up Request (Agent Matching) ─────────────────────────────────────────

/**
 * Create a top-up request. The user specifies how much they want to deposit.
 * An agent nearby will see this request and process it (cash-in).
 */
export async function createTopUpRequest(db, userId, { amount, currency = "USD", notes } = {}) {
  const wallet = await db.wallet.findUnique({ where: { userId } });
  if (!wallet) throw new Error("User has no wallet.");

  const requestAmount = roundMoney(amount);
  if (requestAmount <= 0) throw new Error("Amount must be positive.");

  // Generate a short reference code for the agent
  const agentRef = generateAgentRef();

  const request = await db.topUpRequest.create({
    data: {
      walletId: wallet.id,
      userId,
      amount: requestAmount,
      currency,
      status: "pending",
      agentRef,
      notes,
    },
  });

  return {
    requestId: request.id,
    agentRef,
    amount: requestAmount,
    currency,
    status: "pending",
  };
}

/**
 * Agent picks up a pending top-up request and processes the cash-in.
 */
export async function agentProcessTopUp(db, agentId, requestId, { notes } = {}) {
  const request = await db.topUpRequest.findUnique({ where: { id: requestId } });
  if (!request) throw new Error("Top-up request not found.");
  if (request.status !== "pending") throw new Error("Request is no longer pending.");

  const agent = await db.agent.findUnique({ where: { id: agentId } });
  if (!agent || agent.status !== "active") throw new Error("Agent is not active.");

  // Assign agent and process
  const result = await db.$transaction(async (tx) => {
    await tx.topUpRequest.update({
      where: { id: requestId },
      data: {
        agentId,
        status: "processing",
        matchedAt: new Date(),
      },
    });

    // Credit the user's wallet
    const creditResult = await cashInWallet(tx, request.userId, request.amount, {
      agentId,
      description: `Cash-in via agent (ref: ${request.agentRef})`,
    });

    // Complete the top-up request
    await tx.topUpRequest.update({
      where: { id: requestId },
      data: {
        status: "completed",
        completedAt: new Date(),
      },
    });

    // Record the agent transaction
    const fee = roundMoney(request.amount * AGENT_COMMISSION_RATE);
    await tx.agentTransaction.create({
      data: {
        agentId,
        userId: request.userId,
        type: "CASH_IN",
        amount: request.amount,
        fee,
        status: "confirmed",
        agentRef: request.agentRef,
        notes,
        confirmedAt: new Date(),
      },
    });

    // Update agent's float
    await tx.agent.update({
      where: { id: agentId },
      data: { floatBalance: { increment: request.amount } },
    });

    return creditResult;
  });

  return {
    requestId,
    amount: request.amount,
    walletBalance: result.balance,
  };
}

// ─── Merchant Settlement ──────────────────────────────────────────────────────

/**
 * Calculate pending settlement for a merchant (store).
 * Sums all captured PSP transactions that haven't been settled yet.
 */
export async function getPendingSettlement(db, merchantId) {
  const pending = await db.pspTransaction.findMany({
    where: {
      merchantId,
      pspStatus: "CAPTURED",
      settlementBatchId: null,
    },
    select: {
      id: true,
      amount: true,
      capturedAmount: true,
      createdAt: true,
    },
  });

  const grossAmount = pending.reduce((sum, tx) => sum + tx.capturedAmount, 0);
  const platformFee = roundMoney(grossAmount * MERCHANT_FEE_RATE);
  const netAmount = roundMoney(grossAmount - platformFee);

  return {
    merchantId,
    transactionCount: pending.length,
    grossAmount: roundMoney(grossAmount),
    platformFee,
    netAmount,
    transactions: pending,
  };
}

// ─── Errors ───────────────────────────────────────────────────────────────────

export class InsufficientFundsError extends Error {
  constructor(balance, requested) {
    super(
      `Insufficient funds. Available: $${balance.toFixed(2)}, Requested: $${requested.toFixed(2)}.`
    );
    this.name = "InsufficientFundsError";
    this.code = "INSUFFICIENT_FUNDS";
    this.balance = balance;
    this.requested = requested;
  }
}

export class WalletFrozenError extends Error {
  constructor() {
    super("Wallet has been frozen. Please contact support.");
    this.name = "WalletFrozenError";
    this.code = "WALLET_FROZEN";
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Generate a short, human-readable reference code for agent transactions.
 * Format: 6 alphanumeric chars (e.g. "A7K2M9")
 */
function generateAgentRef() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I, O, 0, 1 to avoid confusion
  let ref = "";
  for (let i = 0; i < 6; i++) {
    ref += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return ref;
}

/**
 * Convert USD to SLL for display purposes.
 * Exchange rate: 1 USD = ~22,500 SLL (approximate, stale rate for MVP).
 */
export function usdToSll(usdAmount) {
  const SLL_RATE = 22500;
  return roundMoney(Number(usdAmount) * SLL_RATE);
}

/**
 * Get the wallet balance in both currencies.
 */
export async function getWalletSummary(db, userId) {
  const wallet = await db.wallet.findUnique({
    where: { userId },
    select: { balance: true, status: true, createdAt: true },
  });

  if (!wallet) return null;

  return {
    balance: wallet.balance,
    balanceSLL: usdToSll(wallet.balance),
    status: wallet.status,
    currency: "USD",
    displayCurrency: "SLL",
  };
}
