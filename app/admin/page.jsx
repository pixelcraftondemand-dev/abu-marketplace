'use client'
import Loading from "@/components/Loading"
import OrdersAreaChart from "@/components/OrdersAreaChart"
import { useUser } from "@clerk/nextjs"
import axios from "axios"
import { ArrowUpRight, CircleDollarSignIcon, Clock3, ShoppingBasketIcon, StoreIcon, TagsIcon, TrendingUp } from "lucide-react"
import { useEffect, useState } from "react"
import toast from "react-hot-toast"
import CurrencyAmount from '@/components/CurrencyAmount'

export default function AdminDashboard() {
    const { user } = useUser()

    const [loading, setLoading] = useState(true)
    const [dashboardData, setDashboardData] = useState({
        products: 0,
        revenue: 0,
        orders: 0,
        stores: 0,
        pendingStores: 0,
        approvedStores: 0,
        activeStores: 0,
        averageOrderValue: 0,
        allOrders: [],
        recentOrders: [],
    })

    const fetchDashboardData = async () => {
        try {
            const { data } = await axios.get('/api/admin/dashboard')
            setDashboardData(data.dashboardData)
        } catch (error) {
            toast.error(error?.response?.data?.error || error.message)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (user) fetchDashboardData()
    }, [user])

    const summaryCards = [
        { title: 'Total products', value: dashboardData.products.toLocaleString(), icon: ShoppingBasketIcon, accent: 'from-[#F4DFA7] to-[#C9A96E]' },
        { title: 'Revenue', value: dashboardData.revenue, icon: CircleDollarSignIcon, accent: 'from-[#D7F7E3] to-[#56C27A]' },
        { title: 'Orders', value: dashboardData.orders.toLocaleString(), icon: TagsIcon, accent: 'from-[#D9E7FF] to-[#5D83F8]' },
        { title: 'Stores', value: dashboardData.stores.toLocaleString(), icon: StoreIcon, accent: 'from-[#F5DDE7] to-[#C275A8]' },
    ]

    if (loading) return <Loading />

    return (
        <div className="space-y-8 pb-20 text-slate-700">
            <div className="rounded-[2rem] border border-slate-200 bg-gradient-to-br from-[#1A1A1A] via-[#232323] to-[#2D2D2D] p-8 text-white shadow-[0_25px_80px_rgba(0,0,0,0.14)]">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#C9A96E]">Admin command center</p>
                        <h1 className="mt-3 text-3xl font-semibold">Marketplace performance at a glance</h1>
                        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
                            Track store activity, revenue momentum, and approvals in one clean view so you can make faster decisions.
                        </p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm backdrop-blur">
                        <p className="text-slate-300">Pending review</p>
                        <p className="mt-1 text-2xl font-semibold text-white">{dashboardData.pendingStores}</p>
                    </div>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {summaryCards.map((card, index) => (
                    <div key={index} className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
                        <div className={`inline-flex rounded-2xl bg-gradient-to-br ${card.accent} p-3 text-slate-800`}>
                            <card.icon size={18} />
                        </div>
                        <p className="mt-4 text-sm text-slate-500">{card.title}</p>
                        <p className="mt-2 text-2xl font-semibold text-slate-900">{card.title === 'Revenue' ? <CurrencyAmount amount={card.value} /> : card.value}</p>
                    </div>
                ))}
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
                <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#A2825F]">Revenue trend</p>
                            <h2 className="mt-2 text-xl font-semibold text-slate-900">Orders and revenue over time</h2>
                        </div>
                        <div className="rounded-full bg-[#F8EEDC] px-3 py-1 text-sm font-medium text-[#7B6446]">
                            <CurrencyAmount amount={dashboardData.averageOrderValue} /> avg. order
                        </div>
                    </div>
                    <div className="mt-6">
                        <OrdersAreaChart allOrders={dashboardData.allOrders} />
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="rounded-[2rem] border border-slate-200 bg-[#FCF7EE] p-6 shadow-sm">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-slate-900">Store health</h3>
                            <TrendingUp size={18} className="text-[#7B6446]" />
                        </div>
                        <div className="mt-5 space-y-3 text-sm">
                            <div className="flex items-center justify-between rounded-2xl bg-white/70 px-4 py-3">
                                <span className="text-slate-600">Pending applications</span>
                                <span className="font-semibold text-slate-900">{dashboardData.pendingStores}</span>
                            </div>
                            <div className="flex items-center justify-between rounded-2xl bg-white/70 px-4 py-3">
                                <span className="text-slate-600">Approved stores</span>
                                <span className="font-semibold text-slate-900">{dashboardData.approvedStores}</span>
                            </div>
                            <div className="flex items-center justify-between rounded-2xl bg-white/70 px-4 py-3">
                                <span className="text-slate-600">Active stores</span>
                                <span className="font-semibold text-slate-900">{dashboardData.activeStores}</span>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-slate-900">Recent orders</h3>
                            <Clock3 size={18} className="text-slate-400" />
                        </div>
                        <div className="mt-5 space-y-3">
                            {dashboardData.recentOrders.length > 0 ? dashboardData.recentOrders.map((order) => (
                                <div key={order.id} className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3">
                                    <div>
                                        <p className="text-sm font-semibold text-slate-900">{order.store?.name || 'Store'}</p>
                                        <p className="text-xs text-slate-500">{new Date(order.createdAt).toLocaleDateString()}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-semibold text-slate-900"><CurrencyAmount amount={Number(order.total)} /></p>
                                        <p className="text-xs text-slate-500">{order.status}</p>
                                    </div>
                                </div>
                            )) : (
                                <p className="rounded-2xl bg-slate-50 px-4 py-6 text-sm text-slate-500">No recent orders yet.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}