'use client'

import { useEffect, useState } from "react"
import axios from "axios"
import {
    ArrowDownLeft,
    ArrowUpRight,
    ChevronLeft,
    ChevronRight,
    Download,
    History,
    Loader2,
    RefreshCw,
    Search,
    TrendingDown,
    TrendingUp,
    Wallet,
} from "lucide-react"
import CurrencyAmount from "@/components/CurrencyAmount"

const TYPE_FILTERS = [
    { value: null, label: "All" },
    { value: "CASH_IN", label: "Cash-Ins" },
    { value: "CASH_OUT", label: "Cash-Outs" },
]

export default function AgentHistoryPage() {
    const [transactions, setTransactions] = useState([])
    const [summary, setSummary] = useState(null)
    const [pagination, setPagination] = useState(null)
    const [loading, setLoading] = useState(true)
    const [typeFilter, setTypeFilter] = useState(null)
    const [searchQuery, setSearchQuery] = useState("")
    const [page, setPage] = useState(0)
    const LIMIT = 20

    const fetchData = async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams({ limit: String(LIMIT), offset: String(page * LIMIT) })
            if (typeFilter) params.set("type", typeFilter)

            const { data } = await axios.get(`/api/agent/history?${params}`)
            setTransactions(data.transactions || [])
            setSummary(data.summary || null)
            setPagination(data.pagination || null)
        } catch (err) {
            console.error("[AgentHistory]", err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        setPage(0)
        fetchData()
    }, [typeFilter])

    useEffect(() => {
        fetchData()
    }, [page])

    const filtered = transactions.filter((t) => {
        if (!searchQuery) return true
        const q = searchQuery.toLowerCase()
        return (
            t.agentRef?.toLowerCase().includes(q) ||
            t.user?.name?.toLowerCase().includes(q) ||
            t.user?.email?.toLowerCase().includes(q)
        )
    })

    const exportCSV = () => {
        const headers = ["Date", "Type", "User", "Email", "Amount", "Fee", "Ref"]
        const rows = transactions.map((t) => [
            new Date(t.confirmedAt || t.createdAt).toISOString(),
            t.type,
            t.user?.name || "",
            t.user?.email || "",
            t.amount.toFixed(2),
            t.fee.toFixed(2),
            t.agentRef || "",
        ])
        const csv = [headers, ...rows].map((r) => r.join(",")).join("\n")
        const blob = new Blob([csv], { type: "text/csv" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `amber-pay-history-${new Date().toISOString().slice(0, 10)}.csv`
        a.click()
        URL.revokeObjectURL(url)
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Transaction History</h1>
                    <p className="text-sm text-slate-500 mt-1">All processed cash-in and cash-out transactions</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={exportCSV}
                        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg px-3 py-1.5 transition"
                    >
                        <Download size={14} />
                        Export CSV
                    </button>
                    <button
                        onClick={fetchData}
                        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition"
                    >
                        <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                    </button>
                </div>
            </div>

            {/* Summary cards */}
            {summary && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <SummaryCard
                        icon={<TrendingUp size={18} className="text-green-500" />}
                        label="Total Cash-Ins"
                        value={`$${summary.totalCashIn.toFixed(2)}`}
                        sub={`${summary.totalCashInCount} transactions`}
                        bg="bg-green-50"
                    />
                    <SummaryCard
                        icon={<TrendingDown size={18} className="text-red-500" />}
                        label="Total Cash-Outs"
                        value={`$${summary.totalCashOut.toFixed(2)}`}
                        sub={`${summary.totalCashOutCount} transactions`}
                        bg="bg-red-50"
                    />
                    <SummaryCard
                        icon={<Wallet size={18} className="text-amber-500" />}
                        label="Net Flow"
                        value={`$${(summary.totalCashIn - summary.totalCashOut).toFixed(2)}`}
                        sub="cash-in minus cash-out"
                        bg="bg-amber-50"
                    />
                    <SummaryCard
                        icon={<TrendingUp size={18} className="text-purple-500" />}
                        label="Fees Earned"
                        value={`$${summary.totalFeesEarned.toFixed(2)}`}
                        sub="total commission"
                        bg="bg-purple-50"
                    />
                </div>
            )}

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
                    {TYPE_FILTERS.map((f) => (
                        <button
                            key={f.value || "all"}
                            onClick={() => setTypeFilter(f.value)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                                typeFilter === f.value
                                    ? "bg-white text-slate-800 shadow-sm"
                                    : "text-slate-500 hover:text-slate-700"
                            }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>

                <div className="relative flex-1 max-w-xs">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by name, email, or ref..."
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-100"
                    />
                </div>
            </div>

            {/* Transactions table */}
            <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="py-16 text-center">
                        <Loader2 className="animate-spin text-amber-500 mx-auto" size={28} />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="py-16 text-center">
                        <History size={36} className="mx-auto text-slate-200 mb-3" />
                        <p className="text-sm text-slate-400">
                            {searchQuery ? "No transactions match your search." : "No transactions yet."}
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-100 text-xs text-slate-500 uppercase tracking-wider">
                                    <th className="text-left px-6 py-3 font-medium">Type</th>
                                    <th className="text-left px-6 py-3 font-medium">User</th>
                                    <th className="text-left px-6 py-3 font-medium">Amount</th>
                                    <th className="text-left px-6 py-3 font-medium">Fee</th>
                                    <th className="text-left px-6 py-3 font-medium">Ref</th>
                                    <th className="text-left px-6 py-3 font-medium">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filtered.map((tx) => (
                                    <tr key={tx.id} className="hover:bg-slate-50 transition">
                                        <td className="px-6 py-3">
                                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${
                                                tx.type === "CASH_IN"
                                                    ? "bg-green-50 text-green-700"
                                                    : "bg-amber-50 text-amber-700"
                                            }`}>
                                                {tx.type === "CASH_IN" ? (
                                                    <ArrowDownLeft size={11} />
                                                ) : (
                                                    <ArrowUpRight size={11} />
                                                )}
                                                {tx.type === "CASH_IN" ? "Cash-In" : "Cash-Out"}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3">
                                            <p className="font-medium text-slate-800">{tx.user?.name || "Unknown"}</p>
                                            <p className="text-xs text-slate-400">{tx.user?.email}</p>
                                        </td>
                                        <td className="px-6 py-3 font-semibold text-slate-800">
                                            <CurrencyAmount amount={tx.amount} />
                                        </td>
                                        <td className="px-6 py-3 text-green-600 font-medium">
                                            +<CurrencyAmount amount={tx.fee} />
                                        </td>
                                        <td className="px-6 py-3">
                                            <span className="font-mono text-xs bg-slate-100 rounded px-1.5 py-0.5">
                                                {tx.agentRef}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3 text-xs text-slate-500">
                                            {new Date(tx.confirmedAt || tx.createdAt).toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {pagination && pagination.total > LIMIT && (
                    <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100">
                        <p className="text-xs text-slate-400">
                            Showing {page * LIMIT + 1}–{Math.min((page + 1) * LIMIT, pagination.total)} of {pagination.total}
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPage((p) => Math.max(0, p - 1))}
                                disabled={page === 0}
                                className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 transition"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <span className="text-xs text-slate-500">Page {page + 1}</span>
                            <button
                                onClick={() => setPage((p) => p + 1)}
                                disabled={!pagination.hasMore}
                                className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 transition"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </section>
        </div>
    )
}

function SummaryCard({ icon, label, value, sub, bg }) {
    return (
        <div className={`${bg} rounded-2xl p-5`}>
            <div className="flex items-center gap-2 mb-2">
                {icon}
                <p className="text-xs text-slate-500">{label}</p>
            </div>
            <p className="text-2xl font-bold text-slate-800">{value}</p>
            {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
        </div>
    )
}
