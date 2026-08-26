'use client'
import Counter from "@/components/Counter";
import OrderSummary from "@/components/OrderSummary";
import PageTitle from "@/components/PageTitle";
import { deleteItemFromCart } from "@/lib/features/cart/cartSlice";
import { Trash2Icon, Truck, BadgeCheck, ShoppingBag, Sparkles, ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import CurrencyAmount from '@/components/CurrencyAmount'
import { FREE_DELIVERY_THRESHOLD } from '@/lib/paymentOptions'
import { useTranslation } from '@/lib/i18n'

export default function Cart() {
    const { t } = useTranslation();
    const { cartItems } = useSelector(state => state.cart);
    const products = useSelector(state => state.product.list);
    const dispatch = useDispatch();

    const [cartArray, setCartArray] = useState([]);
    const [totalPrice, setTotalPrice] = useState(0);
    const [savings, setSavings] = useState(0);
    const [removing, setRemoving] = useState(null);

    const createCartArray = () => {
        let total = 0;
        let saved = 0;
        const cartArray = [];
        for (const [key, value] of Object.entries(cartItems)) {
            const product = products.find(product => product.id === key);
            if (product) {
                cartArray.push({ ...product, quantity: value });
                total += product.price * value;
                if (product.mrp && product.mrp > product.price) {
                    saved += (product.mrp - product.price) * value;
                }
            }
        }
        setTotalPrice(total);
        setSavings(saved);
        setCartArray(cartArray);
    }

    const handleDeleteItemFromCart = (productId) => {
        setRemoving(productId);
        setTimeout(() => {
            dispatch(deleteItemFromCart({ productId }));
            setRemoving(null);
        }, 300);
    }

    useEffect(() => {
        if (products.length > 0) createCartArray();
    }, [cartItems, products]);

    const deliveryFree = totalPrice >= FREE_DELIVERY_THRESHOLD;
    const remainingForFree = Math.max(0, FREE_DELIVERY_THRESHOLD - totalPrice);
    const progressPct = Math.min(100, Math.round((totalPrice / FREE_DELIVERY_THRESHOLD) * 100));

    if (cartArray.length === 0) {
        return (
            <div className="min-h-[80vh] flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-6">
                        <ShoppingBag size={40} className="text-gray-300" />
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">{t('cart.empty')}</h1>
                    <p className="text-sm text-gray-500 mt-2 mb-8">Looks like your cart is empty. Start shopping!</p>
                    <Link href="/shop" className="inline-flex items-center gap-2 bg-[var(--color-primary)] px-8 py-3.5 text-sm font-semibold text-white rounded-xl transition-all duration-200 hover:bg-[var(--color-primary-hover)] hover:shadow-lg hover:shadow-blue-500/20 hover:-translate-y-0.5 active:translate-y-0">
                        {t('cart.freeDeliveryCta')}
                        <ArrowRight size={16} />
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <PageTitle heading={t('cart.title')} text={t('cart.subtitle')} linkText={t('cart.addMore')} />

                <div className="flex items-start justify-between gap-6 max-lg:flex-col">
                    <div className="w-full max-w-4xl">
                        {/* Free delivery progress */}
                        <div className="mb-5 bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                            <div className="flex items-center gap-2.5 text-sm">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${deliveryFree ? 'bg-green-100' : 'bg-blue-100'}`}>
                                    <Truck size={16} className={deliveryFree ? 'text-green-600' : 'text-[var(--color-primary)]'} />
                                </div>
                                {deliveryFree ? (
                                    <span className="flex items-center gap-1.5 text-green-700 font-semibold">
                                        <Sparkles size={15} className="text-green-500" />
                                        {t('cart.freeDeliveryUnlocked')}
                                    </span>
                                ) : (
                                    <span className="text-gray-700">
                                        Add <span className="font-bold text-gray-900"><CurrencyAmount amount={remainingForFree} /></span> more for free delivery
                                        <Link href="/shop" className="ml-2 text-[var(--color-primary)] hover:underline font-semibold">
                                            Shop now →
                                        </Link>
                                    </span>
                                )}
                            </div>
                            <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100">
                                <div
                                    className={`h-full rounded-full transition-all duration-700 ease-out ${deliveryFree ? 'bg-gradient-to-r from-green-400 to-green-500' : 'bg-gradient-to-r from-blue-500 to-blue-600'}`}
                                    style={{ width: `${progressPct}%` }}
                                />
                            </div>
                            <p className="mt-2 text-xs text-gray-400">
                                Free delivery on orders over <CurrencyAmount amount={FREE_DELIVERY_THRESHOLD} />
                            </p>
                        </div>

                        {/* Savings banner */}
                        {savings > 0 && (
                            <div className="mb-5 flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm">
                                <span className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                                    <Sparkles size={16} className="text-amber-600" />
                                </span>
                                <span className="font-semibold text-amber-800">
                                    You're saving <CurrencyAmount amount={savings} /> on this order!
                                </span>
                            </div>
                        )}

                        {/* Line items */}
                        <div className="flex flex-col gap-3">
                            {cartArray.map((item) => (
                                <div
                                    key={item.id}
                                    className={`flex gap-5 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all duration-300 ${
                                        removing === item.id ? 'opacity-0 scale-95 -translate-x-4' : 'opacity-100'
                                    } hover:shadow-md hover:border-gray-200`}
                                >
                                    {/* Image */}
                                    <Link href={`/product/${item.id}`} className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gray-50 border border-gray-100 hover:bg-gray-100 transition-colors duration-200">
                                        <Image
                                            src={item.images?.[0] || item.image}
                                            className="h-full w-full object-contain p-2"
                                            alt={item.name}
                                            width={112}
                                            height={112}
                                        />
                                    </Link>

                                    {/* Details */}
                                    <div className="flex min-w-0 flex-1 flex-col justify-between">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <Link href={`/product/${item.id}`} className="line-clamp-2 text-sm font-semibold text-gray-800 hover:text-[var(--color-primary)] transition-colors duration-200 leading-snug">
                                                    {item.name}
                                                </Link>
                                                <p className="mt-1 text-xs text-gray-400 capitalize">{item.category}</p>
                                                {item.store?.name && (
                                                    <span className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-gray-500">
                                                        <BadgeCheck size={12} className="text-green-500" />
                                                        {item.store.name}
                                                    </span>
                                                )}
                                            </div>
                                            <button
                                                onClick={() => handleDeleteItemFromCart(item.id)}
                                                aria-label={t('cart.remove')}
                                                className="shrink-0 p-2 text-gray-300 rounded-lg transition-all duration-200 hover:bg-red-50 hover:text-red-500 active:scale-90"
                                            >
                                                <Trash2Icon size={16} />
                                            </button>
                                        </div>

                                        <div className="flex flex-wrap items-end justify-between gap-3 mt-3">
                                            <div className="flex items-center gap-4">
                                                <Counter productId={item.id} />
                                                <div className="text-sm">
                                                    {item.mrp && item.mrp > item.price && (
                                                        <span className="mr-2 text-xs text-gray-400 line-through tabular-nums"><CurrencyAmount amount={item.mrp} /></span>
                                                    )}
                                                    <span className="font-bold text-gray-900 tabular-nums">
                                                        <CurrencyAmount amount={item.price * item.quantity} />
                                                    </span>
                                                </div>
                                            </div>
                                            <span className="text-[11px] font-medium text-gray-400 tabular-nums">
                                                <CurrencyAmount amount={item.price} /> each
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <OrderSummary totalPrice={totalPrice} items={cartArray} />
                </div>
            </div>
        </div>
    );
}
