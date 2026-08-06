'use client'
import Title from './Title'
import { useTranslation } from '@/lib/i18n'
import ProductCard from './ProductCard'
import { useSelector } from 'react-redux'
import { productDummyData } from '@/assets/assets'

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
        <div className='mx-auto my-16 max-w-6xl px-3 sm:px-6'>
            <Title
                title={t('home.bestSelling')}
                description={t('home.showingProducts', { count: bestSelling.length, total: sourceProducts.length })}
                href='/shop'
            />
            <div className='mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:gap-6'>
                {bestSelling.map((product) => (
                    <ProductCard key={product.id} product={product} />
                ))}
            </div>
        </div>
    )
}

export default BestSelling