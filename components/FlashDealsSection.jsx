'use client'
import ProductCard from '@/components/ProductCard'
import FlashDeals from '@/components/FlashDeals'
import Title from '@/components/Title'
import { getFlashDealProducts } from '@/lib/productUtils'
import Link from 'next/link'
import { useSelector } from 'react-redux'

const FlashDealsSection = () => {
    const products = useSelector((state) => state.product.list)
    const flashDeals = getFlashDealProducts(products, 8)

    if (flashDeals.length === 0) return null

    return (
        <section className="mx-6 my-24">
            <div className="max-w-7xl mx-auto rounded-2xl bg-gradient-to-r from-red-50 via-orange-50 to-yellow-50 p-6 sm:p-10">
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
                <div className="mt-8 grid grid-cols-2 gap-4 sm:flex sm:flex-wrap sm:gap-6">
                    {flashDeals.slice(0, 4).map((product) => (
                        <ProductCard key={product.id} product={product} showQuickAdd />
                    ))}
                </div>
            </div>
        </section>
    )
}

export default FlashDealsSection
