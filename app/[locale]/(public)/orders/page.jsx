'use client'
import PageTitle from "@/components/PageTitle"
import { useEffect, useState } from "react"
import OrderItem from "@/components/OrderItem"
import { useAuth, useUser } from "@clerk/nextjs"
import axios from "axios"
import toast from "react-hot-toast"
import { useRouter } from "next/navigation"
import Loading from "@/components/Loading"
import { ShoppingBag, Package } from "lucide-react"
import Link from "next/link"

export default function Orders() {
    const { getToken } = useAuth()
    const { user, isLoaded } = useUser()
    const [orders, setOrders] = useState([])
    const [loading, setLoading] = useState(true)
    const router = useRouter()

    useEffect(() => {
       const fetchOrders = async () => {
        try {
            const token = await getToken()
            const { data } = await axios.get('/api/orders', { headers: { Authorization: `Bearer ${token}` } })
            setOrders(data.orders)
            setLoading(false)
        } catch (error) {
            toast.error(error?.response?.data?.error || error.message)
            setLoading(false)
        }
       }
       if (isLoaded) {
        if (user) {
            fetchOrders()
        } else {
            router.push('/')
        }
       }
    }, [isLoaded, user, getToken, router])

    if (!isLoaded || loading) return <Loading />

    if (orders.length === 0) {
        return (
            <div className="min-h-[80vh] flex items-center justify-center bg-gray-50 px-4">
                <div className="text-center">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-5">
                        <Package size={32} className="text-gray-300" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">No orders yet</h1>
                    <p className="text-sm text-gray-500 mt-2 mb-6">Start shopping to see your orders here.</p>
                    <Link
                        href="/shop"
                        className="inline-flex items-center gap-2 bg-[var(--color-primary)] text-white px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-200 hover:bg-[var(--color-primary-hover)] hover:shadow-lg hover:shadow-blue-500/20 hover:-translate-y-0.5 active:translate-y-0"
                    >
                        <ShoppingBag size={16} />
                        Start Shopping
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 py-6 px-4 sm:px-6">
            <div className="max-w-7xl mx-auto">
                <PageTitle heading="My Orders" text={`You have ${orders.length} order${orders.length === 1 ? '' : 's'}`} linkText="Continue Shopping" path="/shop" />
                <div className="space-y-4">
                    {orders.map((order) => (
                        <OrderItem order={order} key={order.id} />
                    ))}
                </div>
            </div>
        </div>
    )
}
