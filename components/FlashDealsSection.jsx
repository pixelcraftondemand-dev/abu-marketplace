'use client'
import ProductCard from '@/components/ProductCard'
import FlashDeals from '@/components/FlashDeals'
import Title from '@/components/Title'
import { getFlashDealProducts } from '@/lib/productUtils'
import Link from 'next/link'
import { useSelector } from 'react-redux'
import { productDummyData } from '@/assets/assets'

const FlashDealsSection = () => {
    const products = useSelector((state) => state.product.list)
    const sourceProducts = products.length ? products : productDummyData
    const flashDeals = getFlashDealProducts(sourceProducts, 8)

    if (flashDeals.length === 0) return null

    return (
        <section className="mx-3 my-16 sm:mx-6">
            <div className="mx-auto max-w-7xl rounded-2xl bg-gradient-to-r from-red-50 via-orange-50 to-yellow-50 p-4 sm:p-8">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <FlashDeals />
                        <h2 className="mt-3 text-2xl font-semibold text-slate-800 sm:text-3xl">Daily Flash Deals</h2>
                        <p className="mt-2 text-sm text-slate-600">Up to 90% off — limited time only. Inspired by Shein&apos;s flash sale experience.</p>
                    </div>
                    <Link href="/shop?deals=flash" className="rounded-full bg-red-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-red-600 transition">
                        Shop all deals
                    </Link>
                </div>
                <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:gap-6">
                    {flashDeals.slice(0, 4).map((product) => (
                        <ProductCard key={product.id} product={product} showQuickAdd />
                    ))}
                </div>
            </div>
        </section>
    )
}

export default FlashDealsSection
