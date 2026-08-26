'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, Package, Truck, ArrowRight, Home, ShoppingBag, RotateCcw } from 'lucide-react'

export default function OrderConfirmation() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [countdown, setCountdown] = useState(5)

  // Auto-redirect to orders after 10 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          router.push('/orders')
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [router])

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="max-w-lg w-full">
        {/* Success card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
          {/* Animated checkmark */}
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 bg-green-100 rounded-full animate-ping opacity-20" />
            <div className="relative w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle size={40} className="text-green-600" />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Order Confirmed!</h1>
          <p className="text-sm text-gray-500 mt-2 max-w-xs mx-auto leading-relaxed">
            Thank you for your purchase. Your order has been placed successfully and is being processed.
          </p>

          {/* Order number */}
          <div className="mt-6 bg-gray-50 rounded-xl p-4 border border-gray-100">
            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Order Number</p>
            <p className="text-lg font-bold text-gray-900 tabular-nums mt-1">
              #{searchParams.get('orderId') || 'Processing'}
            </p>
          </div>

          {/* What's next */}
          <div className="mt-6 space-y-3">
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl text-left">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                <Package size={16} className="text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">Order Processing</p>
                <p className="text-xs text-gray-500">We're preparing your items for shipment</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl text-left">
              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                <Truck size={16} className="text-gray-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">Delivery Estimate</p>
                <p className="text-xs text-gray-500">2-3 business days to Freetown</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-8 space-y-2.5">
            <Link
              href="/orders"
              className="w-full flex items-center justify-center gap-2 bg-[var(--color-primary)] text-white py-3.5 rounded-xl text-sm font-semibold transition-all duration-200 hover:bg-[var(--color-primary-hover)] hover:shadow-lg hover:shadow-blue-500/20 hover:-translate-y-0.5 active:translate-y-0"
            >
              View My Orders
              <ArrowRight size={16} />
            </Link>
            <Link
              href="/shop"
              className="w-full flex items-center justify-center gap-2 bg-gray-100 text-gray-700 py-3.5 rounded-xl text-sm font-semibold transition-all duration-200 hover:bg-gray-200 active:scale-95"
            >
              <ShoppingBag size={16} />
              Continue Shopping
            </Link>
          </div>

          {/* Auto-redirect notice */}
          <p className="mt-4 text-xs text-gray-400">
            Redirecting to orders in {countdown}s...
          </p>
        </div>

        {/* Trust signals below */}
        <div className="mt-6 flex items-center justify-center gap-6 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <span className="text-green-500">✓</span> Secure payment
          </span>
          <span className="flex items-center gap-1">
            <span className="text-green-500">✓</span> 7-day returns
          </span>
          <span className="flex items-center gap-1">
            <span className="text-green-500">✓</span> Quality checked
          </span>
        </div>
      </div>
    </main>
  )
}
