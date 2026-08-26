'use client'
import Image from "next/image";
import { DotIcon, MapPin, Calendar, Package } from "lucide-react";
import { useSelector } from "react-redux";
import Rating from "./Rating";
import { useState } from "react";
import RatingModal from "./RatingModal";
import CurrencyAmount from './CurrencyAmount'

const statusColors = {
  confirmed: "bg-amber-50 text-amber-700 border-amber-200",
  delivered: "bg-green-50 text-green-700 border-green-200",
  processing: "bg-blue-50 text-blue-700 border-blue-200",
  shipped: "bg-purple-50 text-purple-700 border-purple-200",
  default: "bg-gray-50 text-gray-600 border-gray-200",
}

const OrderItem = ({ order }) => {
    const [ratingModal, setRatingModal] = useState(null);
    const { ratings } = useSelector(state => state.rating);

    const getStatusColor = (status) => {
        const key = status?.toLowerCase()
        return statusColors[key] || statusColors.default
    }

    return (
        <>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Order header */}
                <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-gray-50 bg-gray-50/50">
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1.5">
                            <Calendar size={12} className="text-gray-400" />
                            {new Date(order.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </span>
                        <span className="flex items-center gap-1.5">
                            <Package size={12} className="text-gray-400" />
                            {order.orderItems.length} item{order.orderItems.length !== 1 ? 's' : ''}
                        </span>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusColor(order.status)}`}>
                        <DotIcon size={8} className="scale-150" />
                        {order.status?.replace(/_/g, ' ').toLowerCase()}
                    </span>
                </div>

                {/* Items */}
                <div className="p-5">
                    <div className="space-y-4">
                        {order.orderItems.map((item, index) => (
                            <div key={index} className="flex items-center gap-4">
                                <div className="w-16 h-16 bg-gray-50 rounded-xl flex items-center justify-center border border-gray-100 shrink-0 overflow-hidden">
                                    <Image
                                        className="w-full h-full object-contain p-1"
                                        src={item.product.images?.[0] || item.product.image}
                                        alt={item.product.name}
                                        width={64}
                                        height={64}
                                    />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-gray-800 truncate">{item.product.name}</p>
                                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                                        <span className="font-medium text-gray-700 tabular-nums"><CurrencyAmount amount={item.price} /></span>
                                        <span>x{item.quantity}</span>
                                    </div>
                                    <div className="mt-1.5">
                                        {ratings.find(rating => order.id === rating.orderId && item.product.id === rating.productId)
                                            ? <Rating value={ratings.find(rating => order.id === rating.orderId && item.product.id === rating.productId).rating} />
                                            : <button
                                                onClick={() => setRatingModal({ orderId: order.id, productId: item.product.id })}
                                                className={`text-xs font-medium text-green-600 hover:text-green-700 transition-colors ${order.status !== "DELIVERED" && 'hidden'}`}
                                              >
                                                Rate this product
                                              </button>
                                        }
                                    </div>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="text-sm font-bold text-gray-900 tabular-nums">
                                        <CurrencyAmount amount={item.price * item.quantity} />
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Footer */}
                    <div className="flex flex-wrap items-center justify-between gap-4 mt-5 pt-4 border-t border-gray-100">
                        {order.address && (
                            <div className="flex items-start gap-2 text-xs text-gray-500 max-w-xs">
                                <MapPin size={13} className="text-gray-400 shrink-0 mt-0.5" />
                                <p className="leading-relaxed">
                                    {order.address.name}, {order.address.street}, {order.address.city}, {order.address.state} {order.address.zip}
                                </p>
                            </div>
                        )}
                        <div className="text-right">
                            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Order Total</p>
                            <p className="text-lg font-bold text-gray-900 tabular-nums mt-0.5">
                                <CurrencyAmount amount={order.total} />
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {ratingModal && <RatingModal ratingModal={ratingModal} setRatingModal={setRatingModal} />}
        </>
    )
}

export default OrderItem
