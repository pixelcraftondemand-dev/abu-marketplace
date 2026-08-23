'use client'
import { StarIcon, Heart, ShoppingBag } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useDispatch, useSelector } from 'react-redux'
import toast from 'react-hot-toast'
import { addToCart } from '@/lib/features/cart/cartSlice'
import { toggleWishlist } from '@/lib/features/wishlist/wishlistSlice'
import { getProductDiscount, getProductRating } from '@/lib/productUtils'
import CurrencyAmount from '@/components/CurrencyAmount'
import { useTranslation } from '@/lib/i18n'

const ProductCard = ({ product, showQuickAdd = true }) => {
    const selectedCurrency = useSelector((state) => state.preferences.selectedCurrency)
    const { t } = useTranslation()
    const dispatch = useDispatch()
    const wishlistItems = useSelector((state) => state.wishlist.items)
    const isWishlisted = wishlistItems.includes(product.id)

    const { rating } = getProductRating(product)
    const discount = getProductDiscount(product)

    const handleWishlist = (e) => {
        e.preventDefault()
        e.stopPropagation()
        dispatch(toggleWishlist(product.id))
        toast.success(isWishlisted ? t('product.removedFromWishlist') : t('product.addedToWishlist'))
    }

    const handleQuickAdd = (e) => {
        e.preventDefault()
        e.stopPropagation()
        if (!product.inStock) {
            toast.error(t('product.outOfStock'))
            return
        }
        dispatch(addToCart({ productId: product.id }))
        toast.success(t('product.addedToCart'))
    }

    return (
        <div className="group relative mx-auto w-full min-w-0 max-w-[320px] overflow-hidden rounded-[28px] border border-black/[.07] bg-white p-2.5 shadow-[0_8px_30px_rgba(0,0,0,.04)] sm:p-3 transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_55px_rgba(15,23,42,0.15)]">
            <Link href={`/product/${product.id}`} className="block">
                <div className="relative aspect-square overflow-hidden rounded-[22px] bg-[#f5f5f7]">
                    {discount > 0 && (
                        <span className="absolute left-3 top-3 rounded-full bg-rose-500/95 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white shadow-sm">
                            -{discount}%
                        </span>
                    )}
                    {(product.halalCertified || product.badge) && (
                        <span className="absolute bottom-3 left-3 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/95 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-700 shadow-sm">
                            {product.halalCertified ? t('product.halalCertified') : product.badge}
                        </span>
                    )}
                    <span className="absolute right-3 top-3 rounded-full bg-white/95 px-3 py-1.5 text-[10px] font-semibold text-slate-700 shadow-sm">{t('product.freeDelivery')}</span>
                    <Image
                        width={500}
                        height={500}
                        className="h-full w-full object-contain p-5 transition duration-500 group-hover:scale-105"
                        src={product.images[0]}
                        alt={product.name}
                    />
                    {showQuickAdd && (
                        <button
                            onClick={handleQuickAdd}
                            className="absolute bottom-3 right-3 flex h-11 w-11 items-center justify-center rounded-full bg-[#0071e3] text-white shadow-lg transition hover:scale-105 hover:bg-[#0066cc]"
                            aria-label={t('product.quickAdd')}
                        >
                            <ShoppingBag size={18} />
                        </button>
                    )}
                </div>
                <div className="mt-3 min-w-0 px-1.5 pb-1 pt-1">
                    <div className="min-w-0">
                        <p className="min-w-0 overflow-hidden text-ellipsis [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] text-[13px] font-semibold leading-[1.25] text-[#1d1d1f]">{product.name}</p>
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
                        <p className="mt-2 text-[12px] text-slate-500">{t('product.easyReturns')}</p>
                    </div>
                    <div className="mt-3 rounded-[18px] border border-black/[.06] bg-[#f5f5f7] p-2.5">
                        <div className="flex items-center justify-between gap-2">
                            <div>
                                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{t('product.yourPrice')}</p>
                                <p className="mt-1 text-[15px] font-semibold tabular-nums text-[#1d1d1f]"><CurrencyAmount amount={product.price} /></p>
                            </div>
                            {discount > 0 ? (
                                <div className="text-right">
                                    <p className="text-[11px] text-slate-400 line-through"><CurrencyAmount amount={product.mrp} /></p>
                                    <p className="mt-1 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-700">{t('product.save', { percent: discount })}</p>
                                </div>
                            ) : (
                                <span className="rounded-full bg-slate-200 px-3 py-1 text-[11px] font-semibold text-slate-600">{t('product.popular')}</span>
                            )}
                        </div>
                    </div>
                </div>
            </Link>
            <button
                onClick={handleWishlist}
                className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm transition hover:scale-105"
                aria-label={isWishlisted ? t('product.removedFromWishlist') : t('product.addedToWishlist')}
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
