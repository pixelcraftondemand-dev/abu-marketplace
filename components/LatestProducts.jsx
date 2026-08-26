'use client'
import React from 'react'
import Title from './Title'
import { useTranslation } from '@/lib/i18n'
import ProductCard from './ProductCard'
import { useSelector } from 'react-redux'
import { productDummyData } from '@/assets/assets'
import { StaggerReveal, StaggerItem } from '@/components/ScrollReveal'

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
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 my-10 sm:my-14'>
            <Title
                eyebrow={t('home.eyebrowLatest')}
                title={t('home.latestProducts')}
                description={t('home.showingProducts', { count: latestProducts.length, total: sourceProducts.length })}
                href='/shop'
            />
            <StaggerReveal className='mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 sm:gap-3'>
                {latestProducts.map((product, index) => (
                    <StaggerItem key={product.id || index}>
                        <ProductCard product={product} />
                    </StaggerItem>
                ))}
            </StaggerReveal>
        </div>
    )
}

export default LatestProducts