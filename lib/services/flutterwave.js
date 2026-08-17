// Flutterwave payment service (v3 API).
//
// Standard (hosted checkout) flow:
//   1. initiatePayment() -> { link } — redirect the customer to the hosted page
//   2. Flutterwave redirects back to redirect_url with
//      ?status=successful&tx_ref=...&transaction_id=...
//   3. The charge.completed webhook (verified via the verif-hash header) is
//      the source of truth for crediting, and the transaction is ALWAYS
//      re-verified server-side via verifyTransaction() before any state change.
//
// Docs: https://developer.flutterwave.com/v3.0/docs/flutterwave-standard-1
//
// Env:
//   FLW_SECRET_KEY          — live keys start with FLWSECK-, test keys FLWSECK_TEST-
//   FLW_WEBHOOK_SECRET_HASH — secret hash set in the dashboard (Settings -> Webhooks);
//                             sent by Flutterwave in the verif-hash header.

import axios from "axios";

const API_BASE = "https://api.flutterwave.com/v3";

function getSecretKey() {
  return process.env.FLW_SECRET_KEY || "";
}

/**
 * Initiate a Flutterwave Standard payment. Returns the hosted checkout link.
 * `txRef` must be unique per transaction (we use the Payment id).
 */
export async function initiatePayment({ txRef, amount, currency = "USD", redirectUrl, customer, meta = {}, customizations = {} }) {
  const { data } = await axios.post(
    `${API_BASE}/payments`,
    {
      tx_ref: txRef,
      amount: String(amount),
      currency,
      redirect_url: redirectUrl,
      customer: {
        email: customer.email,
        ...(customer.name ? { name: customer.name } : {}),
        ...(customer.phonenumber ? { phonenumber: customer.phonenumber } : {}),
      },
      meta,
      customizations: { title: "ABU Marketplace", ...customizations },
    },
    {
      headers: {
        Authorization: `Bearer ${getSecretKey()}`,
        "Content-Type": "application/json",
      },
      timeout: 15000,
    }
  );

  if (data?.status !== "success" || !data?.data?.link) {
    throw new Error(data?.message || "Flutterwave did not return a payment link");
  }
  return { link: data.data.link, message: data.message };
}

/**
 * Verify a transaction by its Flutterwave transaction id (server-side source
 * of truth — never trust a webhook body alone).
 */
export async function verifyTransaction(transactionId) {
  const { data } = await axios.get(
    `${API_BASE}/transactions/${encodeURIComponent(transactionId)}/verify`,
    { headers: { Authorization: `Bearer ${getSecretKey()}` }, timeout: 15000 }
  );
  if (data?.status !== "success" || !data?.data) {
    throw new Error(data?.message || "Flutterwave verification failed");
  }
  return normalizeTransaction(data.data);
}

/**
 * Verify a transaction by our own reference (tx_ref) — used by reconciliation
 * for payments whose webhook was lost before the transaction id was stored.
 */
export async function verifyTransactionByRef(txRef) {
  const { data } = await axios.get(`${API_BASE}/transactions/verify_by_reference`, {
    params: { tx_ref: txRef },
    headers: { Authorization: `Bearer ${getSecretKey()}` },
    timeout: 15000,
  });
  if (data?.status !== "success" || !data?.data) {
    throw new Error(data?.message || "Flutterwave verification failed");
  }
  return normalizeTransaction(data.data);
}

/** Normalize a Flutterwave transaction into the fields the app relies on. */
function normalizeTransaction(tx) {
  return {
    id: tx.id,
    txRef: tx.tx_ref,
    amount: Number(tx.amount),
    currency: tx.currency,
    // "successful" | "failed" | "cancelled" | "pending" | ...
    status: tx.status,
    meta: tx.meta || {},
    createdAt: tx.created_at,
  };
}

/**
 * Refund a transaction (full when `amount` omitted, otherwise partial).
 * Flutterwave refunds are async — this returns the initiated refund record.
 */
export async function refundTransaction({ transactionId, amount, meta = {} }) {
  const { data } = await axios.post(
    `${API_BASE}/transactions/${encodeURIComponent(transactionId)}/refund`,
    {
      ...(amount != null ? { amount: Number(amount) } : {}),
      meta,
    },
    {
      headers: {
        Authorization: `Bearer ${getSecretKey()}`,
        "Content-Type": "application/json",
      },
      timeout: 15000,
    }
  );
  if (data?.status !== "success" || !data?.data) {
    throw new Error(data?.message || "Flutterwave refund failed");
  }
  return {
    id: data.data.id,
    status: data.data.status,
    flwRef: data.data.flw_ref || data.data.FlwRef || null,
  };
}

/**
 * Verify a webhook request. Flutterwave includes the dashboard-configured
 * secret hash in the `verif-hash` header; reject when missing or mismatched.
 */
export function verifyWebhookSignature(headers) {
  const expected = process.env.FLW_WEBHOOK_SECRET_HASH;
  if (!expected) return false;
  const provided = headers.get?.("verif-hash") ?? headers["verif-hash"] ?? "";
  return typeof provided === "string" && provided === expected;
}
