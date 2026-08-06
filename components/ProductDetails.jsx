'use client'

import { addToCart } from "@/lib/features/cart/cartSlice";
import { toggleWishlist } from "@/lib/features/wishlist/wishlistSlice";
import { getProductDiscount } from "@/lib/productUtils";
import { StarIcon, TagIcon, EarthIcon, CreditCardIcon, UserIcon, ShieldCheckIcon, RotateCcwIcon, TruckIcon, Heart } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Image from "next/image";
import Counter from "./Counter";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import CurrencyAmount from '@/components/CurrencyAmount'
import { useTranslation } from '@/lib/i18n'

const ProductDetails = ({ product }) => {

    const productId = product.id;
    const { t } = useTranslation();

    const cart = useSelector(state => state.cart.cartItems);
    const wishlistItems = useSelector(state => state.wishlist.items);
    const isWishlisted = wishlistItems.includes(productId);
    const dispatch = useDispatch();

    const router = useRouter()

    const [mainImage, setMainImage] = useState(product.images[0]);

    const addToCartHandler = () => {
        dispatch(addToCart({ productId }))
        toast.success(t('product.addedToCart'))
    }

    const buyNowHandler = () => {
        if (!cart[productId]) {
            dispatch(addToCart({ productId }))
        }
        router.push('/cart')
    }

    const wishlistHandler = () => {
        dispatch(toggleWishlist(productId))
        toast.success(isWishlisted ? t('product.removedFromWishlist') : t('product.addedToWishlist'))
    }

    const ratingCount = product.rating?.length || 0;
    const averageRating = ratingCount ? product.rating.reduce((acc, item) => acc + item.rating, 0) / ratingCount : 0;
    const discount = getProductDiscount(product);
    
    return (
        <div className="flex max-lg:flex-col gap-12">
            <div className="flex max-sm:flex-col-reverse gap-3">
                <div className="flex sm:flex-col gap-3">
                    {product.images.map((image, index) => (
                        <div key={index} onClick={() => setMainImage(product.images[index])} className="bg-slate-100 flex items-center justify-center size-26 rounded-lg group cursor-pointer">
                            <Image src={image} className="group-hover:scale-103 group-active:scale-95 transition" alt="" width={45} height={45} />
                        </div>
                    ))}
                </div>
                <div className="flex justify-center items-center h-100 sm:size-113 bg-slate-100 rounded-lg ">
                    <Image src={mainImage} alt="" width={250} height={250} />
                </div>
            </div>
            <div className="flex-1">
                <div className="mb-3 flex flex-wrap gap-2">
                    <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">{t('productDetails.verifiedSeller')}</span>
                    {product.halalCertified && (
                        <span className="inline-flex items-center gap-2 rounded-full border border-[#C9A96E]/30 bg-[#FFF7E8] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#8A6510]">
                            <span className="inline-flex h-2 w-2 rounded-full bg-[#C9A96E]" />
                            {t('categories.halalCertified')}
                        </span>
                    )}
                    {discount >= 15 && (
                        <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">{t('productDetails.flashDeal')}</span>
                    )}
                    {discount > 0 && discount < 15 && (
                        <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-medium text-orange-700">{t('productDetails.limitedDeal')}</span>
                    )}
                </div>
                <h1 className="text-3xl font-semibold text-slate-800">{product.name}</h1>
                <div className='flex items-center mt-2'>
                    {Array(5).fill('').map((_, index) => (
                        <StarIcon key={index} size={14} className='text-transparent mt-0.5' fill={averageRating >= index + 1 ? "#00C950" : "#D1D5DB"} />
                    ))}
                    <p className="text-sm ml-3 text-slate-500">{t('productDetails.reviews', { count: ratingCount })}</p>
                </div>
                <div className="flex items-start my-6 gap-3 text-2xl font-semibold text-slate-800">
                    <p> <CurrencyAmount amount={product.price} /> </p>
                    <p className="text-xl text-slate-500 line-through"><CurrencyAmount amount={product.mrp} /></p>
                </div>
                {discount > 0 && (
                    <div className="flex items-center gap-2 text-slate-500">
                        <TagIcon size={14} />
                        <p>{t('productDetails.saveNow', { percent: discount })}</p>
                    </div>
                )}
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <TruckIcon size={18} className="text-green-600" />
                        <p className="mt-2 text-sm font-medium text-slate-800">{t('productDetails.freeDelivery')}</p>
                        <p className="text-xs text-slate-500">{t('productDetails.onOrdersAbove')} <CurrencyAmount amount={500} /></p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <RotateCcwIcon size={18} className="text-green-600" />
                        <p className="mt-2 text-sm font-medium text-slate-800">{t('productDetails.sevenDayReturns')}</p>
                        <p className="text-xs text-slate-500">{t('productDetails.forEligibleItems')}</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <ShieldCheckIcon size={18} className="text-green-600" />
                        <p className="mt-2 text-sm font-medium text-slate-800">{t('productDetails.buyerSupport')}</p>
                        <p className="text-xs text-slate-500">{t('productDetails.helpWithOrders')}</p>
                    </div>
                </div>
                <div className="flex items-end gap-3 mt-10 flex-wrap">
                    {
                        cart[productId] && (
                            <div className="flex flex-col gap-3">
                                <p className="text-lg text-slate-800 font-semibold">{t('productDetails.quantity')}</p>
                                <Counter productId={productId} />
                            </div>
                        )
                    }
                    <button onClick={() => !cart[productId] ? addToCartHandler() : router.push('/cart')} className="bg-slate-800 text-white px-8 py-3 text-sm font-medium rounded hover:bg-slate-900 active:scale-95 transition">
                        {!cart[productId] ? t('productDetails.addToCart') : t('productDetails.viewCart')}
                    </button>
                    <button onClick={buyNowHandler} className="bg-green-600 text-white px-8 py-3 text-sm font-medium rounded hover:bg-green-700 active:scale-95 transition">
                        {t('productDetails.buyNow')}
                    </button>
                    <button onClick={wishlistHandler} className="flex items-center gap-2 rounded border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition">
                        <Heart size={16} className={isWishlisted ? 'fill-red-500 text-red-500' : ''} />
                        {isWishlisted ? t('productDetails.saved') : t('productDetails.save')}
                    </button>
                </div>
                <hr className="border-gray-300 my-5" />
                <div className="flex flex-col gap-4 text-slate-500">
                    <p className="flex gap-3"> <EarthIcon className="text-slate-400" /> {t('productDetails.freeDeliveryWorldwide')} </p>
                    <p className="flex gap-3"> <CreditCardIcon className="text-slate-400" /> {t('productDetails.securedPayment')} </p>
                    <p className="flex gap-3"> <UserIcon className="text-slate-400" /> {t('productDetails.trustedByBrands')} </p>
                </div>

            </div>
        </div>
    )
}

export default ProductDetails
