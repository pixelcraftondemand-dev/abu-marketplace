'use client'

import { useEffect, useState } from "react"
import axios from "axios"
import {
    Activity,
    ArrowDownLeft,
    ArrowUpRight,
    Banknote,
    Clock,
    Globe,
    Loader2,
    Phone,
    RefreshCw,
    Send,
    Users,
    Wifi,
} from "lucide-react"

const PERIODS = [
    { value: 7, label: "7 days" },
    { value: 14, label: "14 days" },
    { value: 30, label: "30 days" },
]

export default function AdminUssdPage() {
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [period, setPeriod] = useState(7)

    const fetchData = async () => {
        setLoading(true)
        try {
            const { data: res } = await axios.get(`/api/admin/ussd?days=${period}`)
            setData(res)
        } catch (err) {
            console.error("[AdminUssd]", err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [period])

    if (loading && !data) {
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
                    <h1 className="text-2xl font-bold text-slate-800">USSD Payment System</h1>
                    <p className="text-sm text-slate-500 mt-1">Monitor USSD sessions, transactions, and usage across Sierra Leone</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
                        {PERIODS.map((p) => (
                            <button
                                key={p.value}
                                onClick={() => setPeriod(p.value)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                                    period === p.value
                                        ? "bg-white text-slate-800 shadow-sm"
                                        : "text-slate-500 hover:text-slate-700"
                                }`}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={fetchData}
                        className="p-2 text-slate-500 hover:text-slate-700 transition"
                    >
                        <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                    </button>
                </div>
            </div>

            {data && (
                <>
                    {/* Overview cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatCard
                            icon={<Phone size={20} className="text-blue-500" />}
                            label="USSD Users"
                            value={data.overview.ussdUsers}
                            sub="registered phone numbers"
                            bg="bg-blue-50"
                        />
                        <StatCard
                            icon={<Wallet size={20} className="text-green-500" />}
                            label="Active Wallets"
                            value={data.overview.activeWallets}
                            sub="with balance"
                            bg="bg-green-50"
                        />
                        <StatCard
                            icon={<Users size={20} className="text-amber-500" />}
                            label="Active Agents"
                            value={data.overview.activeAgents}
                            sub="cash-in/out locations"
                            bg="bg-amber-50"
                        />
                        <StatCard
                            icon={<Activity size={20} className="text-purple-500" />}
                            label="Transactions"
                            value={data.overview.recentTransactions}
                            sub={`last ${period} days`}
                            bg="bg-purple-50"
                        />
                    </div>

                    {/* Transaction summary */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                            <div className="flex items-center gap-2 mb-4">
                                <ArrowDownLeft size={18} className="text-green-500" />
                                <h3 className="text-sm font-semibold text-slate-700">Deposits (Cash-In)</h3>
                            </div>
                            <p className="text-3xl font-bold text-slate-800">${(data.topups.totalAmount || 0).toFixed(2)}</p>
                            <p className="text-xs text-slate-400 mt-1">{data.topups.count || 0} transactions</p>
                        </div>
                        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                            <div className="flex items-center gap-2 mb-4">
                                <ArrowUpRight size={18} className="text-red-500" />
                                <h3 className="text-sm font-semibold text-slate-700">Withdrawals (Cash-Out)</h3>
                            </div>
                            <p className="text-3xl font-bold text-slate-800">${(data.withdrawals.totalAmount || 0).toFixed(2)}</p>
                            <p className="text-xs text-slate-400 mt-1">{data.withdrawals.count || 0} transactions</p>
                        </div>
                        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                            <div className="flex items-center gap-2 mb-4">
                                <Send size={18} className="text-blue-500" />
                                <h3 className="text-sm font-semibold text-slate-700">P2P Transfers</h3>
                            </div>
                            <p className="text-3xl font-bold text-slate-800">${(data.p2p.totalAmount || 0).toFixed(2)}</p>
                            <p className="text-xs text-slate-400 mt-1">{data.p2p.count || 0} transfers · ${(data.p2p.totalFees || 0).toFixed(2)} fees</p>
                        </div>
                    </div>

                    {/* Daily volume chart (text-based bar chart) */}
                    <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                        <h2 className="text-lg font-semibold text-slate-800 mb-4">Daily Transaction Volume</h2>
                        <div className="space-y-2">
                            {data.dailyVolume.map((day) => {
                                const total = day.deposits + day.withdrawals + day.p2pSends
                                const maxVal = Math.max(...data.dailyVolume.map((d) => d.deposits + d.withdrawals + d.p2pSends), 1)
                                const width = Math.max((total / maxVal) * 100, 0)
                                return (
                                    <div key={day.date} className="flex items-center gap-3">
                                        <span className="text-xs text-slate-400 w-16 shrink-0">{day.date}</span>
                                        <div className="flex-1 h-6 bg-slate-50 rounded-lg overflow-hidden flex">
                                            {day.deposits > 0 && (
                                                <div
                                                    className="bg-green-400 h-full"
                                                    style={{ width: `${(day.deposits / maxVal) * 100}%` }}
                                                    title={`Deposits: $${day.deposits}`}
                                                />
                                            )}
                                            {day.withdrawals > 0 && (
                                                <div
                                                    className="bg-red-400 h-full"
                                                    style={{ width: `${(day.withdrawals / maxVal) * 100}%` }}
                                                    title={`Withdrawals: $${day.withdrawals}`}
                                                />
                                            )}
                                            {day.p2pSends > 0 && (
                                                <div
                                                    className="bg-blue-400 h-full"
                                                    style={{ width: `${(day.p2pSends / maxVal) * 100}%` }}
                                                    title={`P2P: $${day.p2pSends}`}
                                                />
                                            )}
                                        </div>
                                        <span className="text-xs text-slate-500 w-20 text-right shrink-0">
                                            ${total.toFixed(0)} ({day.count})
                                        </span>
                                    </div>
                                )
                            })}
                        </div>
                        <div className="flex items-center gap-4 mt-4 text-xs text-slate-400">
                            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-400" /> Deposits</span>
                            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-400" /> Withdrawals</span>
                            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-400" /> P2P Sends</span>
                        </div>
                    </section>

                    {/* Transaction type breakdown */}
                    <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                        <h2 className="text-lg font-semibold text-slate-800 mb-4">Transaction Types</h2>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                            {Object.entries(data.typeBreakdown)
                                .sort((a, b) => b[1] - a[1])
                                .map(([type, count]) => (
                                    <div key={type} className="bg-slate-50 rounded-xl p-4">
                                        <p className="text-lg font-bold text-slate-800">{count}</p>
                                        <p className="text-xs text-slate-500">{type.replace(/_/g, " ")}</p>
                                    </div>
                                ))}
                        </div>
                    </section>

                    {/* Recent activity */}
                    <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100">
                            <h2 className="text-lg font-semibold text-slate-800">Recent Activity</h2>
                        </div>
                        <div className="divide-y divide-slate-50">
                            {data.recentActivity.length === 0 ? (
                                <div className="py-12 text-center text-sm text-slate-400">
                                    No recent activity.
                                </div>
                            ) : (
                                data.recentActivity.map((tx) => (
                                    <div key={tx.id} className="flex items-center justify-between px-6 py-3 hover:bg-slate-50 transition">
                                        <div className="flex items-center gap-3">
                                            <span className={`flex size-8 items-center justify-center rounded-full ${
                                                tx.amount > 0 ? "bg-green-50 text-green-600" : "bg-red-50 text-red-500"
                                            }`}>
                                                {tx.amount > 0 ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}
                                            </span>
                                            <div>
                                                <p className="text-sm font-medium text-slate-700">{tx.type.replace(/_/g, " ")}</p>
                                                <p className="text-xs text-slate-400">{tx.description || "—"}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className={`text-sm font-semibold ${tx.amount > 0 ? "text-green-600" : "text-slate-800"}`}>
                                                {tx.amount > 0 ? "+" : ""}${Math.abs(tx.amount).toFixed(2)}
                                            </p>
                                            <p className="text-xs text-slate-400">{new Date(tx.createdAt).toLocaleString()}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </section>
                </>
            )}
        </div>
    )
}

function StatCard({ icon, label, value, sub, bg }) {
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

function Wallet({ size, className }) {
    return <Banknote size={size} className={className} />
}
