'use client'
import { useState, useCallback } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { StarIcon, Heart, ShoppingBag, Zap, BadgeCheck, Check } from 'lucide-react'
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
 * Signature product card — the element that defines the site's feel.
 *
 * Interactions:
 *  - Card lifts on hover/tap with spring physics
 *  - Image scales subtly with parallax feel
 *  - Quick-add buttons reveal on hover (desktop) or always visible (mobile)
 *  - "Add to cart" morphs into a confirmed ✓ state
 *  - Wishlist heart fills with spring animation
 *  - All respects prefers-reduced-motion
 *
 * Theme-aware via CSS custom properties — works in both light and dark mode.
 */
const ProductCard = ({ product, showQuickAdd = true }) => {
    const { t } = useTranslation()
    const dispatch = useDispatch()
    const router = useRouter()
    const wishlistItems = useSelector((state) => state.wishlist.items)
    const isWishlisted = wishlistItems.includes(product.id)
    const prefersReducedMotion = useReducedMotion()

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

    const handleBuyNow = useCallback((e) => {
        e.preventDefault()
        e.stopPropagation()
        if (!product.inStock) {
            toast.error(t('product.outOfStock'))
            return
        }
        dispatch(addToCart({ productId: product.id }))
        emitAddedToCart(product)
        router.push('/cart')
    }, [dispatch, product, router, t])

    const lowStock = product.stock != null && Number(product.stock) > 0 && Number(product.stock) <= 5
    const isFlashDeal = discount >= 15
    const { formatted: flashCountdown, mounted: flashMounted } = useFlashCountdown()
    const soldCount = product.soldCount != null ? Number(product.soldCount) : count

    // Spring config — responsive to reduced motion preference
    const spring = prefersReducedMotion ? { duration: 0 } : { type: "spring", stiffness: 300, damping: 24 }
    const quickSpring = prefersReducedMotion ? { duration: 0 } : { type: "spring", stiffness: 500, damping: 30 }

    return (
        <motion.div
            className="group relative mx-auto w-full max-w-[280px] overflow-hidden rounded-[20px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3 sm:p-4 shadow-[var(--shadow-sm)] dark:shadow-none"
            onHoverStart={() => setIsHovered(true)}
            onHoverEnd={() => setIsHovered(false)}
            whileHover={prefersReducedMotion ? {} : { y: -6, boxShadow: "var(--shadow-lg)" }}
            whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
            transition={spring}
            layout
        >
            <Link href={`/product/${product.id}`} className="block overflow-hidden">
                {/* Image Container */}
                <div className="relative aspect-[4/5] overflow-hidden rounded-[16px] bg-[var(--bg-muted)]">
                    {/* Badges */}
                    {discount > 0 && (
                        <span className="absolute left-2.5 top-2.5 sm:left-3 sm:top-3 rounded-full bg-rose-500 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-white shadow-sm z-10">
                            -{discount}%
                        </span>
                    )}
                    {lowStock && (
                        <span className="absolute bottom-2.5 left-2.5 sm:bottom-3 sm:left-3 rounded-full bg-amber-500 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-white shadow-sm z-10">
                            {t('product.onlyXLeft', { count: product.stock })}
                        </span>
                    )}
                    {(product.halalCertified || product.badge) && !lowStock && (
                        <span className="absolute bottom-2.5 left-2.5 sm:bottom-3 sm:left-3 inline-flex items-center gap-1.5 rounded-full border border-[var(--border-primary)] bg-[var(--bg-surface)]/95 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-secondary)] shadow-sm backdrop-blur-sm z-10">
                            {product.halalCertified ? t('product.halalCertified') : product.badge}
                        </span>
                    )}
                    {isFlashDeal && flashMounted && (
                        <span className="absolute right-2.5 top-2.5 sm:right-3 sm:top-3 inline-flex items-center gap-1 rounded-full bg-[var(--text-primary)]/90 px-2.5 py-1 text-[10px] font-semibold text-[var(--text-inverse)] shadow-sm backdrop-blur-sm z-10">
                            <span className="animate-pulse">⚡</span>
                            <span className="font-mono tabular-nums">{flashCountdown}</span>
                        </span>
                    )}
                    {!isFlashDeal && (
                        <span className="absolute right-2.5 top-2.5 sm:right-3 sm:top-3 rounded-full bg-[var(--bg-surface)]/95 px-2.5 py-1 text-[10px] font-semibold text-[var(--text-secondary)] shadow-sm backdrop-blur-sm z-10">
                            {t('product.freeDelivery')}
                        </span>
                    )}

                    {/* Product Image — scales with spring on hover */}
                    <motion.div
                        className="w-full h-full"
                        animate={isHovered && !prefersReducedMotion ? { scale: 1.05 } : { scale: 1 }}
                        transition={{ type: "spring", stiffness: 200, damping: 20 }}
                    >
                        <Image
                            width={500}
                            height={500}
                            className="w-full h-full object-contain p-3 sm:p-4"
                            src={images[0]}
                            alt={product.name}
                        />
                    </motion.div>

                    {/* Quick Add buttons — reveal on hover (desktop) / always on mobile */}
                    {showQuickAdd && (
                        <motion.div
                            className="absolute bottom-2.5 right-2.5 sm:bottom-3 sm:right-3 flex gap-2 z-10"
                            initial={false}
                            animate={isHovered || typeof window !== 'undefined' && window.innerWidth < 768
                                ? { opacity: 1, y: 0 }
                                : { opacity: 0, y: 8 }
                            }
                            transition={quickSpring}
                        >
                            <motion.button
                                onClick={handleBuyNow}
                                whileTap={prefersReducedMotion ? {} : { scale: 0.92 }}
                                className="flex h-10 sm:h-11 items-center gap-1.5 rounded-full bg-[var(--text-primary)] px-3 sm:px-4 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-inverse)] shadow-lg transition-colors hover:bg-[var(--text-primary)]/90 min-h-[44px]"
                                aria-label={t('product.buyNow')}
                            >
                                <Zap size={14} />
                                <span className="hidden sm:inline">{t('product.buyNow')}</span>
                            </motion.button>
                            <motion.button
                                onClick={handleQuickAdd}
                                whileTap={prefersReducedMotion ? {} : { scale: 0.92 }}
                                className="flex h-10 sm:h-11 w-10 sm:w-11 items-center justify-center rounded-full bg-[var(--accent)] text-white shadow-lg transition-colors hover:bg-[var(--accent-hover)] min-h-[44px] min-w-[44px]"
                                aria-label={addedToCart ? t('product.addedToCart') : t('product.quickAdd')}
                            >
                                <motion.div
                                    key={addedToCart ? 'check' : 'bag'}
                                    initial={prefersReducedMotion ? {} : { scale: 0, rotate: -90 }}
                                    animate={{ scale: 1, rotate: 0 }}
                                    transition={quickSpring}
                                >
                                    {addedToCart ? <Check size={18} strokeWidth={2.5} /> : <ShoppingBag size={18} />}
                                </motion.div>
                            </motion.button>
                        </motion.div>
                    )}
                </div>

                {/* Content */}
                <div className="mt-3 sm:mt-4 flex flex-col gap-2 sm:gap-3 min-w-0">
                    <div className="min-w-0">
                        <p className="line-clamp-2 text-sm font-semibold leading-snug text-[var(--text-primary)]">
                            {product.name}
                        </p>
                        <div className="mt-1.5 sm:mt-2 flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-[12px] text-[var(--text-secondary)]">
                            <div className="flex items-center gap-0.5">
                                {Array(5).fill('').map((_, index) => (
                                    <StarIcon
                                        key={index}
                                        size={12}
                                        className="text-transparent"
                                        fill={rating >= index + 1 ? '#F59E0B' : 'var(--border-primary)'}
                                    />
                                ))}
                            </div>
                            <span className="font-medium text-[var(--text-primary)]">
                                {rating.toFixed(1)}
                                {count > 0 && <span className="ml-1 text-[var(--text-tertiary)]">({count})</span>}
                            </span>
                            {soldCount > 0 && (
                                <span className="text-[10px] sm:text-[11px] font-medium text-[var(--text-secondary)]">· {t('product.xSold', { count: soldCount })}</span>
                            )}
                        </div>
                        <p className="mt-1.5 sm:mt-2 text-[11px] sm:text-[12px] text-[var(--text-tertiary)]">{t('product.easyReturns')}</p>
                    </div>

                    {/* Price block */}
                    <div className="rounded-[14px] sm:rounded-[18px] border border-[var(--border-subtle)] bg-[var(--bg-muted)] p-2.5 sm:p-3 min-w-0">
                        <div className="flex items-center justify-between gap-2 min-w-0">
                            <div className="min-w-0 flex-1">
                                <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.15em] text-[var(--text-tertiary)]">{t('product.yourPrice')}</p>
                                <p className="mt-0.5 text-sm sm:text-base lg:text-lg font-semibold text-[var(--text-primary)] tabular-nums truncate">
                                    <CurrencyAmount amount={product.price} />
                                </p>
                            </div>
                            {discount > 0 ? (
                                <div className="text-right shrink-0">
                                    <p className="text-[10px] sm:text-[11px] text-[var(--text-tertiary)] line-through tabular-nums truncate max-w-[80px]">
                                        <CurrencyAmount amount={product.mrp} />
                                    </p>
                                    <p className="mt-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                                        {t('product.save', { percent: discount })}
                                    </p>
                                </div>
                            ) : (
                                <span className="shrink-0 rounded-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] px-2.5 py-0.5 text-[10px] sm:text-[11px] font-semibold text-[var(--text-secondary)]">
                                    {t('product.popular')}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </Link>

            {/* Seller badge — outside the Link to avoid nested <a> */}
            {product.store && (
                <Link
                    href={`/shop/${product.store.username}`}
                    className="mt-2.5 flex items-center gap-1.5 text-[10px] sm:text-[11px] font-medium text-[var(--text-secondary)] transition hover:text-[var(--accent)]"
                >
                    <BadgeCheck size={12} className="shrink-0 text-[var(--accent)]" />
                    <span className="truncate min-w-0">{product.store.name}</span>
                </Link>
            )}

            {/* Wishlist button — animated heart */}
            <motion.button
                onClick={handleWishlist}
                whileTap={prefersReducedMotion ? {} : { scale: 0.8 }}
                transition={quickSpring}
                className="absolute right-3 top-3 sm:right-4 sm:top-4 z-10 flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-[var(--bg-surface)]/90 backdrop-blur-sm shadow-sm border border-[var(--border-subtle)] transition-colors hover:bg-[var(--bg-surface)] min-h-[44px] min-w-[44px]"
                aria-label={isWishlisted ? t('product.removedFromWishlist') : t('product.addedToWishlist')}
            >
                <motion.div
                    animate={isWishlisted ? { scale: [1, 1.3, 1] } : { scale: 1 }}
                    transition={quickSpring}
                >
                    <Heart
                        size={16}
                        className={isWishlisted ? 'fill-rose-500 text-rose-500' : 'text-[var(--text-tertiary)]'}
                    />
                </motion.div>
            </motion.button>
        </motion.div>
    )
}

export default ProductCard
