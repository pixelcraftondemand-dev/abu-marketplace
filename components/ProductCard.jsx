'use client'
import { useState, useCallback } from 'react'
import { StarIcon, Heart, ShoppingBag, Check, BadgeCheck } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useDispatch, useSelector } from 'react-redux'
import toast from 'react-hot-toast'
import { addToCart } from '@/lib/features/cart/cartSlice'
import { toggleWishlist } from '@/lib/features/wishlist/wishlistSlice'
import { getProductDiscount, getProductRating } from '@/lib/productUtils'
import { emitAddedToCart } from '@/lib/cartEvents'
import CurrencyAmount from '@/components/CurrencyAmount'
import { useTranslation } from '@/lib/i18n'
import { useFlashCountdown } from '@/lib/hooks/useFlashCountdown'

/**
 * Amazon-density product card — compact, price-dominant, trust-rich.
 * Polished with smooth shadows, satisfying hover lifts, and micro-interactions.
 */
const ProductCard = ({ product, showQuickAdd = true }) => {
    const { t } = useTranslation()
    const dispatch = useDispatch()
    const router = useRouter()
    const wishlistItems = useSelector((state) => state.wishlist.items)
    const isWishlisted = wishlistItems.includes(product.id)

    const { rating, count } = getProductRating(product)
    const discount = getProductDiscount(product)
    const images = Array.isArray(product.images) && product.images.length
        ? product.images
        : [product.image]

    const [addedToCart, setAddedToCart] = useState(false)
    const [isHovered, setIsHovered] = useState(false)

    const handleWishlist = useCallback((e) => {
        e.preventDefault()
        e.stopPropagation()
        dispatch(toggleWishlist(product.id))
        toast.success(isWishlisted ? t('product.removedFromWishlist') : t('product.addedToWishlist'))
    }, [dispatch, product.id, isWishlisted, t])

    const handleQuickAdd = useCallback((e) => {
        e.preventDefault()
        e.stopPropagation()
        if (!product.inStock) {
            toast.error(t('product.outOfStock'))
            return
        }
        dispatch(addToCart({ productId: product.id }))
        emitAddedToCart(product)
        setAddedToCart(true)
        setTimeout(() => setAddedToCart(false), 2000)
    }, [dispatch, product, t])

    const lowStock = product.stock != null && Number(product.stock) > 0 && Number(product.stock) <= 5
    const isFlashDeal = discount >= 15
    const { formatted: flashCountdown, mounted: flashMounted } = useFlashCountdown()
    const soldCount = product.soldCount != null ? Number(product.soldCount) : count

    return (
        <div
            className="group relative flex flex-col bg-white border border-gray-100 rounded-xl overflow-hidden transition-all duration-300 ease-out hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.08),0_2px_8px_-2px_rgba(0,0,0,0.04)] hover:border-gray-200 hover:-translate-y-0.5"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <Link href={`/product/${product.id}`} className="block">
                {/* Image Container */}
                <div className="relative aspect-square overflow-hidden bg-gray-50">
                    {/* Discount badge */}
                    {discount > 0 && (
                        <span className="absolute left-2.5 top-2.5 z-10 rounded-md bg-[var(--sale-red)] px-2 py-0.5 text-[10px] font-bold text-white leading-none shadow-sm">
                            -{discount}%
                        </span>
                    )}

                    {/* Flash deal countdown */}
                    {isFlashDeal && flashMounted && (
                        <span className="absolute right-2.5 top-2.5 z-10 inline-flex items-center gap-1 rounded-md bg-gray-900/90 px-2 py-1 text-[9px] font-semibold text-white backdrop-blur-sm shadow-sm">
                            <span className="animate-pulse">⚡</span>
                            <span className="font-mono tabular-nums">{flashCountdown}</span>
                        </span>
                    )}

                    {/* Product Image */}
                    <Image
                        width={400}
                        height={400}
                        className={`w-full h-full object-contain p-3 transition-transform duration-500 ease-out ${isHovered ? 'scale-110' : 'scale-100'}`}
                        src={images[0]}
                        alt={product.name}
                    />

                    {/* Wishlist heart */}
                    <button
                        onClick={handleWishlist}
                        className={`absolute right-2.5 top-2.5 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/95 backdrop-blur-sm shadow-sm transition-all duration-300 ${
                            isHovered || isWishlisted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1'
                        } hover:scale-110 active:scale-95`}
                        aria-label={isWishlisted ? t('product.removedFromWishlist') : t('product.addedToWishlist')}
                    >
                        <Heart
                            size={14}
                            className={`transition-colors duration-200 ${isWishlisted ? 'fill-rose-500 text-rose-500' : 'text-gray-400'}`}
                        />
                    </button>
                </div>

                {/* Content */}
                <div className="p-3 flex flex-col gap-1 min-w-0">
                    {/* Title */}
                    <p className="line-clamp-2 text-[13px] leading-snug text-gray-800 font-medium group-hover:text-[var(--color-primary)] transition-colors duration-200">
                        {product.name}
                    </p>

                    {/* Star rating + review count + sold count */}
                    <div className="flex items-center gap-1 flex-wrap">
                        <div className="flex items-center gap-0.5">
                            {Array(5).fill('').map((_, index) => (
                                <StarIcon
                                    key={index}
                                    size={11}
                                    className="text-transparent"
                                    fill={rating >= index + 1 ? '#F59E0B' : '#E5E7EB'}
                                />
                            ))}
                        </div>
                        <span className="text-[11px] font-semibold text-gray-800">{rating.toFixed(1)}</span>
                        <span className="text-[11px] text-gray-400">({count.toLocaleString()})</span>
                        {soldCount > 0 && (
                            <span className="text-[10px] text-gray-400">· {t('product.xSold', { count: soldCount })}</span>
                        )}
                    </div>

                    {/* Price block */}
                    <div className="flex items-baseline gap-2 mt-0.5">
                        <p className="text-lg font-bold text-gray-900 tabular-nums leading-tight">
                            <CurrencyAmount amount={product.price} />
                        </p>
                        {discount > 0 && (
                            <p className="text-[11px] text-gray-400 line-through tabular-nums">
                                <CurrencyAmount amount={product.mrp} />
                            </p>
                        )}
                    </div>

                    {/* Micro-trust line */}
                    <p className={`text-[10px] leading-tight font-medium ${lowStock ? 'text-[var(--color-urgency)]' : 'text-green-600'}`}>
                        {lowStock
                            ? `⚠ ${t('product.onlyXLeft', { count: product.stock })}`
                            : `✓ ${t('product.freeDelivery')}`
                        }
                    </p>
                </div>
            </Link>

            {/* Quick-add button */}
            {showQuickAdd && (
                <button
                    onClick={handleQuickAdd}
                    className={`absolute bottom-3 right-3 z-10 flex h-9 w-9 items-center justify-center rounded-full shadow-md transition-all duration-300 ease-out min-h-[36px] min-w-[36px] ${
                        addedToCart
                            ? 'bg-green-500 text-white scale-110'
                            : 'bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] hover:shadow-lg hover:shadow-blue-500/25'
                    } ${isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
                    aria-label={addedToCart ? t('product.addedToCart') : t('product.quickAdd')}
                >
                    {addedToCart ? (
                        <Check size={16} strokeWidth={3} className="animate-[scale-in_0.2s_ease-out]" />
                    ) : (
                        <ShoppingBag size={14} />
                    )}
                </button>
            )}

            {/* Seller badge */}
            {product.store && (
                <Link
                    href={`/shop/${product.store.username}`}
                    className="px-3 pb-2.5 flex items-center gap-1 text-[10px] font-medium text-gray-400 transition-colors duration-200 hover:text-[var(--color-primary)]"
                >
                    <BadgeCheck size={10} className="shrink-0 text-green-500" />
                    <span className="truncate min-w-0">{product.store.name}</span>
                </Link>
            )}
        </div>
    )
}

export default ProductCard
