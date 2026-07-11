'use client'
import ProductCard from "@/components/ProductCard"
import ShopFilters from "@/components/ShopFilters"
import { filterProducts, getFlashDealProducts, sortProducts } from "@/lib/productUtils"
import { MoveLeftIcon } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useState } from "react"
import { useSelector } from "react-redux"

function ShopContent() {
    const searchParams = useSearchParams()
    const search = searchParams.get('search') || ''
    const category = searchParams.get('category') || ''
    const deals = searchParams.get('deals')
    const router = useRouter()
    const products = useSelector(state => state.product.list)

    const [filters, setFilters] = useState({
        sortBy: 'relevance',
        minPrice: '',
        maxPrice: '',
        minRating: '',
        inStockOnly: false,
    })

    let filteredProducts = filterProducts(products, {
        search,
        category,
        minPrice: filters.minPrice,
        maxPrice: filters.maxPrice,
        minRating: filters.minRating,
        inStockOnly: filters.inStockOnly,
    })

    if (deals === 'flash') {
        filteredProducts = getFlashDealProducts(filteredProducts, 50)
    }

    filteredProducts = sortProducts(filteredProducts, filters.sortBy)

    const title = deals === 'flash' ? 'Flash Deals' : category || (search ? `"${search}"` : 'All')

    return (
        <div className="min-h-[70vh] mx-6">
            <div className="max-w-7xl mx-auto">
                <h1
                    onClick={() => router.push('/shop')}
                    className="text-2xl text-slate-500 my-6 flex items-center gap-2 cursor-pointer"
                >
                    {(search || category || deals) && <MoveLeftIcon size={20} />}
                    {title} <span className="text-slate-700 font-medium">Products</span>
                </h1>

                <ShopFilters
                    filters={filters}
                    onChange={setFilters}
                    resultCount={filteredProducts.length}
                />

                {filteredProducts.length === 0 ? (
                    <div className="py-20 text-center text-slate-500">
                        <p className="text-lg font-medium">No products found</p>
                        <p className="mt-2 text-sm">Try adjusting your filters or search terms</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:flex flex-wrap gap-6 xl:gap-12 mx-auto mb-32">
                        {filteredProducts.map((product) => (
                            <ProductCard key={product.id} product={product} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

export default function Shop() {
    return (
        <Suspense fallback={<div>Loading shop...</div>}>
            <ShopContent />
        </Suspense>
    )
}
