'use client'
import ProductCard from '@/components/ProductCard'
import { Heart } from 'lucide-react'
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

    return (
        <div className="mx-6 min-h-[70vh]">
            <div className="mx-auto max-w-7xl">
                <div className="my-8">
                    <p className="text-editorial mb-2 text-[#C9A96E]">{t('wishlist.eyebrow')}</p>
                    <div className="flex items-center gap-3">
                        <Heart className="fill-rose-500 text-rose-500" size={24} />
                        <div>
                            <h1 className="font-display text-3xl font-medium text-[#1A1A1A] sm:text-4xl">{t('wishlist.title')}</h1>
                            <p className="mt-1 text-sm text-[#6B6560]">{t('wishlist.savedItems', { count: wishlistProducts.length })}</p>
                        </div>
                    </div>
                </div>

                {wishlistProducts.length === 0 ? (
                    <div className="py-20 text-center">
                        <Heart className="mx-auto text-[#E8E2DB]" size={48} />
                        <p className="mt-4 text-lg font-medium text-[#1A1A1A]">{t('wishlist.empty')}</p>
                        <p className="mt-2 text-sm text-[#6B6560]">{t('wishlist.emptyText')}</p>
                        <Link
                            href="/shop"
                            className="mt-6 inline-block rounded-full bg-[#1A1A1A] px-7 py-3 text-sm font-medium text-white transition hover:bg-[#C9A96E]"
                        >
                            {t('wishlist.startShopping')}
                        </Link>
                    </div>
                ) : (
                    <div className="mb-32 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:gap-6">
                        {wishlistProducts.map((product) => (
                            <ProductCard key={product.id} product={product} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
