// Double-entry ledger engine.
//
// Every money movement is recorded as a pair of entries (debit + credit) that
// sum to zero. Accounts:
//   - customer_receivable: money owed by customers (debits = charges)
//   - merchant_payable: money owed to merchants (credits = settlements)
//   - platform_revenue: ABU's transaction fees (credits)
//   - network_fees: provider processing costs (debits)
//
// The ledger is the source of truth for "where did this money go" — queryable
// by BSL auditors without reverse-engineering application logs.

export const LEDGER_ACCOUNTS = {
  CUSTOMER_RECEIVABLE: "customer_receivable",
  MERCHANT_PAYABLE: "merchant_payable",
  PLATFORM_REVENUE: "platform_revenue",
  NETWORK_FEES: "network_fees",
};

/**
 * Post a double-entry ledger entry. Both sides are written in the same
 * transaction so they can never be partially applied.
 *
 * @param {object} db - Prisma transaction client
 * @param {object} params
 * @param {string} params.pspTransactionId - link to the PSP transaction
 * @param {number} params.amount - the money amount
 * @param {string} params.description - human-readable description
 * @param {string} params.referenceType - "psp_transaction" | "settlement" | "refund" | "dispute"
 * @param {string} params.referenceId - the reference entity ID
 * @param {object} params.debitSide - { account: string } for the debit
 * @param {object} params.creditSide - { account: string } for the credit
 */
export async function postLedgerEntry(db, {
  pspTransactionId,
  amount,
  description,
  referenceType,
  referenceId,
  debitAccount,
  creditAccount,
}) {
  if (!amount || amount <= 0) {
    throw new Error("Ledger entry amount must be positive.");
  }
  if (debitAccount === creditAccount) {
    throw new Error("Debit and credit accounts must differ.");
  }

  // Both entries written together — if one fails, both roll back.
  const [debit, credit] = await db.$transaction([
    db.ledgerEntry.create({
      data: {
        pspTransactionId,
        account: debitAccount,
        debit: amount,
        credit: 0,
        description,
        referenceType,
        referenceId,
      },
    }),
    db.ledgerEntry.create({
      data: {
        pspTransactionId,
        account: creditAccount,
        debit: 0,
        credit: amount,
        description,
        referenceType,
        referenceId,
      },
    }),
  ]);

  // Verify balance (defense in depth — should never fail if the code is correct)
  const totalDebit = debit.debit;
  const totalCredit = credit.credit;
  if (Math.abs(totalDebit - totalCredit) > 0.001) {
    throw new Error(`Ledger imbalance detected: debit=${totalDebit} credit=${totalCredit}`);
  }

  return { debit, credit };
}

/**
 * Record a payment capture in the ledger.
 *   debit:  customer_receivable  (customer owes money)
 *   credit: merchant_payable     (platform owes merchant)
 */
export async function recordPaymentCapture(db, { pspTransactionId, amount, description, referenceType, referenceId }) {
  return postLedgerEntry(db, {
    pspTransactionId,
    amount,
    description: description || "Payment captured",
    referenceType: referenceType || "psp_transaction",
    referenceId,
    debitAccount: LEDGER_ACCOUNTS.CUSTOMER_RECEIVABLE,
    creditAccount: LEDGER_ACCOUNTS.MERCHANT_PAYABLE,
  });
}

/**
 * Record platform fee deduction during settlement.
 *   debit:  merchant_payable     (reduce what we owe the merchant)
 *   credit: platform_revenue    (ABU's fee income)
 */
export async function recordPlatformFee(db, { pspTransactionId, amount, description, referenceType, referenceId }) {
  return postLedgerEntry(db, {
    pspTransactionId,
    amount,
    description: description || "Platform transaction fee",
    referenceType: referenceType || "settlement",
    referenceId,
    debitAccount: LEDGER_ACCOUNTS.MERCHANT_PAYABLE,
    creditAccount: LEDGER_ACCOUNTS.PLATFORM_REVENUE,
  });
}

/**
 * Record a network/processing fee.
 *   debit:  network_fees        (cost of processing)
 *   credit: merchant_payable    (reduce what we owe the merchant)
 */
export async function recordNetworkFee(db, { pspTransactionId, amount, description, referenceType, referenceId }) {
  return postLedgerEntry(db, {
    pspTransactionId,
    amount,
    description: description || "Network processing fee",
    referenceType: referenceType || "settlement",
    referenceId,
    debitAccount: LEDGER_ACCOUNTS.NETWORK_FEES,
    creditAccount: LEDGER_ACCOUNTS.MERCHANT_PAYABLE,
  });
}

/**
 * Record a refund — reverses the original capture.
 *   debit:  merchant_payable     (reduce what we owe the merchant)
 *   credit: customer_receivable  (reduce what customer owes)
 */
export async function recordRefund(db, { pspTransactionId, amount, description, referenceType, referenceId }) {
  return postLedgerEntry(db, {
    pspTransactionId,
    amount,
    description: description || "Refund issued",
    referenceType: referenceType || "refund",
    referenceId,
    debitAccount: LEDGER_ACCOUNTS.MERCHANT_PAYABLE,
    creditAccount: LEDGER_ACCOUNTS.CUSTOMER_RECEIVABLE,
  });
}

/**
 * Record a settlement payout.
 *   debit:  merchant_payable     (reduce what we owe the merchant — paid out)
 *   credit: (external account)   — this is a transfer out, recorded as reduction of liability
 */
export async function recordSettlement(db, { pspTransactionId, amount, description, referenceType, referenceId }) {
  return postLedgerEntry(db, {
    pspTransactionId,
    amount,
    description: description || "Settlement payout",
    referenceType: referenceType || "settlement",
    referenceId,
    debitAccount: LEDGER_ACCOUNTS.MERCHANT_PAYABLE,
    creditAccount: LEDGER_ACCOUNTS.CUSTOMER_RECEIVABLE,
  });
}

/**
 * Verify that all ledger entries for a reference sum to zero.
 * Returns { balanced, entries, totalDebit, totalCredit }.
 */
export async function verifyLedgerBalance(db, { referenceType, referenceId }) {
  const entries = await db.ledgerEntry.findMany({
    where: { referenceType, referenceId },
    orderBy: { createdAt: "asc" },
  });

  const totalDebit = entries.reduce((sum, e) => sum + e.debit, 0);
  const totalCredit = entries.reduce((sum, e) => sum + e.credit, 0);

  return {
    balanced: Math.abs(totalDebit - totalCredit) < 0.001,
    entries,
    totalDebit,
    totalCredit,
  };
}
