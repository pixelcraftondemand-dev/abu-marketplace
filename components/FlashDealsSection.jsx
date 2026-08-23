'use client'
import ProductCard from '@/components/ProductCard'
import FlashDeals from '@/components/FlashDeals'
import { getFlashDealProducts } from '@/lib/productUtils'
import Link from 'next/link'
import { useSelector } from 'react-redux'
import { productDummyData } from '@/assets/assets'
import { useTranslation } from '@/lib/i18n'
import { StaggerReveal, StaggerItem } from '@/components/ScrollReveal'

const FlashDealsSection = () => {
    const { t } = useTranslation()
    const products = useSelector((state) => state.product.list)
    const sourceProducts = products.length ? products : productDummyData
    const flashDeals = getFlashDealProducts(sourceProducts, 8)

    if (flashDeals.length === 0) return null

    return (
        <section className="mx-3 my-16 sm:mx-6">
            <div className="mx-auto max-w-7xl rounded-3xl bg-[linear-gradient(135deg,#1A1A1A_0%,#2d2d2d_60%,#3a3123_100%)] p-4 text-white sm:p-8">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <FlashDeals />
                        <h2 className="mt-3 font-display text-2xl font-medium text-white sm:text-3xl">{t('flashDeals.title')}</h2>
                        <p className="mt-2 text-sm text-white/60">{t('flashDeals.subtitle')}</p>
                    </div>
                    <Link href="/shop?deals=flash" className="rounded-full bg-[#C9A96E] px-5 py-2.5 text-sm font-semibold text-[#1A1A1A] transition hover:bg-[#D4B87A]">
                        {t('flashDeals.shopAll')}
                    </Link>
                </div>
                <StaggerReveal className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:gap-6">
                    {flashDeals.slice(0, 4).map((product) => (
                        <StaggerItem key={product.id}>
                            <ProductCard product={product} showQuickAdd />
                        </StaggerItem>
                    ))}
                </StaggerReveal>
            </div>
        </section>
    )
}

export default FlashDealsSection
