'use client'
import ProductCard from '@/components/ProductCard'
import FlashDeals from '@/components/FlashDeals'
import { getFlashDealProducts } from '@/lib/productUtils'
import Link from 'next/link'
import { useSelector } from 'react-redux'
import { productDummyData } from '@/assets/assets'
import { useTranslation } from '@/lib/i18n'
import { StaggerReveal, StaggerItem } from '@/components/ScrollReveal'
import { ArrowRight } from 'lucide-react'

const FlashDealsSection = () => {
    const { t } = useTranslation()
    const products = useSelector((state) => state.product.list)
    const sourceProducts = products.length ? products : productDummyData
    const flashDeals = getFlashDealProducts(sourceProducts, 8)

    if (flashDeals.length === 0) return null

    return (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 my-10 sm:my-14">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-5 sm:p-8 text-white shadow-2xl shadow-black/10">
                {/* Subtle pattern */}
                <div className="absolute inset-0 opacity-[0.03]" style={{
                    backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
                    backgroundSize: '24px 24px'
                }} />
                
                <div className="relative z-10">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <FlashDeals />
                            <h2 className="mt-3 text-2xl font-bold text-white sm:text-3xl tracking-tight">{t('flashDeals.title')}</h2>
                            <p className="mt-1.5 text-sm text-white/50">{t('flashDeals.subtitle')}</p>
                        </div>
                        <Link 
                            href="/shop?deals=flash" 
                            className="group inline-flex items-center gap-2 rounded-xl bg-[var(--color-accent)] px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-[var(--color-accent-hover)] hover:shadow-lg hover:shadow-orange-500/20 hover:-translate-y-0.5 active:translate-y-0"
                        >
                            {t('flashDeals.shopAll')}
                            <ArrowRight size={14} className="transition-transform duration-200 group-hover:translate-x-0.5" />
                        </Link>
                    </div>
                    <StaggerReveal className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 sm:gap-3">
                        {flashDeals.slice(0, 4).map((product) => (
                            <StaggerItem key={product.id}>
                                <ProductCard product={product} showQuickAdd />
                            </StaggerItem>
                        ))}
                    </StaggerReveal>
                </div>
            </div>
        </section>
    )
}

export default FlashDealsSection
