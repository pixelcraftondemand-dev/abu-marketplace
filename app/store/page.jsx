'use client'
import Loading from "@/components/Loading"
import { useAuth } from "@clerk/nextjs"
import axios from "axios"
import {
    CircleDollarSignIcon,
    ShoppingBasketIcon,
    StarIcon,
    TagsIcon,
    TrendingUpIcon,
    PackageIcon
} from "lucide-react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import toast from "react-hot-toast"

export default function Dashboard() {
    const { getToken } = useAuth()
    const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || 'SLe'
    const router = useRouter()

    const [loading, setLoading] = useState(true)
    const [dashboardData, setDashboardData] = useState({
        totalProducts: 0,
        totalEarnings: 0,
        totalOrders: 0,
        ratings: [],
    })

    const fetchDashboardData = async () => {
        try {
            const token = await getToken()
            const { data } = await axios.get('/api/store/dashboard', {
                headers: { Authorization: `Bearer ${token}` }
            })
            setDashboardData(data.dashboardData)
        } catch (error) {
            toast.error(error?.response?.data?.error || error.message)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchDashboardData()
    }, [])

    if (loading) return <Loading />

    const cards = [
        {
            title: 'Total Products',
            value: dashboardData.totalProducts,
            icon: ShoppingBasketIcon,
            color: 'bg-blue-50 text-blue-600',
            iconBg: 'bg-blue-100',
        },
        {
            title: 'Total Earnings',
            value: `${currency}${dashboardData.totalEarnings.toLocaleString()}`,
            icon: CircleDollarSignIcon,
            color: 'bg-green-50 text-green-700',
            iconBg: 'bg-green-100',
        },
        {
            title: 'Total Orders',
            value: dashboardData.totalOrders,
            icon: TagsIcon,
            color: 'bg-orange-50 text-orange-600',
            iconBg: 'bg-orange-100',
        },
        {
            title: 'Total Reviews',
            value: dashboardData.ratings.length,
            icon: StarIcon,
            color: 'bg-purple-50 text-purple-600',
            iconBg: 'bg-purple-100',
        },
    ]

    return (
        <div className="text-slate-600 mb-28 space-y-8">

            <div>
                <h1 className="text-2xl font-semibold text-slate-800">
                    Seller <span className="text-green-600">Dashboard</span>
                </h1>
                <p className="text-sm text-slate-400 mt-1">Overview of your store performance</p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {cards.map((card, index) => (
                    <div key={index} className={`rounded-xl p-4 border border-slate-100 shadow-sm ${card.color}`}>
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-xs font-medium opacity-70">{card.title}</p>
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${card.iconBg}`}>
                                <card.icon size={16} />
                            </div>
                        </div>
                        <p className="text-2xl font-bold">{card.value}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
                <button
                    onClick={() => router.push('/store/add-product')}
                    className="flex items-center gap-3 p-4 bg-green-600 text-white rounded-xl hover:bg-green-700 transition shadow-sm"
                >
                    <PackageIcon size={20} />
                    <span className="font-medium text-sm">Add New Product</span>
                </button>
                <button
                    onClick={() => router.push('/store/orders')}
                    className="flex items-center gap-3 p-4 bg-slate-800 text-white rounded-xl hover:bg-slate-900 transition shadow-sm"
                >
                    <TrendingUpIcon size={20} />
                    <span className="font-medium text-sm">View Orders</span>
                </button>
            </div>

            {dashboardData.ratings.length > 0 ? (
                <div>
                    <h2 className="text-lg font-semibold text-slate-800 mb-4">Recent Reviews</h2>
                    <div className="space-y-4 max-w-3xl">
                        {dashboardData.ratings.map((review, index) => (
                            <div key={index} className="flex max-sm:flex-col gap-5 sm:items-center justify-between py-5 px-5 border border-slate-100 rounded-xl shadow-sm bg-white text-sm hover:shadow-md transition">
                                <div>
                                    <div className="flex gap-3 items-center">
                                        {review.user?.image && (
                                            <Image src={review.user.image} alt="" className="w-10 h-10 rounded-full object-cover ring-2 ring-slate-100" width={40} height={40} />
                                        )}
                                        <div>
                                            <p className="font-semibold text-slate-800">{review.user?.name}</p>
                                            <p className="text-slate-400 text-xs">{new Date(review.createdAt).toDateString()}</p>
                                        </div>
                                    </div>
                                    <p className="mt-3 text-slate-500 max-w-xs leading-6">{review.review}</p>
                                </div>
                                <div className="flex flex-col sm:items-end gap-3">
                                    <div>
                                        <p className="text-slate-400 text-xs">{review.product?.category}</p>
                                        <p className="font-medium text-slate-700">{review.product?.name}</p>
                                        <div className="flex items-center gap-0.5 mt-1">
                                            {Array(5).fill('').map((_, i) => (
                                                <StarIcon key={i} size={14} className="text-transparent" fill={review.rating >= i + 1 ? "#16a34a" : "#e2e8f0"} />
                                            ))}
                                        </div>
                                    </div>
                                    <button onClick={() => router.push(`/product/${review.product?.id}`)} className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-1.5 rounded-lg transition">
                                        View Product
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl max-w-md">
                    <StarIcon size={32} className="mb-3 text-slate-300" />
                    <p className="font-medium">No reviews yet</p>
                    <p className="text-sm mt-1">Reviews will appear here once customers rate your products</p>
                </div>
            )}
        </div>
    )
}