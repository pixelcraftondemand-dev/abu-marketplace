'use client'
import ProductCard from '@/components/ProductCard'
import { Heart } from 'lucide-react'
import Link from 'next/link'
import { useSelector } from 'react-redux'

export default function WishlistPage() {
    const wishlistItems = useSelector((state) => state.wishlist.items)
    const products = useSelector((state) => state.product.list)
    const wishlistProducts = wishlistItems
        .map((id) => products.find((p) => p.id === id))
        .filter(Boolean)

    return (
        <div className="mx-6 min-h-[70vh]">
            <div className="mx-auto max-w-7xl">
                <div className="my-8 flex items-center gap-3">
                    <Heart className="fill-red-500 text-red-500" size={28} />
                    <div>
                        <h1 className="text-2xl font-semibold text-slate-800">My Wishlist</h1>
                        <p className="text-sm text-slate-500">{wishlistProducts.length} saved items</p>
                    </div>
                </div>

                {wishlistProducts.length === 0 ? (
                    <div className="py-20 text-center">
                        <Heart className="mx-auto text-slate-300" size={48} />
                        <p className="mt-4 text-lg font-medium text-slate-600">Your wishlist is empty</p>
                        <p className="mt-2 text-sm text-slate-500">Tap the heart on any product to save it for later</p>
                        <Link
                            href="/shop"
                            className="mt-6 inline-block rounded-full bg-green-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-green-700"
                        >
                            Start shopping
                        </Link>
                    </div>
                ) : (
                    <div className="mb-32 grid grid-cols-2 gap-6 sm:flex sm:flex-wrap">
                        {wishlistProducts.map((product) => (
                            <ProductCard key={product.id} product={product} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
