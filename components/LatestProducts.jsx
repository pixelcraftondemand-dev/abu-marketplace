'use client'
import React from 'react'
import Title from './Title'
import { useTranslation } from '@/lib/i18n'
import ProductCard from './ProductCard'
import { useSelector } from 'react-redux'
import { productDummyData } from '@/assets/assets'

const LatestProducts = () => {
    const { t } = useTranslation()
    const displayQuantity = 4
    const products = useSelector((state) => state.product.list)
    const sourceProducts = products.length ? products : productDummyData

    const latestProducts = sourceProducts
        .slice()
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, displayQuantity)

    return (
        <div className='mx-auto my-16 max-w-6xl px-3 sm:px-6'>
            <Title
                title={t('home.latestProducts')}
                description={t('home.showingProducts', { count: latestProducts.length, total: sourceProducts.length })}
                href='/shop'
            />
            <div className='mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:gap-6'>
                {latestProducts.map((product, index) => (
                    <ProductCard key={product.id || index} product={product} />
                ))}
            </div>
        </div>
    )
}

export default LatestProducts