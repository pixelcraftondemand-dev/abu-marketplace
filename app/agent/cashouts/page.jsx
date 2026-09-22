'use client'

import { useEffect, useRef, useState } from "react"
import axios from "axios"
import toast from "react-hot-toast"
import {
    Banknote,
    CheckCircle2,
    Clock,
    Filter,
    Loader2,
    QrCode,
    RefreshCw,
    Search,
    XCircle,
} from "lucide-react"
import CurrencyAmount from "@/components/CurrencyAmount"

const STATUS_FILTERS = [
    { value: "pending", label: "Pending", icon: Clock, color: "text-amber-500" },
    { value: "completed", label: "Completed", icon: CheckCircle2, color: "text-green-500" },
    { value: "expired", label: "Expired", icon: XCircle, color: "text-red-400" },
]

const POLL_MS = 15_000

export default function AgentCashOutsPage() {
    const [requests, setRequests] = useState([])
    const [stats, setStats] = useState(null)
    const [loading, setLoading] = useState(true)
    const [statusFilter, setStatusFilter] = useState("pending")
    const [searchRef, setSearchRef] = useState("")
    const [processingId, setProcessingId] = useState(null)
    const [lastRefreshed, setLastRefreshed] = useState(null)
    const intervalRef = useRef(null)

    const fetchRequests = async (isPoll = false) => {
        if (!isPoll) setLoading(true)
        try {
            const { data } = await axios.get(`/api/agent/withdrawals?status=${statusFilter}&limit=50`)
            setRequests(data.requests || [])
            setStats(data.stats || null)
            setLastRefreshed(new Date())
        } catch (err) {
            console.error("[AgentCashOuts]", err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchRequests()
        intervalRef.current = setInterval(() => fetchRequests(true), POLL_MS)
        return () => clearInterval(intervalRef.current)
    }, [statusFilter])

    const handleProcess = async (req) => {
        setProcessingId(req.id)
        try {
            await axios.post("/api/agent/cash-out", { agentRef: req.agentRef })
            toast.success(`Disbursed $${req.amount.toFixed(2)} cash to ${req.user?.name || "user"}.`)
            fetchRequests()
        } catch (err) {
            toast.error(err?.response?.data?.error || "Failed to process.")
        } finally {
            setProcessingId(null)
        }
    }

    const filtered = requests.filter((r) => {
        if (!searchRef) return true
        const q = searchRef.toLowerCase()
        return (
            r.agentRef?.toLowerCase().includes(q) ||
            r.user?.name?.toLowerCase().includes(q) ||
            r.user?.email?.toLowerCase().includes(q)
        )
    })

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-800">Cash-Out Requests</h1>
                <p className="text-sm text-slate-500 mt-1">Process user withdrawal requests and disburse cash</p>
            </div>

            {/* Stats row */}
            {stats && (
                <div className="grid grid-cols-3 gap-4">
                    <div className="bg-amber-50 rounded-xl p-4">
                        <p className="text-2xl font-bold text-slate-800">{stats.pending}</p>
                        <p className="text-xs text-slate-500">Pending</p>
                    </div>
                    <div className="bg-green-50 rounded-xl p-4">
                        <p className="text-2xl font-bold text-slate-800">{stats.completedToday}</p>
                        <p className="text-xs text-slate-500">Completed Today</p>
                    </div>
                    <div className="bg-blue-50 rounded-xl p-4">
                        <p className="text-2xl font-bold text-slate-800">${(stats.disbursedToday || 0).toFixed(2)}</p>
                        <p className="text-xs text-slate-500">Disbursed Today</p>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
                    {STATUS_FILTERS.map((f) => {
                        const Icon = f.icon
                        return (
                            <button
                                key={f.value}
                                onClick={() => setStatusFilter(f.value)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                                    statusFilter === f.value
                                        ? "bg-white text-slate-800 shadow-sm"
                                        : "text-slate-500 hover:text-slate-700"
                                }`}
                            >
                                <Icon size={13} className={f.color} />
                                {f.label}
                            </button>
                        )
                    })}
                </div>

                <div className="relative flex-1 max-w-xs">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        value={searchRef}
                        onChange={(e) => setSearchRef(e.target.value)}
                        placeholder="Search by code, name, or email..."
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-100"
                    />
                </div>

                <div className="flex items-center gap-2">
                    {lastRefreshed && (
                        <span className="text-xs text-slate-400">
                            {lastRefreshed.toLocaleTimeString()}
                        </span>
                    )}
                    <button
                        onClick={() => fetchRequests(false)}
                        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition"
                    >
                        <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                    </button>
                </div>
            </div>

            {/* Requests table */}
            <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="py-16 text-center">
                        <Loader2 className="animate-spin text-amber-500 mx-auto" size={28} />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="py-16 text-center">
                        <Banknote size={36} className="mx-auto text-slate-200 mb-3" />
                        <p className="text-sm text-slate-400">
                            {searchRef ? "No requests match your search." : `No ${statusFilter} withdrawal requests.`}
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-100 text-xs text-slate-500 uppercase tracking-wider">
                                    <th className="text-left px-6 py-3 font-medium">User</th>
                                    <th className="text-left px-6 py-3 font-medium">Amount</th>
                                    <th className="text-left px-6 py-3 font-medium">Agent Ref</th>
                                    <th className="text-left px-6 py-3 font-medium">Status</th>
                                    <th className="text-left px-6 py-3 font-medium">Time</th>
                                    <th className="text-right px-6 py-3 font-medium">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filtered.map((req) => (
                                    <tr key={req.id} className="hover:bg-slate-50 transition">
                                        <td className="px-6 py-3">
                                            <p className="font-medium text-slate-800">{req.user?.name || "Unknown"}</p>
                                            <p className="text-xs text-slate-400">{req.user?.email}</p>
                                        </td>
                                        <td className="px-6 py-3 font-semibold text-slate-800">
                                            <CurrencyAmount amount={req.amount} />
                                        </td>
                                        <td className="px-6 py-3">
                                            <span className="inline-flex items-center gap-1 bg-slate-100 rounded-md px-2 py-1 font-mono text-xs font-semibold text-slate-700">
                                                <QrCode size={11} />
                                                {req.agentRef}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3">
                                            <StatusBadge status={req.status} />
                                        </td>
                                        <td className="px-6 py-3 text-xs text-slate-500">
                                            {new Date(req.createdAt).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-3 text-right">
                                            {req.status === "pending" && (
                                                <button
                                                    onClick={() => handleProcess(req)}
                                                    disabled={processingId === req.id}
                                                    className="inline-flex items-center gap-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50"
                                                >
                                                    {processingId === req.id ? (
                                                        <Loader2 size={12} className="animate-spin" />
                                                    ) : (
                                                        <Banknote size={12} />
                                                    )}
                                                    Disburse Cash
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </div>
    )
}

function StatusBadge({ status }) {
    const styles = {
        pending: "bg-amber-50 text-amber-700 border-amber-200",
        matched: "bg-blue-50 text-blue-700 border-blue-200",
        processing: "bg-blue-50 text-blue-700 border-blue-200",
        completed: "bg-green-50 text-green-700 border-green-200",
        expired: "bg-red-50 text-red-600 border-red-200",
        cancelled: "bg-slate-50 text-slate-500 border-slate-200",
    }

    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${styles[status] || styles.pending}`}>
            {status}
        </span>
    )
}
