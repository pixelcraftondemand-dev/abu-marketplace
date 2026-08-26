"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useDispatch } from 'react-redux';
import { openSignInModal } from '@/lib/features/signInModalSlice';
import axios from "axios";
import toast from "react-hot-toast";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  CreditCard,
  Copy,
  Loader2,
  QrCode,
  Send,
  Wallet,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import PageTitle from "@/components/PageTitle";
import CurrencyAmount from "@/components/CurrencyAmount";
import useWalletBalance from "@/lib/hooks/useWalletBalance";
import { useTranslation } from "@/lib/i18n";
import { formatPrice, FALLBACK_RATES } from "@/lib/utils/currency";

const TOP_UP_PRESETS = [10, 25, 50, 100, 250];
const MIN_TOP_UP = 1;

export default function WalletPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[80vh] flex items-center justify-center">
          <Loader2 className="animate-spin text-[var(--accent)]" size={28} />
        </div>
      }
    >
      <WalletPageContent />
    </Suspense>
  );
}

function WalletPageContent() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoaded: userLoaded } = useUser();
  const { getToken } = useAuth();
  const { balance, loading, refresh } = useWalletBalance();
  const dispatch = useDispatch();

  const [selectedAmount, setSelectedAmount] = useState(50);
  const [customAmount, setCustomAmount] = useState("");
  const [topUpInProgress, setTopUpInProgress] = useState(false);
  const [topUpCode, setTopUpCode] = useState(null);
  const [paymentCodeStatus, setPaymentCodeStatus] = useState(null);
  const [transferRecipient, setTransferRecipient] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferDescription, setTransferDescription] = useState("");
  const [transferInProgress, setTransferInProgress] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawInProgress, setWithdrawInProgress] = useState(false);
  const [withdrawCode, setWithdrawCode] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [transactionsLoading, setTransactionsLoading] = useState(true);
  const [codeTimeLeft, setCodeTimeLeft] = useState(null);

  // Card payment states
  const [cardMode, setCardMode] = useState("mobile"); // mobile | card
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [cardName, setCardName] = useState("");
  const [cardType, setCardType] = useState("debit");
  const [cardInProgress, setCardInProgress] = useState(false);
  const [cardResult, setCardResult] = useState(null);

  const resolveAmount = () => {
    const custom = Number(customAmount);
    if (customAmount && Number.isFinite(custom)) return custom;
    return selectedAmount;
  };

  const fetchTransactions = async () => {
    if (!user) return;
    try {
      const token = await getToken();
      const { data } = await axios.get("/api/wallet/transactions", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTransactions(data.transactions || []);
    } catch {
      setTransactions([]);
    } finally {
      setTransactionsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchTransactions();
    } else if (userLoaded) {
      setTransactionsLoading(false);
    }
  }, [user, userLoaded]);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success("Copied to clipboard!");
    });
  };

  const handleTopUp = async (e) => {
    e.preventDefault();
    if (!user) return;
    const amount = resolveAmount();
    if (!Number.isFinite(amount) || amount < MIN_TOP_UP) {
      toast.error(t("wallet.minimum"));
      return;
    }

    setTopUpInProgress(true);
    try {
      const token = await getToken();
      const { data } = await axios.post(
        "/api/wallet/payment-code",
        { amount, type: "DEPOSIT" },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (data?.code) {
        setTopUpCode({ code: data.code, dialCode: data.dialCode, amount: data.amount });
        toast.success("Payment code generated!");
      } else {
        toast.error(t("wallet.processing"));
      }
    } catch (error) {
      toast.error(error?.response?.data?.error || t("wallet.processing"));
    } finally {
      setTopUpInProgress(false);
    }
  };

  // Poll for payment code completion + countdown timer
  useEffect(() => {
    if (!topUpCode?.code) return;

    // Start countdown from 10 minutes
    const expiresAt = topUpCode.expiresAt ? new Date(topUpCode.expiresAt).getTime() : Date.now() + 10 * 60 * 1000;
    setCodeTimeLeft(Math.max(0, Math.floor((expiresAt - Date.now()) / 1000)));

    const countdownInterval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      setCodeTimeLeft(remaining);
      if (remaining <= 0) {
        setPaymentCodeStatus("expired");
        clearInterval(countdownInterval);
      }
    }, 1000);

    const pollInterval = setInterval(async () => {
      try {
        const token = await getToken();
        const { data } = await axios.get(
          `/api/wallet/payment-code/status?code=${topUpCode.code}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (data?.code?.status === "completed") {
          setPaymentCodeStatus("completed");
          toast.success("Payment received! Wallet credited.");
          refresh();
          fetchTransactions();
          clearInterval(pollInterval);
          clearInterval(countdownInterval);
        } else if (data?.code?.status === "expired" || data?.code?.status === "failed") {
          setPaymentCodeStatus(data?.code?.status);
          toast.error(data?.code?.status === "expired" ? "Code expired. Generate a new one." : "Payment failed. Try again.");
          clearInterval(pollInterval);
          clearInterval(countdownInterval);
        }
      } catch {
        // ignore polling errors
      }
    }, 3000);

    return () => {
      clearInterval(pollInterval);
      clearInterval(countdownInterval);
    };
  }, [topUpCode?.code]);

  if (!userLoaded) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-[var(--accent)]" size={28} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-6 flex min-h-[80vh] items-center justify-center">
        <div className="max-w-lg rounded-[2rem] border border-[var(--border-primary)] bg-[var(--bg-surface)] p-8 text-center shadow-sm">
          <Wallet className="mx-auto text-[var(--accent)]" size={40} strokeWidth={1.5} />
          <h1 className="mt-4 text-3xl font-semibold text-[var(--text-primary)]">
            {t("wallet.signInRequired")}
          </h1>
          <button
            onClick={() => dispatch(openSignInModal())}
            className="mt-6 inline-block rounded-full bg-[var(--text-primary)] px-8 py-3 text-sm font-semibold text-[var(--bg-primary)] transition hover:bg-[var(--accent)]"
          >
            {t("nav.signIn")}
          </button>
        </div>
      </div>
    );
  }

  const handleTransfer = async (e) => {
    e.preventDefault();
    if (!user) return;

    const recipient = transferRecipient.trim();
    const amount = Number(transferAmount);

    if (!recipient || !recipient.includes("@")) {
      toast.error("Please enter a valid email address.");
      return;
    }
    if (!Number.isFinite(amount) || amount < 0.5) {
      toast.error("Minimum transfer is $0.50.");
      return;
    }
    if (amount > (balance ?? 0)) {
      toast.error(t("wallet.insufficient"));
      return;
    }

    setTransferInProgress(true);
    try {
      const token = await getToken();
      const { data } = await axios.post(
        "/api/wallet/transfer",
        {
          recipientEmail: recipient,
          amount,
          description: transferDescription.trim() || null,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (data?.transfer) {
        toast.success(data.message || t("wallet.transferSuccess"));
        setTransferRecipient("");
        setTransferAmount("");
        setTransferDescription("");
        refresh();
        fetchTransactions();
      } else {
        toast.error("Transfer failed. Please try again.");
      }
    } catch (error) {
      toast.error(error?.response?.data?.error || "Transfer failed.");
    } finally {
      setTransferInProgress(false);
    }
  };

  return (
    <div className="min-h-screen mx-6 my-10 text-[var(--text-primary)]">
      <div className="max-w-7xl mx-auto">
        <PageTitle heading={t("wallet.title")} text={t("wallet.subtitle")} />

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Balance card */}
          <section className="relative overflow-hidden rounded-[2rem] bg-[var(--bg-topbar)] p-8 text-white shadow-[0_25px_70px_rgba(0,0,0,0.25)]">
            <div className="absolute -right-16 -top-16 size-56 rounded-full bg-[var(--accent)]/20 blur-3xl" />
            <div className="relative">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--accent)]">
                {t("wallet.balance")}
              </p>
              {/* USD balance */}
              <p className="mt-4 text-5xl font-semibold tracking-tight tabular-nums">
                {loading && balance == null ? (
                  <Loader2 className="animate-spin text-[var(--accent)]" size={36} />
                ) : (
                  <CurrencyAmount amount={balance ?? 0} className="text-5xl" />
                )}
              </p>
              {/* SLL equivalent */}
              {!loading && balance != null && (
                <p className="mt-1 text-lg font-medium text-white/60 tabular-nums">
                  ≈ {formatPrice((balance ?? 0) * FALLBACK_RATES.SLL, "SLL")}
                </p>
              )}
              <div className="mt-6 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.2em] text-white/50">
                <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5">
                  USD + SLL
                </span>
                <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5">
                  {t("wallet.payWithWallet")}
                </span>
              </div>
            </div>
          </section>

          {/* Top-up card / USSD Payment Code display */}
          <section className="rounded-[2rem] border border-[var(--border-primary)] bg-[var(--bg-surface)] p-8 shadow-sm">
            {topUpCode ? (
              /* ── USSD Payment Code Display (Monime style) ─────── */
              <div className="text-center">
                {paymentCodeStatus === "completed" ? (
                  <>
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                      <span className="text-3xl">✓</span>
                    </div>
                    <p className="text-lg font-bold text-green-600">Payment Received!</p>
                    <p className="text-sm text-slate-500 mt-2">Your wallet has been credited.</p>
                    <button onClick={() => { setTopUpCode(null); setPaymentCodeStatus(null); }} className="mt-4 text-sm font-medium text-[var(--accent)] hover:underline">
                      ← New deposit
                    </button>
                  </>
                ) : paymentCodeStatus === "expired" ? (
                  <>
                    <p className="text-lg font-bold text-red-500">Code Expired</p>
                    <p className="text-sm text-slate-500 mt-2">Generate a new code to try again.</p>
                    <button onClick={() => { setTopUpCode(null); setPaymentCodeStatus(null); }} className="mt-4 text-sm font-medium text-[var(--accent)] hover:underline">
                      ← New deposit
                    </button>
                  </>
                ) : (
                  <>
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--accent)]/10">
                      <QrCode size={32} className="text-[var(--accent)]" />
                    </div>
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--accent)]">
                      Mobile Money Deposit
                    </p>

                    {/* The dial code — big, easy to copy */}
                    <div className="mt-5">
                      <p className="text-xs text-slate-400 mb-2">Dial this code:</p>
                      <div className="flex items-center justify-center gap-3">
                        <span className="rounded-2xl border-2 border-dashed border-[var(--accent)] bg-[var(--bg-muted)] px-6 py-5 text-3xl sm:text-4xl font-bold tracking-[0.15em] text-[var(--text-primary)] font-mono select-all">
                          {topUpCode.dialCode}
                        </span>
                        <button
                          onClick={() => copyToClipboard(topUpCode.dialCode)}
                          className="rounded-xl bg-[var(--accent)] text-white p-4 transition hover:opacity-90 active:scale-95 shadow-lg shadow-[var(--accent)]/20"
                          title="Copy code"
                        >
                          <Copy size={22} />
                        </button>
                      </div>
                    </div>

                    <p className="mt-3 text-sm font-semibold text-[var(--text-primary)]">
                      Amount: <CurrencyAmount amount={topUpCode.amount} />
                    </p>

                    {/* Countdown timer */}
                    {codeTimeLeft !== null && codeTimeLeft > 0 && (
                      <div className="mt-4">
                        <div className="mx-auto w-full max-w-[200px]">
                          <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-200">
                            <div
                              className="absolute inset-y-0 left-0 rounded-full bg-[var(--accent)] transition-all duration-1000"
                              style={{ width: `${(codeTimeLeft / 600) * 100}%` }}
                            />
                          </div>
                        </div>
                        <p className="mt-2 text-xs font-medium text-slate-500 tabular-nums">
                          Code expires in {Math.floor(codeTimeLeft / 60)}:{String(codeTimeLeft % 60).padStart(2, "0")}
                        </p>
                      </div>
                    )}

                    {/* Simple instructions */}
                    <div className="mt-4 text-left bg-slate-50 rounded-xl p-4">
                      <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">How to pay:</p>
                      <ol className="text-xs text-slate-600 space-y-1.5 list-decimal list-inside">
                        <li>Copy the code above</li>
                        <li>Dial <strong className="font-mono">{topUpCode.dialCode}</strong> on your phone</li>
                        <li>Choose SIM 1 (Orange) or SIM 2 (Afrimoney)</li>
                        <li>Enter your mobile money PIN</li>
                        <li>Done! Wallet credited instantly</li>
                      </ol>
                    </div>

                    {/* Waiting indicator */}
                    <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-400">
                      <Loader2 size={12} className="animate-spin" />
                      Waiting for payment...
                    </div>

                    <button
                      onClick={() => { setTopUpCode(null); setPaymentCodeStatus(null); }}
                      className="mt-3 text-sm font-medium text-slate-400 hover:text-[var(--accent)] transition"
                    >
                      Cancel
                    </button>
                  </>
                )}
              </div>
            ) : (
              /* ── Deposit Form ────────────────────────────────────── */
              <>
                {/* Payment method tabs */}
                <div className="flex gap-2 mb-6">
                  <button
                    type="button"
                    onClick={() => setCardMode("mobile")}
                    className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                      cardMode === "mobile"
                        ? "bg-[var(--accent)] text-white"
                        : "bg-[var(--bg-muted)] text-[var(--text-secondary)] hover:bg-[var(--accent)]/10"
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <QrCode size={16} />
                      Mobile Money
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCardMode("card")}
                    className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                      cardMode === "card"
                        ? "bg-[var(--accent)] text-white"
                        : "bg-[var(--bg-muted)] text-[var(--text-secondary)] hover:bg-[var(--accent)]/10"
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <CreditCard size={16} />
                      Card
                    </div>
                  </button>
                </div>

                {/* Card mode: show card form */}
                {cardMode === "card" && (
                  <>
                    {cardResult ? (
                      /* Card payment result */
                      <div className="text-center">
                        {cardResult.success ? (
                          <>
                            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                              <CheckCircle2 size={32} className="text-green-600" />
                            </div>
                            <p className="text-lg font-bold text-green-600">Payment Successful!</p>
                            <p className="text-sm text-slate-500 mt-2">${cardResult.amount.toFixed(2)} added to your wallet</p>
                            <p className="text-xs text-slate-400 mt-1">
                              {cardResult.cardBrand.toUpperCase()} ****{cardResult.cardLast4}
                            </p>
                            <p className="text-xs text-slate-400 mt-1">
                              Auth: {cardResult.authorizationCode}
                            </p>
                            <button
                              onClick={() => {
                                setCardResult(null);
                                setCardNumber("");
                                setCardExpiry("");
                                setCardCvv("");
                                setCardName("");
                                refresh();
                                fetchTransactions();
                              }}
                              className="mt-4 text-sm font-medium text-[var(--accent)] hover:underline"
                            >
                              ← New payment
                            </button>
                          </>
                        ) : (
                          <>
                            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                              <AlertCircle size={32} className="text-red-600" />
                            </div>
                            <p className="text-lg font-bold text-red-500">Payment Failed</p>
                            <p className="text-sm text-slate-500 mt-2">Please try again with a different card</p>
                            <button
                              onClick={() => setCardResult(null)}
                              className="mt-4 text-sm font-medium text-[var(--accent)] hover:underline"
                            >
                              ← Try again
                            </button>
                          </>
                        )}
                      </div>
                    ) : (
                      /* Card payment form */
                      <form
                        onSubmit={async (e) => {
                          e.preventDefault();
                          if (!user) return;
                          const amount = resolveAmount();
                          if (!Number.isFinite(amount) || amount < MIN_TOP_UP) {
                            toast.error(t("wallet.minimum"));
                            return;
                          }

                          setCardInProgress(true);
                          try {
                            const token = await getToken();
                            const { data } = await axios.post(
                              "/api/wallet/card-topup",
                              {
                                amount,
                                card: {
                                  number: cardNumber.replace(/\s/g, ""),
                                  expiry: cardExpiry,
                                  cvv: cardCvv,
                                  name: cardName,
                                  type: cardType,
                                },
                              },
                              { headers: { Authorization: `Bearer ${token}` } }
                            );
                            if (data?.success) {
                              setCardResult(data);
                              toast.success(data.message || "Payment successful!");
                            } else {
                              setCardResult({ success: false, error: data?.error });
                              toast.error(data?.error || "Payment failed");
                            }
                          } catch (error) {
                            setCardResult({ success: false, error: error?.response?.data?.error });
                            toast.error(error?.response?.data?.error || "Payment failed");
                          } finally {
                            setCardInProgress(false);
                          }
                        }}
                        className="space-y-4"
                      >
                        {/* Amount */}
                        <div className="grid grid-cols-3 gap-2">
                          {TOP_UP_PRESETS.map((amount) => (
                            <button
                              key={amount}
                              type="button"
                              onClick={() => {
                                setSelectedAmount(amount);
                                setCustomAmount("");
                              }}
                              className={`rounded-2xl border px-3 py-2.5 text-sm font-semibold transition ${
                                !customAmount && selectedAmount === amount
                                  ? "border-[var(--accent)] bg-[var(--bg-muted)] text-[var(--text-primary)]"
                                  : "border-[var(--border-primary)] text-[var(--text-primary)] hover:border-[var(--accent)]"
                              }`}
                            >
                              <CurrencyAmount amount={amount} />
                            </button>
                          ))}
                        </div>
                        <label className="block text-sm font-medium text-[var(--text-primary)]">
                          Amount (USD)
                          <input
                            type="number"
                            min={MIN_TOP_UP}
                            step="1"
                            value={customAmount}
                            onChange={(e) => {
                              setCustomAmount(e.target.value);
                              if (e.target.value) setSelectedAmount(null);
                            }}
                            placeholder={formatPrice(50, "USD", "en-US")}
                            className="mt-2 w-full rounded-2xl border border-[var(--border-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--bg-muted)]"
                          />
                        </label>

                        {/* Card type */}
                        <div className="flex gap-2">
                          {['debit', 'prepaid', 'credit'].map((type) => (
                            <button
                              key={type}
                              type="button"
                              onClick={() => setCardType(type)}
                              className={`flex-1 rounded-xl px-3 py-2 text-xs font-semibold capitalize transition ${
                                cardType === type
                                  ? "bg-[var(--text-primary)] text-[var(--bg-primary)]"
                                  : "bg-[var(--bg-muted)] text-[var(--text-secondary)] hover:bg-[var(--accent)]/10"
                              }`}
                            >
                              {type}
                            </button>
                          ))}
                        </div>

                        {/* Card number */}
                        <label className="block text-sm font-medium text-[var(--text-primary)]">
                          Card Number
                          <input
                            type="text"
                            inputMode="numeric"
                            maxLength={19}
                            required
                            value={cardNumber}
                            onChange={(e) => {
                              // Format as XXXX XXXX XXXX XXXX
                              const value = e.target.value.replace(/\D/g, "").slice(0, 16);
                              const formatted = value.replace(/(.{4})/g, "$1 ").trim();
                              setCardNumber(formatted);
                            }}
                            placeholder="4242 4242 4242 4242"
                            className="mt-2 w-full rounded-2xl border border-[var(--border-primary)] px-4 py-3 text-sm text-[var(--text-primary)] font-mono outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--bg-muted)]"
                          />
                        </label>

                        {/* Expiry and CVV */}
                        <div className="grid grid-cols-2 gap-3">
                          <label className="block text-sm font-medium text-[var(--text-primary)]">
                            Expiry
                            <input
                              type="text"
                              maxLength={5}
                              required
                              value={cardExpiry}
                              onChange={(e) => {
                                let value = e.target.value.replace(/\D/g, "").slice(0, 4);
                                if (value.length >= 2) {
                                  value = value.slice(0, 2) + "/" + value.slice(2);
                                }
                                setCardExpiry(value);
                              }}
                              placeholder="MM/YY"
                              className="mt-2 w-full rounded-2xl border border-[var(--border-primary)] px-4 py-3 text-sm text-[var(--text-primary)] font-mono outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--bg-muted)]"
                            />
                          </label>
                          <label className="block text-sm font-medium text-[var(--text-primary)]">
                            CVV
                            <input
                              type="password"
                              inputMode="numeric"
                              maxLength={4}
                              required
                              value={cardCvv}
                              onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                              placeholder="123"
                              className="mt-2 w-full rounded-2xl border border-[var(--border-primary)] px-4 py-3 text-sm text-[var(--text-primary)] font-mono outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--bg-muted)]"
                            />
                          </label>
                        </div>

                        {/* Cardholder name */}
                        <label className="block text-sm font-medium text-[var(--text-primary)]">
                          Cardholder Name
                          <input
                            type="text"
                            required
                            value={cardName}
                            onChange={(e) => setCardName(e.target.value)}
                            placeholder="JOHN DOE"
                            className="mt-2 w-full rounded-2xl border border-[var(--border-primary)] px-4 py-3 text-sm text-[var(--text-primary)] uppercase outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--bg-muted)]"
                          />
                        </label>

                        <button
                          type="submit"
                          disabled={cardInProgress}
                          className="flex w-full items-center justify-center gap-2 rounded-full bg-[var(--text-primary)] px-6 py-3.5 text-sm font-semibold text-[var(--bg-primary)] transition hover:bg-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {cardInProgress ? (
                            <Loader2 className="animate-spin" size={18} />
                          ) : (
                            <CreditCard size={18} />
                          )}
                          Pay with Card
                        </button>
                        <p className="text-center text-xs text-[var(--text-tertiary)]">
                          {t("wallet.minimum")} • Secure payment via AMBER PAY
                        </p>
                </form>
                )}
              )}
                  </>
                )}

                {/* Mobile Money mode: show existing form */}
                {cardMode === "mobile" && (
                  <>
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--accent)]">
                      {t("wallet.addFunds")}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                      {t("wallet.topUpHint")}
                    </p>
                    <form onSubmit={handleTopUp} className="mt-6 space-y-4">
                      <div className="grid grid-cols-3 gap-2">
                        {TOP_UP_PRESETS.map((amount) => (
                          <button
                            key={amount}
                            type="button"
                            onClick={() => {
                              setSelectedAmount(amount);
                              setCustomAmount("");
                            }}
                            className={`rounded-2xl border px-3 py-2.5 text-sm font-semibold transition ${
                              !customAmount && selectedAmount === amount
                                ? "border-[var(--accent)] bg-[var(--bg-muted)] text-[var(--text-primary)]"
                                : "border-[var(--border-primary)] text-[var(--text-primary)] hover:border-[var(--accent)]"
                            }`}
                          >
                            <CurrencyAmount amount={amount} />
                          </button>
                        ))}
                      </div>
                      <label className="block text-sm font-medium text-[var(--text-primary)]">
                        {t("checkout.subtotal")}
                        <input
                          type="number"
                          min={MIN_TOP_UP}
                          step="1"
                          value={customAmount}
                          onChange={(e) => {
                            setCustomAmount(e.target.value);
                            if (e.target.value) setSelectedAmount(null);
                          }}
                          placeholder={formatPrice(50, "USD", "en-US")}
                          className="mt-2 w-full rounded-2xl border border-[var(--border-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--bg-muted)]"
                        />
                      </label>
                      <button
                        type="submit"
                        disabled={topUpInProgress}
                        className="flex w-full items-center justify-center gap-2 rounded-full bg-[var(--text-primary)] px-6 py-3.5 text-sm font-semibold text-[var(--bg-primary)] transition hover:bg-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {topUpInProgress ? (
                          <Loader2 className="animate-spin" size={18} />
                        ) : (
                          <CreditCard size={18} />
                        )}
                        {t("wallet.topUp")}
                      </button>
                      <p className="text-center text-xs text-[var(--text-tertiary)]">
                        {t("wallet.minimum")}
                      </p>
                    </form>
                  </>
                )}
          </section>
          {/* ── Withdraw Cash Card ──────────────────────────────── */}
          <section className="rounded-[2rem] border border-[var(--border-primary)] bg-[var(--bg-surface)] p-8 shadow-sm">
            {withdrawCode ? (
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10">
                  <Banknote size={32} className="text-amber-500" />
                </div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-500">
                  {t("wallet.agentRef")}
                </p>
                <p className="mt-4 text-sm text-[var(--text-secondary)]">
                  Show this code to an AMBER PAY agent to collect your cash
                </p>
                <div className="mt-4 flex items-center justify-center gap-3">
                  <span className="rounded-2xl border-2 border-dashed border-amber-500 bg-amber-50 px-8 py-4 text-3xl font-bold tracking-[0.3em] text-slate-800">
                    {withdrawCode.code}
                  </span>
                  <button
                    onClick={() => copyToClipboard(withdrawCode.code)}
                    className="rounded-xl border border-[var(--border-primary)] p-3 transition hover:bg-[var(--bg-muted)]"
                    title="Copy code"
                  >
                    <Copy size={18} className="text-[var(--accent)]" />
                  </button>
                </div>
                <p className="mt-3 text-sm font-semibold text-slate-800">
                  Amount: <CurrencyAmount amount={withdrawCode.amount} />
                </p>
                <p className="mt-4 text-xs text-[var(--text-tertiary)]">
                  Agent will hand you {withdrawCode.amount} USD in cash.
                </p>
                <button
                  onClick={() => setWithdrawCode(null)}
                  className="mt-4 text-sm font-medium text-[var(--accent)] hover:underline"
                >
                  ← New withdrawal
                </button>
              </div>
            ) : (
              <>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-500">
                  {t("wallet.withdrawal")}
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                  Withdraw cash from your wallet at any AMBER PAY agent.
                </p>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!user) return;
                    const amount = Number(withdrawAmount);
                    if (!Number.isFinite(amount) || amount < 1) {
                      toast.error(t("wallet.minimum"));
                      return;
                    }
                    if (amount > (balance ?? 0)) {
                      toast.error(t("wallet.insufficient"));
                      return;
                    }
                    setWithdrawInProgress(true);
                    try {
                      const token = await getToken();
                      const { data } = await axios.post(
                        "/api/wallet/withdraw",
                        { amount },
                        { headers: { Authorization: `Bearer ${token}` } }
                      );
                      if (data?.request?.agentRef) {
                        setWithdrawCode({ code: data.request.agentRef, amount });
                        toast.success("Withdrawal request created!");
                      } else {
                        toast.error("Failed to create request.");
                      }
                    } catch (err) {
                      toast.error(err?.response?.data?.error || "Failed.");
                    } finally {
                      setWithdrawInProgress(false);
                    }
                  }}
                  className="mt-6 space-y-4"
                >
                  <label className="block text-sm font-medium text-[var(--text-primary)]">
                    Amount (USD)
                    <input
                      type="number"
                      min="1"
                      step="0.01"
                      required
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      placeholder="0.00"
                      className="mt-2 w-full rounded-2xl border border-[var(--border-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                    />
                  </label>
                  {withdrawAmount && Number(withdrawAmount) > 0 && (
                    <p className="text-xs text-[var(--text-tertiary)]">
                      {(balance ?? 0) < Number(withdrawAmount)
                        ? `⚠ ${t("wallet.insufficient")}`
                        : `Available: $${(balance ?? 0).toFixed(2)}`}
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={withdrawInProgress || !withdrawAmount}
                    className="flex w-full items-center justify-center gap-2 rounded-full bg-amber-500 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {withdrawInProgress ? (
                      <Loader2 className="animate-spin" size={18} />
                    ) : (
                      <Banknote size={18} />
                    )}
                    {t("wallet.withdrawal")}
                  </button>
                </form>
              </>
            )}
          </section>

          {/* ── Send Money Card ─────────────────────────────────── */}
          <section className="rounded-[2rem] border border-[var(--border-primary)] bg-[var(--bg-surface)] p-8 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--accent)]">
              {t("wallet.transfer")}
            </p>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              {t("wallet.transferHint")}
            </p>
            <form onSubmit={handleTransfer} className="mt-6 space-y-4">
              <label className="block text-sm font-medium text-[var(--text-primary)]">
                {t("wallet.transferRecipient")}
                <input
                  type="email"
                  required
                  value={transferRecipient}
                  onChange={(e) => setTransferRecipient(e.target.value)}
                  placeholder="recipient@email.com"
                  className="mt-2 w-full rounded-2xl border border-[var(--border-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--bg-muted)]"
                />
              </label>
              <label className="block text-sm font-medium text-[var(--text-primary)]">
                {t("wallet.transferAmount")}
                <input
                  type="number"
                  min="0.5"
                  step="0.01"
                  required
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  placeholder="0.00"
                  className="mt-2 w-full rounded-2xl border border-[var(--border-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--bg-muted)]"
                />
              </label>
              <label className="block text-sm font-medium text-[var(--text-primary)]">
                {t("wallet.transferDescription")}
                <input
                  type="text"
                  maxLength={200}
                  value={transferDescription}
                  onChange={(e) => setTransferDescription(e.target.value)}
                  placeholder="e.g. Lunch money"
                  className="mt-2 w-full rounded-2xl border border-[var(--border-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--bg-muted)]"
                />
              </label>
              {transferAmount && Number(transferAmount) > 0 && (
                <p className="text-xs text-[var(--text-tertiary)]">
                  {(balance ?? 0) < Number(transferAmount)
                    ? `⚠ ${t("wallet.insufficient")}`
                    : `Available: $${(balance ?? 0).toFixed(2)} • Fee: $${(Number(transferAmount) * 0.02).toFixed(2)}`}
                </p>
              )}
              <button
                type="submit"
                disabled={transferInProgress || !transferRecipient || !transferAmount}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-6 py-3.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {transferInProgress ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <Send size={18} />
                )}
                {t("wallet.transfer")}
              </button>
            </form>
          </section>
        </div>

        {/* Transaction history */}
        <section className="mt-10 rounded-[2rem] border border-[var(--border-primary)] bg-[var(--bg-surface)] p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">
            {t("wallet.transactions")}
          </h2>
          <div className="mt-6 space-y-1">
            {transactionsLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="animate-spin text-[var(--accent)]" size={24} />
              </div>
            ) : transactions.length === 0 ? (
              <p className="py-10 text-center text-sm text-[var(--text-tertiary)]">
                {t("wallet.noTransactions")}
              </p>
            ) : (
              transactions.map((tx) => {
                const isCredit = tx.amount > 0;
                return (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between gap-4 rounded-2xl px-4 py-3 transition hover:bg-[var(--bg-muted)]"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`flex size-10 items-center justify-center rounded-full ${
                          isCredit
                            ? "bg-emerald-50 text-emerald-600"
                            : "bg-[var(--bg-muted)] text-[var(--accent)]"
                        }`}
                      >
                        {isCredit ? (
                          <ArrowDownLeft size={18} />
                        ) : (
                          <ArrowUpRight size={18} />
                        )}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-[var(--text-primary)]">
                          {tx.type === "TOPUP"
                            ? t("wallet.topup")
                            : tx.type === "P2P_SEND"
                            ? t("wallet.p2pSend")
                            : tx.type === "P2P_RECEIVE"
                            ? t("wallet.p2pReceive")
                            : tx.type === "WITHDRAWAL"
                            ? t("wallet.withdrawal")
                            : t("wallet.payment")}
                        </p>
                        <p className="text-xs text-[var(--text-tertiary)]">
                          {new Date(tx.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-sm font-semibold tabular-nums ${
                          isCredit ? "text-emerald-600" : "text-[var(--text-primary)]"
                        }`}
                      >
                        {isCredit ? "+" : ""}
                        <CurrencyAmount amount={Math.abs(tx.amount)} />
                      </p>
                      <p className="text-xs text-[var(--text-tertiary)]">
                        {t("wallet.balance")}:{" "}
                        <CurrencyAmount amount={tx.balanceAfter} />
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
