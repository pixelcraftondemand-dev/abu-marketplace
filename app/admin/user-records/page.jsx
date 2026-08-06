"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import axios from "axios";
import toast from "react-hot-toast";
import {
  Search,
  User as UserIcon,
  Store,
  Package,
  CreditCard,
  Wallet,
  MapPin,
  Star,
  ShieldCheck,
  ChevronRight,
  Loader2,
} from "lucide-react";
import Loading from "@/components/Loading";

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
}

function StatusBadge({ deletedAt, dataRetentionUntil }) {
  if (!deletedAt) {
    return <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">Active</span>;
  }
  return (
    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
      Closed · retained until {formatDate(dataRetentionUntil)}
    </span>
  );
}

function SectionCard({ icon: Icon, title, children }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Icon size={18} className="text-slate-500" />
        <h3 className="font-semibold text-slate-800">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function DataRow({ label, value }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-100 py-2 text-sm last:border-0">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-medium text-slate-800">{value || "—"}</span>
    </div>
  );
}

export default function AdminUserRecords() {
  const { getToken } = useAuth();

  const [query, setQuery] = useState("");
  const [users, setUsers] = useState([]);
  const [record, setRecord] = useState(null);
  const [searching, setSearching] = useState(false);
  const [loadingRecord, setLoadingRecord] = useState(false);

  const searchRecords = async (e) => {
    if (e) e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    setRecord(null);
    try {
      const token = await getToken();
      const { data } = await axios.get(`/api/admin/user-records?q=${encodeURIComponent(q)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(data.users || []);
    } catch (error) {
      toast.error(error?.response?.data?.error || "Search failed.");
    } finally {
      setSearching(false);
    }
  };

  const openRecord = async (userId) => {
    setLoadingRecord(true);
    try {
      const token = await getToken();
      const { data } = await axios.get(`/api/admin/user-records/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRecord(data.record);
    } catch (error) {
      toast.error(error?.response?.data?.error || "Unable to load the account record.");
    } finally {
      setLoadingRecord(false);
    }
  };



  return (
    <div className="mb-28 text-slate-500">
      <h1 className="text-2xl">
        Account <span className="font-medium text-slate-800">Records</span>
      </h1>
      <p className="mt-1 max-w-2xl text-sm">
        Retained account and financial records (AML / law-enforcement requests).
        Includes closed accounts, which are kept for 5 years from closure.
      </p>

      {/* Search */}
      <form onSubmit={searchRecords} className="mt-5 flex max-w-xl items-center gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, email, or account id"
            className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-800 outline-none transition focus:border-green-500"
          />
        </div>
        <button
          type="submit"
          disabled={searching}
          className="rounded-lg bg-slate-800 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-900 disabled:opacity-60"
        >
          {searching ? <Loader2 size={16} className="animate-spin" /> : "Search"}
        </button>
      </form>

      {loadingRecord ? (
        <Loading />
      ) : record ? (
        <div className="mt-6 space-y-5">
          {/* Back */}
          <button
            onClick={() => setRecord(null)}
            className="text-sm font-medium text-slate-600 underline-offset-2 hover:underline"
          >
            ← Back to results
          </button>

          {/* Identity */}
          <SectionCard icon={UserIcon} title="Account">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-xl font-semibold text-slate-800">{record.name || "Unnamed"}</h2>
              <StatusBadge deletedAt={record.deletedAt} dataRetentionUntil={record.dataRetentionUntil} />
            </div>
            <div className="mt-3 grid gap-x-8 sm:grid-cols-2">
              <DataRow label="Account id" value={record.id} />
              <DataRow label="Email" value={record.email} />
              <DataRow label="Email verified" value={record.emailVerified ? "Yes" : "No"} />
              <DataRow label="Joined" value={formatDate(record.createdAt)} />
              <DataRow label="Account closed" value={formatDate(record.deletedAt)} />
              <DataRow label="Retention until" value={formatDate(record.dataRetentionUntil)} />
              <DataRow label="Membership" value={record.membershipTier || "—"} />
              <DataRow label="Membership status" value={record.membershipStatus || "—"} />
            </div>
          </SectionCard>

          {/* Store */}
          {record.store && (
            <SectionCard icon={Store} title="Store">
              <div className="grid gap-x-8 sm:grid-cols-2">
                <DataRow label="Store name" value={record.store.name} />
                <DataRow label="Username" value={record.store.username} />
                <DataRow label="Status" value={record.store.status} />
                <DataRow label="Active" value={record.store.isActive ? "Yes" : "No"} />
                <DataRow label="Email" value={record.store.email} />
                <DataRow label="Contact" value={record.store.contact} />
              </div>
              {record.store.description && (
                <p className="mt-3 text-sm text-slate-600">{record.store.description}</p>
              )}
            </SectionCard>
          )}

          {/* Orders */}
          <SectionCard icon={Package} title={`Orders (${record.buyerOrders?.length || 0})`}>
            {record.buyerOrders?.length ? (
              <div className="space-y-3">
                {record.buyerOrders.map((order) => (
                  <div key={order.id} className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                      <span className="font-medium text-slate-800">{order.id}</span>
                      <span className="text-xs text-slate-500">{formatDate(order.createdAt)}</span>
                    </div>
                    <div className="mt-2 grid gap-x-8 text-sm sm:grid-cols-3">
                      <DataRow label="Total" value={`$${Number(order.total || 0).toFixed(2)}`} />
                      <DataRow label="Status" value={order.status} />
                      <DataRow label="Payment" value={order.paymentMethod} />
                      <DataRow label="Paid" value={order.isPaid ? "Yes" : "No"} />
                      <DataRow label="Payment status" value={order.paymentStatus} />
                      <DataRow label="Address id" value={order.addressId} />
                    </div>
                    {order.orderItems?.length > 0 && (
                      <div className="mt-3 space-y-1 border-t border-slate-200 pt-2">
                        {order.orderItems.map((item) => (
                          <div key={`${item.orderId}-${item.productId}`} className="flex justify-between text-xs text-slate-600">
                            <span>
                              {item.product?.name || item.productId} × {item.quantity}
                            </span>
                            <span>${Number(item.price || 0).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400">No orders on record.</p>
            )}
          </SectionCard>

          {/* Payments */}
          <SectionCard icon={CreditCard} title={`Payments (${record.payments?.length || 0})`}>
            {record.payments?.length ? (
              <div className="space-y-3">
                {record.payments.map((payment) => (
                  <div key={payment.id} className="rounded-lg border border-slate-100 bg-slate-50 p-4 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium text-slate-800">{payment.id}</span>
                      <span className="text-xs text-slate-500">{formatDate(payment.createdAt)}</span>
                    </div>
                    <div className="mt-2 grid gap-x-8 sm:grid-cols-2">
                      <DataRow label="Amount" value={`${payment.currency || "USD"} ${Number(payment.amount || 0).toFixed(2)}`} />
                      <DataRow label="Status" value={payment.status} />
                      <DataRow label="Provider" value={payment.providerTransactionId || payment.providerSessionId || "—"} />
                      <DataRow label="Idempotency key" value={payment.idempotencyKey} />
                    </div>
                    {payment.refunds?.length > 0 && (
                      <div className="mt-2 border-t border-slate-200 pt-2 text-xs text-slate-600">
                        {payment.refunds.map((refund) => (
                          <p key={refund.id}>
                            Refund {refund.status} — ${Number(refund.amount || 0).toFixed(2)}{" "}
                            {refund.reason ? `(${refund.reason})` : ""}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400">No payment records.</p>
            )}
          </SectionCard>

          {/* Wallet */}
          <SectionCard icon={Wallet} title="Wallet">
            <DataRow label="Balance" value={`$${Number(record.wallet?.balance || 0).toFixed(2)}`} />
            {record.wallet?.transactions?.length ? (
              <div className="mt-3 space-y-2">
                {record.wallet.transactions.map((tx) => (
                  <div key={tx.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-4 py-2 text-sm">
                    <span className="font-medium text-slate-700">{tx.type}</span>
                    <span className="text-xs text-slate-500">{tx.description || "—"}</span>
                    <span className="text-xs text-slate-500">{formatDate(tx.createdAt)}</span>
                    <span className={`font-semibold ${tx.amount >= 0 ? "text-green-600" : "text-red-500"}`}>
                      {tx.amount >= 0 ? "+" : ""}${Number(tx.amount).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-slate-400">No wallet transactions.</p>
            )}
          </SectionCard>

          {/* Addresses */}
          <SectionCard icon={MapPin} title={`Addresses (${record.Address?.length || 0})`}>
            {record.Address?.length ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {record.Address.map((address) => (
                  <div key={address.id} className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
                    <p className="font-medium text-slate-800">{address.name}</p>
                    <p>{address.street}, {address.city}, {address.state} {address.zip}</p>
                    <p>{address.country} · {address.phone}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400">No saved addresses.</p>
            )}
          </SectionCard>

          {/* Ratings */}
          <SectionCard icon={Star} title={`Ratings & reviews (${record.ratings?.length || 0})`}>
            {record.ratings?.length ? (
              <div className="space-y-2">
                {record.ratings.map((rating) => (
                  <div key={rating.id} className="rounded-lg bg-slate-50 px-4 py-2 text-sm">
                    <p className="font-medium text-slate-700">
                      {rating.rating}/5 <span className="text-xs font-normal text-slate-500">· {formatDate(rating.createdAt)}</span>
                    </p>
                    <p className="text-slate-600">{rating.review || "No review text."}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400">No ratings on record.</p>
            )}
          </SectionCard>
        </div>
      ) : users.length > 0 ? (
        <div className="mt-6 space-y-3">
          {users.map((u) => (
            <button
              key={u.id}
              onClick={() => openRecord(u.id)}
              className="group flex w-full max-w-2xl items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-green-500/40 hover:bg-green-50/40"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-slate-800">{u.name || "Unnamed"}</p>
                  <StatusBadge deletedAt={u.deletedAt} dataRetentionUntil={u.dataRetentionUntil} />
                </div>
                <p className="mt-0.5 truncate text-sm text-slate-500">{u.email || "—"}</p>
                <p className="mt-0.5 truncate text-xs text-slate-400">{u.id}</p>
              </div>
              <ChevronRight size={18} className="shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-green-600" />
            </button>
          ))}
        </div>
      ) : searching ? (
        <div className="mt-10 flex justify-center text-slate-400">
          <Loader2 className="animate-spin" size={24} />
        </div>
      ) : (
        <div className="mt-14 flex flex-col items-center gap-3 text-center">
          <ShieldCheck size={36} className="text-slate-300" />
          <p className="text-slate-400">Search for an account by name, email, or id to view its retained records.</p>
        </div>
      )}
    </div>
  );
}
