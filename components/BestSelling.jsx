'use client'
import Title from './Title'
import { useTranslation } from '@/lib/i18n'
import ProductCard from './ProductCard'
import { useSelector } from 'react-redux'
import { productDummyData } from '@/assets/assets'
import { StaggerReveal, StaggerItem } from '@/components/ScrollReveal'

const BestSelling = () => {
    const { t } = useTranslation()
    const displayQuantity = 8
    const products = useSelector((state) => state.product.list)
    const sourceProducts = products.length ? products : productDummyData

    const bestSelling = sourceProducts
        .slice()
        .sort((a, b) => (b.rating?.length || 0) - (a.rating?.length || 0))
        .slice(0, displayQuantity)

    return (
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 my-10 sm:my-14'>
            <Title
                eyebrow={t('home.eyebrowBestSelling')}
                title={t('home.bestSelling')}
                description={t('home.showingProducts', { count: bestSelling.length, total: sourceProducts.length })}
                href='/shop'
            />
            <StaggerReveal className='mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 sm:gap-3'>
                {bestSelling.map((product) => (
                    <StaggerItem key={product.id}>
                        <ProductCard product={product} />
                    </StaggerItem>
                ))}
            </StaggerReveal>
        </div>
    )
}

export default BestSelling