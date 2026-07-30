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
        <div className="group relative mx-auto w-full max-w-[220px] rounded-[28px] border border-slate-200/80 bg-white p-4 shadow-[0_18px_40px_rgba(15,23,42,0.08)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_55px_rgba(15,23,42,0.15)]">
            <Link href={`/product/${product.id}`} className="block">
                <div className="relative aspect-[4/5] overflow-hidden rounded-[24px] bg-slate-100">
                    {discount > 0 && (
                        <span className="absolute left-3 top-3 rounded-full bg-rose-500/95 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white shadow-sm">
                            -{discount}%
                        </span>
                    )}
                    {(product.halalCertified || product.badge) && (
                        <span className="absolute bottom-3 left-3 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/95 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-700 shadow-sm">
                            {product.halalCertified ? 'Halal Certified' : product.badge}
                        </span>
                    )}
                    <span className="absolute right-3 top-3 rounded-full bg-white/95 px-3 py-1.5 text-[10px] font-semibold text-slate-700 shadow-sm">
                        Free delivery
                    </span>
                    <Image
                        width={500}
                        height={500}
                        className="h-full w-full object-contain p-4 transition duration-300 group-hover:scale-105"
                        src={product.images[0]}
                        alt={product.name}
                    />
                    {showQuickAdd && (
                        <button
                            onClick={handleQuickAdd}
                            className="absolute bottom-3 right-3 flex h-11 w-11 items-center justify-center rounded-full bg-slate-900 text-white shadow-2xl shadow-slate-900/10 transition hover:bg-slate-800"
                            aria-label="Quick add to cart"
                        >
                            <ShoppingBag size={18} />
                        </button>
                    )}
                </div>
                <div className="mt-4 flex flex-col gap-3">
                    <div className="min-w-0">
                        <p className="line-clamp-2 text-sm font-semibold leading-snug text-slate-900">{product.name}</p>
                        <div className="mt-2 flex items-center gap-2 text-[12px] text-slate-500">
                            <div className="flex items-center gap-0.5">
                                {Array(5).fill('').map((_, index) => (
                                    <StarIcon
                                        key={index}
                                        size={14}
                                        className="text-transparent"
                                        fill={rating >= index + 1 ? '#F59E0B' : '#E2E8F0'}
                                    />
                                ))}
                            </div>
                            <span className="font-medium text-slate-600">{rating.toFixed(1)} / 5</span>
                        </div>
                        <p className="mt-2 text-[12px] text-slate-500">Easy returns • Quality checked sellers</p>
                    </div>
                    <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-3">
                        <div className="flex items-center justify-between gap-2">
                            <div>
                                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Your price</p>
                                <p className="mt-1 text-lg font-semibold text-slate-900">{currency}{Number(product.price).toFixed(2)}</p>
                            </div>
                            {discount > 0 ? (
                                <div className="text-right">
                                    <p className="text-[11px] text-slate-400 line-through">{currency}{Number(product.mrp).toFixed(2)}</p>
                                    <p className="mt-1 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-700">Save {discount}%</p>
                                </div>
                            ) : (
                                <span className="rounded-full bg-slate-200 px-3 py-1 text-[11px] font-semibold text-slate-600">Popular</span>
                            )}
                        </div>
                    </div>
                </div>
            </Link>
            <button
                onClick={handleWishlist}
                className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm transition hover:scale-105"
                aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
            >
                <Heart
                    size={18}
                    className={isWishlisted ? 'fill-rose-500 text-rose-500' : 'text-slate-400'}
                />
            </button>
        </div>
    )
}

export default ProductCard
