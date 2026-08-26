'use client'
import ProductCard from '@/components/ProductCard'
import { Heart, ShoppingBag } from 'lucide-react'
import Link from 'next/link'
import { useSelector } from 'react-redux'
import { useTranslation } from '@/lib/i18n'

export default function WishlistPage() {
    const { t } = useTranslation()
    const wishlistItems = useSelector((state) => state.wishlist.items)
    const products = useSelector((state) => state.product.list)
    const wishlistProducts = wishlistItems
        .map((id) => products.find((p) => p.id === id))
        .filter(Boolean)

    if (wishlistProducts.length === 0) {
        return (
            <div className="min-h-[80vh] flex items-center justify-center bg-gray-50 px-4">
                <div className="text-center">
                    <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-5">
                        <Heart size={32} className="text-red-300" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{t('wishlist.empty')}</h1>
                    <p className="text-sm text-gray-500 mt-2 mb-6 max-w-xs mx-auto">{t('wishlist.emptyText')}</p>
                    <Link
                        href="/shop"
                        className="inline-flex items-center gap-2 bg-[var(--color-primary)] text-white px-8 py-3.5 rounded-xl text-sm font-semibold transition-all duration-200 hover:bg-[var(--color-primary-hover)] hover:shadow-lg hover:shadow-blue-500/20 hover:-translate-y-0.5 active:translate-y-0"
                    >
                        <ShoppingBag size={16} />
                        {t('wishlist.startShopping')}
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 py-6 px-4 sm:px-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
                            <Heart size={20} className="text-red-500 fill-red-500" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{t('wishlist.title')}</h1>
                            <p className="text-sm text-gray-500">{t('wishlist.savedItems', { count: wishlistProducts.length })}</p>
                        </div>
                    </div>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 sm:gap-4 pb-16">
                    {wishlistProducts.map((product) => (
                        <ProductCard key={product.id} product={product} />
                    ))}
                </div>
            </div>
        </div>
    )
}
