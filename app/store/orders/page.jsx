'use client'
import { useEffect, useState } from "react"
import { useAuth } from "@clerk/nextjs"
import axios from "axios"
import toast from "react-hot-toast"
import Image from "next/image"
import Loading from "@/components/Loading"
import { XIcon, ClipboardListIcon } from "lucide-react"

const STATUS_OPTIONS = ['ORDER_PLACED', 'PROCESSING', 'SHIPPED', 'DELIVERED']

const STATUS_STYLES = {
    ORDER_PLACED: 'bg-blue-50 text-blue-700',
    PROCESSING:   'bg-amber-50 text-amber-700',
    SHIPPED:      'bg-purple-50 text-purple-700',
    DELIVERED:    'bg-green-50 text-green-700',
}

export default function StoreOrders() {
    const { getToken } = useAuth()
    const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || 'SLe'

    const [orders, setOrders] = useState([])
    const [loading, setLoading] = useState(true)
    const [selected, setSelected] = useState(null)
    const [updating, setUpdating] = useState(null)

    useEffect(() => {
        const load = async () => {
            try {
                const token = await getToken()
                const { data } = await axios.get('/api/store/orders', {
                    headers: { Authorization: `Bearer ${token}` }
                })
                setOrders(data.orders)
            } catch (err) {
                toast.error(err?.response?.data?.error || err.message)
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [])

    const updateStatus = async (orderId, status) => {
        setUpdating(orderId)
        try {
            const token = await getToken()
            await axios.post('/api/store/orders', { orderId, status }, {
                headers: { Authorization: `Bearer ${token}` }
            })
            setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o))
            if (selected?.id === orderId) setSelected(s => ({ ...s, status }))
            toast.success('Status updated')
        } catch (err) {
            toast.error(err?.response?.data?.error || err.message)
        } finally {
            setUpdating(null)
        }
    }

    if (loading) return <Loading />

    return (
        <div className="pb-20">

            <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-800">Store <span className="text-green-600">Orders</span></h1>
                <p className="text-sm text-slate-400 mt-1">{orders.length} order{orders.length !== 1 ? 's' : ''} received</p>
            </div>

            {orders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 border border-dashed border-slate-200 rounded-2xl text-slate-400 text-center">
                    <ClipboardListIcon size={30} className="mb-3 text-slate-300" />
                    <p className="font-medium">No orders yet</p>
                    <p className="text-sm mt-1">Orders will appear here once customers place them</p>
                </div>
            ) : (
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 border-b border-slate-100 text-xs text-slate-500 uppercase tracking-wider">
                                <tr>
                                    <th className="px-5 py-3">#</th>
                                    <th className="px-5 py-3">Customer</th>
                                    <th className="px-5 py-3">Total</th>
                                    <th className="px-5 py-3 hidden md:table-cell">Payment</th>
                                    <th className="px-5 py-3 hidden md:table-cell">Paid</th>
                                    <th className="px-5 py-3">Status</th>
                                    <th className="px-5 py-3 hidden md:table-cell">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {orders.map((order, i) => (
                                    <tr key={order.id} className="hover:bg-slate-50 transition cursor-pointer" onClick={() => setSelected(order)}>
                                        <td className="px-5 py-3 text-green-600 font-medium">{i + 1}</td>
                                        <td className="px-5 py-3 text-slate-700 font-medium">{order.user?.name}</td>
                                        <td className="px-5 py-3 font-semibold text-slate-800">{currency}{order.total?.toLocaleString()}</td>
                                        <td className="px-5 py-3 hidden md:table-cell text-slate-500">{order.paymentMethod}</td>
                                        <td className="px-5 py-3 hidden md:table-cell">
                                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${order.isPaid ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                                                {order.isPaid ? 'Paid' : 'Unpaid'}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3" onClick={e => e.stopPropagation()}>
                                            <select
                                                value={order.status}
                                                disabled={updating === order.id}
                                                onChange={e => updateStatus(order.id, e.target.value)}
                                                className={`text-xs px-2 py-1 rounded-lg border-0 font-medium outline-none cursor-pointer ${STATUS_STYLES[order.status] || 'bg-slate-100 text-slate-600'}`}
                                            >
                                                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                                            </select>
                                        </td>
                                        <td className="px-5 py-3 hidden md:table-cell text-slate-400 text-xs">
                                            {new Date(order.createdAt).toLocaleDateString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {selected && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelected(null)}>
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>

                        <div className="flex items-center justify-between p-5 border-b border-slate-100">
                            <h2 className="text-lg font-bold text-slate-800">Order Details</h2>
                            <button onClick={() => setSelected(null)} className="p-1.5 hover:bg-slate-100 rounded-lg transition">
                                <XIcon size={18} className="text-slate-500" />
                            </button>
                        </div>

                        <div className="p-5 space-y-5 text-sm">

                            <div className="bg-slate-50 rounded-xl p-4 space-y-1.5">
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Customer</p>
                                <p><span className="text-slate-500">Name:</span> <span className="font-medium text-slate-800">{selected.user?.name}</span></p>
                                <p><span className="text-slate-500">Email:</span> {selected.user?.email}</p>
                                {selected.address && (
                                    <>
                                        <p><span className="text-slate-500">Phone:</span> {selected.address.phone}</p>
                                        <p><span className="text-slate-500">Address:</span> {[selected.address.street, selected.address.city, selected.address.state, selected.address.zip, selected.address.country].filter(Boolean).join(', ')}</p>
                                    </>
                                )}
                            </div>

                            <div>
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Products</p>
                                <div className="space-y-2">
                                    {selected.orderItems?.map((item, i) => (
                                        <div key={i} className="flex items-center gap-3 border border-slate-100 rounded-xl p-3">
                                            {item.product?.images?.[0] && (
                                                <Image src={item.product.images[0]} alt={item.product.name} width={48} height={48} className="w-12 h-12 rounded-lg object-cover" />
                                            )}
                                            <div className="flex-1">
                                                <p className="font-medium text-slate-800">{item.product?.name}</p>
                                                <p className="text-xs text-slate-400">Qty: {item.quantity} &bull; {currency}{item.price}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-slate-50 rounded-xl p-4 space-y-1.5">
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Summary</p>
                                <p><span className="text-slate-500">Total:</span> <span className="font-bold text-slate-800">{currency}{selected.total?.toLocaleString()}</span></p>
                                <p><span className="text-slate-500">Payment:</span> {selected.paymentMethod}</p>
                                <p><span className="text-slate-500">Paid:</span> <span className={selected.isPaid ? 'text-green-600 font-medium' : 'text-red-500 font-medium'}>{selected.isPaid ? 'Yes' : 'No'}</span></p>
                                {selected.isCouponUsed && selected.coupon && (
                                    <p><span className="text-slate-500">Coupon:</span> {selected.coupon.code} ({selected.coupon.discount}% off)</p>
                                )}
                                <p><span className="text-slate-500">Date:</span> {new Date(selected.createdAt).toLocaleString()}</p>
                            </div>

                            <div>
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Update Status</p>
                                <select
                                    value={selected.status}
                                    disabled={updating === selected.id}
                                    onChange={e => updateStatus(selected.id, e.target.value)}
                                    className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:border-green-400 bg-white"
                                >
                                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                                </select>
                            </div>

                        </div>

                        <div className="p-5 border-t border-slate-100">
                            <button onClick={() => setSelected(null)} className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-medium transition">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
