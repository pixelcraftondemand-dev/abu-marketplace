'use client'
import { useEffect, useState } from "react"
import { useAuth } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import axios from "axios"
import toast from "react-hot-toast"
import Image from "next/image"
import Loading from "@/components/Loading"
import {
    ShoppingBasketIcon,
    CircleDollarSignIcon,
    TagsIcon,
    StarIcon,
    PackagePlusIcon,
    ClipboardListIcon
} from "lucide-react"

export default function StoreDashboard() {
    const { getToken } = useAuth()
    const router = useRouter()
    const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || 'SLe'

    const [loading, setLoading] = useState(true)
    const [data, setData] = useState({
        totalProducts: 0,
        totalEarnings: 0,
        totalOrders: 0,
        ratings: []
    })

    useEffect(() => {
        const fetch = async () => {
            try {
                const token = await getToken()
                const res = await axios.get('/api/store/dashboard', {
                    headers: { Authorization: `Bearer ${token}` }
                })
                setData(res.data.dashboardData)
            } catch (err) {
                toast.error(err?.response?.data?.error || err.message)
            } finally {
                setLoading(false)
            }
        }
        fetch()
    }, [])

    if (loading) return <Loading />

    const cards = [
        { label: 'Total Products', value: data.totalProducts,                                  icon: ShoppingBasketIcon,   bg: 'bg-blue-50',   text: 'text-blue-600',   ring: 'bg-blue-100'   },
        { label: 'Total Earnings', value: `${currency}${data.totalEarnings.toLocaleString()}`, icon: CircleDollarSignIcon, bg: 'bg-green-50',  text: 'text-green-700',  ring: 'bg-green-100'  },
        { label: 'Total Orders',   value: data.totalOrders,                                    icon: TagsIcon,             bg: 'bg-orange-50', text: 'text-orange-600', ring: 'bg-orange-100' },
        { label: 'Total Reviews',  value: data.ratings.length,                                 icon: StarIcon,             bg: 'bg-purple-50', text: 'text-purple-600', ring: 'bg-purple-100' },
    ]

    return (
        <div className="space-y-8 pb-20">

            <div>
                <h1 className="text-2xl font-bold text-slate-800">Seller <span className="text-green-600">Dashboard</span></h1>
                <p className="text-sm text-slate-400 mt-1">Your store at a glance</p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {cards.map(({ label, value, icon: Icon, bg, text, ring }) => (
                    <div key={label} className={`rounded-2xl p-4 border border-slate-100 shadow-sm ${bg} ${text}`}>
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-xs font-medium opacity-70">{label}</p>
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${ring}`}>
                                <Icon size={15} />
                            </div>
                        </div>
                        <p className="text-2xl font-bold">{value}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
                <button
                    onClick={() => router.push('/store/add-product')}
                    className="flex items-center gap-3 p-4 bg-green-600 hover:bg-green-700 text-white rounded-2xl transition shadow-sm font-medium text-sm"
                >
                    <PackagePlusIcon size={20} />
                    Add New Product
                </button>
                <button
                    onClick={() => router.push('/store/orders')}
                    className="flex items-center gap-3 p-4 bg-slate-800 hover:bg-slate-900 text-white rounded-2xl transition shadow-sm font-medium text-sm"
                >
                    <ClipboardListIcon size={20} />
                    View Orders
                </button>
            </div>

            <div>
                <h2 className="text-lg font-semibold text-slate-800 mb-4">Recent Reviews</h2>
                {data.ratings.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-14 border border-dashed border-slate-200 rounded-2xl text-slate-400 text-center max-w-md">
                        <StarIcon size={30} className="mb-3 text-slate-300" />
                        <p className="font-medium">No reviews yet</p>
                        <p className="text-sm mt-1">Reviews appear once customers rate your products</p>
                    </div>
                ) : (
                    <div className="space-y-3 max-w-3xl">
                        {data.ratings.map((review, i) => (
                            <div key={i} className="flex max-sm:flex-col gap-4 sm:items-center justify-between p-5 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        {review.user?.image && (
                                            <Image src={review.user.image} alt="" width={36} height={36} className="w-9 h-9 rounded-full object-cover ring-2 ring-slate-100" />
                                        )}
                                        <div>
                                            <p className="font-semibold text-sm text-slate-800">{review.user?.name}</p>
                                            <p className="text-xs text-slate-400">{new Date(review.createdAt).toDateString()}</p>
                                        </div>
                                    </div>
                                    <p className="text-sm text-slate-500 leading-relaxed max-w-xs">{review.review}</p>
                                </div>
                                <div className="sm:text-right space-y-2 shrink-0">
                                    <p className="text-xs text-slate-400">{review.product?.category}</p>
                                    <p className="text-sm font-medium text-slate-700">{review.product?.name}</p>
                                    <div className="flex sm:justify-end gap-0.5">
                                        {Array(5).fill('').map((_, idx) => (
                                            <StarIcon key={idx} size={13} className="text-transparent" fill={review.rating >= idx + 1 ? '#16a34a' : '#e2e8f0'} />
                                        ))}
                                    </div>
                                    <button
                                        onClick={() => router.push(`/product/${review.product?.id}`)}
                                        className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg transition"
                                    >
                                        View Product
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}