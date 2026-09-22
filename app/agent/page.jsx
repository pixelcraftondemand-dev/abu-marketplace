'use client'

import { useEffect, useRef, useState } from "react"
import axios from "axios"
import toast from "react-hot-toast"
import {
    Banknote,
    CheckCircle2,
    Clock,
    Copy,
    Loader2,
    QrCode,
    RefreshCw,
    TrendingUp,
} from "lucide-react"
import CurrencyAmount from "@/components/CurrencyAmount"

const POLL_INTERVAL_MS = 15_000 // 15 seconds

export default function AgentDashboard() {
    const [stats, setStats] = useState(null)
    const [pendingRequests, setPendingRequests] = useState([])
    const [loading, setLoading] = useState(true)
    const [processingId, setProcessingId] = useState(null)
    const [lastRefreshed, setLastRefreshed] = useState(null)
    const [isPolling, setIsPolling] = useState(true)
    const intervalRef = useRef(null)

    const fetchData = async (isPoll = false) => {
        if (!isPoll) setLoading(true)
        try {
            const { data } = await axios.get("/api/agent/requests?status=pending&limit=10")
            setPendingRequests(data.requests || [])
            setStats(data.stats || null)
            setLastRefreshed(new Date())
        } catch (err) {
            console.error("[AgentDashboard]", err)
        } finally {
            setLoading(false)
        }
    }

    // Initial fetch + polling
    useEffect(() => {
        fetchData()
        intervalRef.current = setInterval(() => fetchData(true), POLL_INTERVAL_MS)
        return () => clearInterval(intervalRef.current)
    }, [])

    const handleProcessRequest = async (requestId) => {
        setProcessingId(requestId)
        try {
            await axios.post("/api/agent/cash-in", {
                agentRef: pendingRequests.find((r) => r.id === requestId)?.agentRef,
            })
            toast.success("Cash-in processed! Wallet credited.")
            fetchData()
        } catch (err) {
            toast.error(err?.response?.data?.error || "Failed to process.")
        } finally {
            setProcessingId(null)
        }
    }

    const copyRef = (ref) => {
        navigator.clipboard.writeText(ref)
        toast.success("Copied!")
    }

    if (loading && !stats) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="animate-spin text-amber-500" size={32} />
            </div>
        )
    }

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Agent Dashboard</h1>
                    <p className="text-sm text-slate-500 mt-1">Process deposits and manage cash-in requests</p>
                </div>
                <div className="flex items-center gap-3">
                    {/* Live indicator */}
                    <div className="flex items-center gap-1.5 text-xs">
                        <span className={`w-2 h-2 rounded-full ${isPolling ? "bg-green-400 animate-pulse" : "bg-slate-300"}`} />
                        <span className="text-slate-400">
                            {lastRefreshed ? `Updated ${lastRefreshed.toLocaleTimeString()}` : "Loading..."}
                        </span>
                    </div>
                    <button
                        onClick={() => {
                            if (isPolling) {
                                clearInterval(intervalRef.current)
                                setIsPolling(false)
                            } else {
                                intervalRef.current = setInterval(() => fetchData(true), POLL_INTERVAL_MS)
                                setIsPolling(true)
                                fetchData(true)
                            }
                        }}
                        className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg transition ${
                            isPolling
                                ? "bg-green-50 text-green-600 hover:bg-green-100"
                                : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                        }`}
                    >
                        <span className={`w-1.5 h-1.5 rounded-full ${isPolling ? "bg-green-500" : "bg-slate-400"}`} />
                        {isPolling ? "Live" : "Paused"}
                    </button>
                    <button
                        onClick={() => fetchData(false)}
                        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition"
                    >
                        <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                    </button>
                </div>
            </div>

            {/* Stats cards */}
            {stats && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard
                        icon={<Clock size={20} className="text-amber-500" />}
                        label="Pending Requests"
                        value={stats.pending}
                        bg="bg-amber-50"
                    />
                    <StatCard
                        icon={<Banknote size={20} className="text-blue-500" />}
                        label="In Progress"
                        value={stats.processing}
                        bg="bg-blue-50"
                    />
                    <StatCard
                        icon={<CheckCircle2 size={20} className="text-green-500" />}
                        label="Completed Today"
                        value={stats.completedToday}
                        bg="bg-green-50"
                    />
                    <StatCard
                        icon={<TrendingUp size={20} className="text-purple-500" />}
                        label="Earned Today"
                        value={`$${stats.earnedToday.toFixed(2)}`}
                        bg="bg-purple-50"
                    />
                </div>
            )}

            {/* Pending Requests */}
            <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-slate-800">Pending Deposits</h2>
                    <span className="text-xs text-slate-400">{pendingRequests.length} requests</span>
                </div>

                {pendingRequests.length === 0 ? (
                    <div className="py-16 text-center">
                        <Clock size={40} className="mx-auto text-slate-200 mb-3" />
                        <p className="text-sm text-slate-400">No pending requests right now.</p>
                        <p className="text-xs text-slate-300 mt-1">New requests will appear here when users create them.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-50">
                        {pendingRequests.map((req) => (
                            <div
                                key={req.id}
                                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-4 hover:bg-slate-50 transition"
                            >
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-1">
                                        <span className="text-sm font-semibold text-slate-800">
                                            {req.user?.name || "Unknown"}
                                        </span>
                                        <span className="text-xs text-slate-400">{req.user?.email}</span>
                                    </div>
                                    <div className="flex items-center gap-4 text-xs text-slate-500">
                                        <span>Amount: <span className="font-semibold text-slate-700"><CurrencyAmount amount={req.amount} /></span></span>
                                        <span>{new Date(req.createdAt).toLocaleString()}</span>
                                    </div>
                                    {req.notes && (
                                        <p className="text-xs text-slate-400 mt-1 italic">"{req.notes}"</p>
                                    )}
                                </div>

                                <div className="flex items-center gap-3 shrink-0">
                                    {/* Agent ref code */}
                                    <button
                                        onClick={() => copyRef(req.agentRef)}
                                        className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg px-3 py-1.5 text-xs font-mono font-semibold text-slate-700 transition"
                                        title="Copy reference code"
                                    >
                                        <QrCode size={13} />
                                        {req.agentRef}
                                        <Copy size={11} className="text-slate-400" />
                                    </button>

                                    {/* Process button */}
                                    <button
                                        onClick={() => handleProcessRequest(req.id)}
                                        disabled={processingId === req.id}
                                        className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg px-4 py-2 text-xs font-semibold transition disabled:opacity-50"
                                    >
                                        {processingId === req.id ? (
                                            <Loader2 size={13} className="animate-spin" />
                                        ) : (
                                            <CheckCircle2 size={13} />
                                        )}
                                        Process
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    )
}

function StatCard({ icon, label, value, bg }) {
    return (
        <div className={`${bg} rounded-2xl p-5 flex items-start gap-3`}>
            <div className="mt-0.5">{icon}</div>
            <div>
                <p className="text-2xl font-bold text-slate-800">{value}</p>
                <p className="text-xs text-slate-500 mt-0.5">{label}</p>
            </div>
        </div>
    )
}
