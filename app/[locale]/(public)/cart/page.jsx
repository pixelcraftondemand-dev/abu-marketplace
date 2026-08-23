'use client'
import Counter from "@/components/Counter";
import OrderSummary from "@/components/OrderSummary";
import PageTitle from "@/components/PageTitle";
import { deleteItemFromCart } from "@/lib/features/cart/cartSlice";
import { Trash2Icon, Truck, BadgeCheck, ShoppingBag, Sparkles } from "lucide-react";
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

    const createCartArray = () => {
        let total = 0;
        let saved = 0;
        const cartArray = [];
        for (const [key, value] of Object.entries(cartItems)) {
            const product = products.find(product => product.id === key);
            if (product) {
                cartArray.push({
                    ...product,
                    quantity: value,
                });
                total += product.price * value;
                // Jumia-style savings: the gap between the list price (mrp) and
                // the discounted price you're actually paying.
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
        dispatch(deleteItemFromCart({ productId }))
    }

    useEffect(() => {
        if (products.length > 0) {
            createCartArray();
        }
    }, [cartItems, products]);

    // Free-delivery progress — Shein-style nudge toward the shared threshold.
    const deliveryFree = totalPrice >= FREE_DELIVERY_THRESHOLD;
    const remainingForFree = Math.max(0, FREE_DELIVERY_THRESHOLD - totalPrice);
    const progressPct = Math.min(100, Math.round((totalPrice / FREE_DELIVERY_THRESHOLD) * 100));

    return cartArray.length > 0 ? (
        <div className="min-h-screen mx-6 text-slate-800">

            <div className="max-w-7xl mx-auto ">
                {/* Title */}
                <PageTitle heading={t('cart.title')} text={t('cart.subtitle')} linkText={t('cart.addMore')} />

                <div className="flex items-start justify-between gap-5 max-lg:flex-col">

                    <div className="w-full max-w-4xl">
                        {/* ── Free-delivery progress bar ── */}
                        <div className="mb-5 rounded-2xl border border-[var(--border-primary)] bg-[var(--bg-surface)] p-4 shadow-sm">
                            <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                                <Truck size={16} className="shrink-0 text-[var(--accent)]" />
                                {deliveryFree ? (
                                    <span className="flex items-center gap-1.5 text-green-700">
                                        <Sparkles size={15} />
                                        {t('cart.freeDeliveryUnlocked')}
                                    </span>
                                ) : (
                                    <span>
                                        {t('cart.freeDeliveryProgress')} <CurrencyAmount amount={remainingForFree} />
                                        <Link href="/shop" className="ml-2 text-xs font-semibold text-[var(--accent)] hover:text-[var(--accent-hover)]">
                                            {t('cart.freeDeliveryCta')} →
                                        </Link>
                                    </span>
                                )}
                            </div>
                            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                                <div
                                    className={`h-full rounded-full transition-all duration-500 ${deliveryFree ? 'bg-green-500' : 'bg-[var(--accent)]'}`}
                                    style={{ width: `${progressPct}%` }}
                                />
                            </div>
                            <p className="mt-2 text-xs text-slate-400">
                                {t('cart.freeDeliveryThreshold')} <CurrencyAmount amount={FREE_DELIVERY_THRESHOLD} />
                            </p>
                        </div>

                        {/* ── Savings summary (when discounts are in play) ── */}
                        {savings > 0 && (
                            <div className="mb-5 flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm">
                                <span className="flex items-center gap-2 font-medium text-amber-800">
                                    <Sparkles size={16} />
                                    {t('cart.youSaved')} <CurrencyAmount amount={savings} />
                                </span>
                            </div>
                        )}

                        {/* ── Line items — card rows instead of a table ── */}
                        <div className="flex flex-col gap-4">
                            {
                                cartArray.map((item, index) => (
                                    <div key={index} className="flex gap-4 rounded-2xl border border-[var(--border-primary)] bg-[var(--bg-surface)] p-4 shadow-sm">
                                        <Link href={`/product/${item.id}`} className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100">
                                            <Image src={item.images?.[0] || item.image} className="h-full w-full object-contain p-2" alt={item.name} width={96} height={96} />
                                        </Link>
                                        <div className="flex min-w-0 flex-1 flex-col justify-between gap-2">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <Link href={`/product/${item.id}`} className="line-clamp-2 text-sm font-semibold text-[var(--text-primary)] hover:text-[var(--accent)]">
                                                        {item.name}
                                                    </Link>
                                                    <p className="mt-0.5 text-xs text-slate-400">{item.category}</p>
                                                    {item.store?.name && (
                                                        <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-slate-500">
                                                            <BadgeCheck size={12} className="text-[var(--accent)]" />
                                                            {item.store.name}
                                                        </span>
                                                    )}
                                                </div>
                                                <button onClick={() => handleDeleteItemFromCart(item.id)} aria-label={t('cart.remove')} className="shrink-0 rounded-full p-2 text-red-500 transition hover:bg-red-50 active:scale-95">
                                                    <Trash2Icon size={17} />
                                                </button>
                                            </div>
                                            <div className="flex flex-wrap items-end justify-between gap-3">
                                                <div className="flex items-center gap-3">
                                                    <Counter productId={item.id} />
                                                    <div className="text-sm">
                                                        {item.mrp && item.mrp > item.price && (
                                                            <span className="mr-2 text-xs text-slate-400 line-through"><CurrencyAmount amount={item.mrp} /></span>
                                                        )}
                                                        <span className="font-semibold text-slate-800"><CurrencyAmount amount={item.price * item.quantity} /></span>
                                                    </div>
                                                </div>
                                                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-500">
                                                    <CurrencyAmount amount={item.price} /> {t('cart.each')}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            }
                        </div>
                    </div>
                    <OrderSummary totalPrice={totalPrice} items={cartArray} />
                </div>
            </div>
        </div>
    ) : (
        <div className="min-h-[80vh] mx-6 flex items-center justify-center text-slate-400">
            <div className="text-center">
                <ShoppingBag size={40} className="mx-auto mb-4 text-slate-300" />
                <h1 className="text-2xl sm:text-4xl font-semibold">{t('cart.empty')}</h1>
                <Link href="/shop" className="mt-6 inline-block rounded-full bg-[var(--accent)] px-8 py-3 text-sm font-medium text-white transition hover:bg-[var(--accent-hover)]">
                    {t('cart.freeDeliveryCta')}
                </Link>
            </div>
        </div>
    )
}
