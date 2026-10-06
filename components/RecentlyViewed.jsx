'use client'
import ProductCard from './ProductCard'
import Title from './Title'
import { getRecentlyViewed } from '@/lib/recentlyViewed'
import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'

const RecentlyViewed = ({ currentProductId }) => {
    const products = useSelector((state) => state.product.list)
    const [recentlyViewedIds, setRecentlyViewedIds] = useState([])

    useEffect(() => {
        setRecentlyViewedIds(getRecentlyViewed())
    }, [currentProductId])

    const recentlyViewedProducts = recentlyViewedIds
        .filter((id) => id !== currentProductId)
        .map((id) => products.find((p) => p.id === id))
        .filter(Boolean)
        .slice(0, 4)

    if (recentlyViewedProducts.length === 0) return null

    return (
        <div className="my-16">
            <Title title="Recently Viewed" description="Pick up where you left off" href="/shop" />
            <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 sm:gap-3">
                {recentlyViewedProducts.map((product) => (
                    <ProductCard key={product.id} product={product} />
                ))}
            </div>
        </div>
    )
}

export default RecentlyViewed
