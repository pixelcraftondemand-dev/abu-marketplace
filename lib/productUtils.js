export function getProductRating(product) {
    const ratingCount = product.rating?.length || 0
    if (!ratingCount) return { rating: 0, count: 0 }
    const rating = Math.round(
        product.rating.reduce((acc, curr) => acc + curr.rating, 0) / ratingCount
    )
    return { rating, count: ratingCount }
}

export function getProductDiscount(product) {
    if (!product.mrp || product.mrp <= product.price) return 0
    return Math.round(((product.mrp - product.price) / product.mrp) * 100)
}

export function sortProducts(products, sortBy) {
    const sorted = [...products]
    switch (sortBy) {
        case 'price-asc':
            return sorted.sort((a, b) => a.price - b.price)
        case 'price-desc':
            return sorted.sort((a, b) => b.price - a.price)
        case 'rating':
            return sorted.sort((a, b) => getProductRating(b).rating - getProductRating(a).rating)
        case 'discount':
            return sorted.sort((a, b) => getProductDiscount(b) - getProductDiscount(a))
        case 'newest':
            return sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        default:
            return sorted
    }
}

export function filterProducts(products, filters) {
    const { search, category, minPrice, maxPrice, minRating, inStockOnly } = filters

    return products.filter((product) => {
        if (search && !product.name.toLowerCase().includes(search.toLowerCase())) return false
        if (category && product.category.toLowerCase() !== category.toLowerCase()) return false
        if (minPrice && product.price < Number(minPrice)) return false
        if (maxPrice && product.price > Number(maxPrice)) return false
        if (minRating && getProductRating(product).rating < Number(minRating)) return false
        if (inStockOnly && !product.inStock) return false
        return true
    })
}

export function getFlashDealProducts(products, limit = 8) {
    return [...products]
        .filter((p) => getProductDiscount(p) >= 15)
        .sort((a, b) => getProductDiscount(b) - getProductDiscount(a))
        .slice(0, limit)
}
