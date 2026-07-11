'use client'
import { StarIcon, Heart, ShoppingBag } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useDispatch, useSelector } from 'react-redux'
import toast from 'react-hot-toast'
import { addToCart } from '@/lib/features/cart/cartSlice'
import { toggleWishlist } from '@/lib/features/wishlist/wishlistSlice'
import { getProductDiscount, getProductRating } from '@/lib/productUtils'

const ProductCard = ({ product, showQuickAdd = true }) => {
    const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '$'
    const dispatch = useDispatch()
    const wishlistItems = useSelector((state) => state.wishlist.items)
    const isWishlisted = wishlistItems.includes(product.id)

    const { rating } = getProductRating(product)
    const discount = getProductDiscount(product)

    const handleWishlist = (e) => {
        e.preventDefault()
        e.stopPropagation()
        dispatch(toggleWishlist(product.id))
        toast.success(isWishlisted ? 'Removed from wishlist' : 'Added to wishlist')
    }

    const handleQuickAdd = (e) => {
        e.preventDefault()
        e.stopPropagation()
        if (!product.inStock) {
            toast.error('Out of stock')
            return
        }
        dispatch(addToCart({ productId: product.id }))
        toast.success('Added to cart')
    }

    return (
        <div className="group relative max-xl:mx-auto">
            <Link href={`/product/${product.id}`}>
                <div className="relative flex h-40 items-center justify-center overflow-hidden rounded-lg bg-[#F5F5F5] sm:h-68 sm:w-60">
                    {discount > 0 && (
                        <span className="absolute left-3 top-3 rounded-full bg-red-500 px-2.5 py-1 text-xs font-medium text-white">
                            -{discount}%
                        </span>
                    )}
                    <span className="absolute right-3 top-3 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-green-600">
                        Free delivery
                    </span>
                    <Image
                        width={500}
                        height={500}
                        className="max-h-30 w-auto transition duration-300 group-hover:scale-115 sm:max-h-40"
                        src={product.images[0]}
                        alt={product.name}
                    />
                    {showQuickAdd && (
                        <button
                            onClick={handleQuickAdd}
                            className="absolute bottom-3 right-3 flex size-9 items-center justify-center rounded-full bg-slate-800 text-white opacity-0 shadow-lg transition group-hover:opacity-100 hover:bg-slate-900 sm:opacity-100"
                            aria-label="Quick add to cart"
                        >
                            <ShoppingBag size={16} />
                        </button>
                    )}
                </div>
                <div className="flex max-w-60 justify-between gap-3 pt-2 text-sm text-slate-800">
                    <div className="min-w-0">
                        <p className="truncate">{product.name}</p>
                        <div className="flex">
                            {Array(5).fill('').map((_, index) => (
                                <StarIcon
                                    key={index}
                                    size={14}
                                    className="mt-0.5 text-transparent"
                                    fill={rating >= index + 1 ? '#00C950' : '#D1D5DB'}
                                />
                            ))}
                        </div>
                        <p className="mt-1 text-xs text-slate-500">7-day returns</p>
                    </div>
                    <div className="text-right">
                        <p className="font-semibold text-slate-900">{currency}{Number(product.price).toFixed(2)}</p>
                        {discount > 0 && (
                            <p className="text-xs text-slate-400 line-through">{currency}{product.mrp}</p>
                        )}
                    </div>
                </div>
            </Link>
            <button
                onClick={handleWishlist}
                className="absolute right-2 top-2 z-10 flex size-8 items-center justify-center rounded-full bg-white/90 shadow-sm transition hover:scale-110"
                aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
            >
                <Heart
                    size={16}
                    className={isWishlisted ? 'fill-red-500 text-red-500' : 'text-slate-400'}
                />
            </button>
        </div>
    )
}

export default ProductCard
