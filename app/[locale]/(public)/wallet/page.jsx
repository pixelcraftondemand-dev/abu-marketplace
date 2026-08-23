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
  CreditCard,
  Loader2,
  Wallet,
} from "lucide-react";
import PageTitle from "@/components/PageTitle";
import CurrencyAmount from "@/components/CurrencyAmount";
import useWalletBalance from "@/lib/hooks/useWalletBalance";
import { useTranslation } from "@/lib/i18n";
import { formatPrice } from "@/lib/utils/currency";

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
  const [transactions, setTransactions] = useState([]);
  const [transactionsLoading, setTransactionsLoading] = useState(true);

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

  // Handle return from the Flutterwave hosted payment.
  useEffect(() => {
    const status = searchParams.get("status");
    if (status === "success") {
      toast.success(t("wallet.success"));
      refresh();
      fetchTransactions();
      router.replace("/wallet");
    } else if (status === "cancelled") {
      toast.error(t("wallet.cancelled"));
      router.replace("/wallet");
    }
  }, [searchParams]);

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
      const idempotencyKey =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const { data } = await axios.post(
        "/api/wallet/topup",
        { amount, idempotencyKey },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (data?.session?.url) {
        window.location.href = data.session.url;
      } else {
        toast.error(t("wallet.processing"));
      }
    } catch (error) {
      toast.error(error?.response?.data?.error || t("wallet.processing"));
    } finally {
      setTopUpInProgress(false);
    }
  };

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

  return (
    <div className="min-h-screen mx-6 my-10 text-[var(--text-primary)]">
      <div className="max-w-7xl mx-auto">
        <PageTitle heading={t("wallet.title")} text={t("wallet.subtitle")} />

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          {/* Balance card */}
          <section className="relative overflow-hidden rounded-[2rem] bg-[var(--bg-topbar)] p-8 text-white shadow-[0_25px_70px_rgba(0,0,0,0.25)]">
            <div className="absolute -right-16 -top-16 size-56 rounded-full bg-[var(--accent)]/20 blur-3xl" />
            <div className="relative">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--accent)]">
                {t("wallet.balance")}
              </p>
              <p className="mt-4 text-5xl font-semibold tracking-tight tabular-nums">
                {loading && balance == null ? (
                  <Loader2 className="animate-spin text-[var(--accent)]" size={36} />
                ) : (
                  <CurrencyAmount amount={balance ?? 0} className="text-5xl" />
                )}
              </p>
              <div className="mt-6 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.2em] text-white/50">
                <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5">
                  USD
                </span>
                <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5">
                  {t("wallet.payWithWallet")}
                </span>
              </div>
            </div>
          </section>

          {/* Top-up card */}
          <section className="rounded-[2rem] border border-[var(--border-primary)] bg-[var(--bg-surface)] p-8 shadow-sm">
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
