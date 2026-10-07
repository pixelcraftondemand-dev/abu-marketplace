"use client";

import { PlusIcon, SquarePenIcon, XIcon, ShieldCheck, Lock, Banknote, MessageCircle } from 'lucide-react';
import React, { useState } from 'react'
import AddressModal from './AddressModal';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { useAuth, useUser, Show } from '@clerk/nextjs'
import axios from 'axios';
import { fetchCart } from '@/lib/features/cart/cartSlice';
import CurrencyAmount from '@/components/CurrencyAmount'
import { useTranslation } from '@/lib/i18n'
import { isCashOnDeliveryAvailable, isFreeDelivery } from '@/lib/paymentOptions'
import { buildWhatsAppLink } from '@/lib/utils/whatsapp'

const OrderSummary = ({ totalPrice, items }) => {
    const { user } = useUser()
    const { getToken } = useAuth()
    const dispatch = useDispatch()
    const { t } = useTranslation()
    const router = useRouter();

    const addressList = useSelector(state => state.address.list);
    const selectedCountry = useSelector(state => state.preferences.selectedCountry);
    const codEnabled = isCashOnDeliveryAvailable();
    const deliveryFree = isFreeDelivery(totalPrice);

    const paymentMethod = 'COD';

    const [idempotencyKey] = useState(() =>
      typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`
    );
    const [selectedAddress, setSelectedAddress] = useState(null);
    const [showAddressModal, setShowAddressModal] = useState(false);
    const [couponCodeInput, setCouponCodeInput] = useState('');
    const [coupon, setCoupon] = useState('');
    const [placingOrder, setPlacingOrder] = useState(false);

    const sellerContacts = Array.from(items.reduce((contacts, item) => {
        const store = item.store;
        const key = store?.id || store?.username || store?.name;
        if (!key || !store?.whatsappNumber) return contacts;

        if (!contacts.has(key)) {
            contacts.set(key, { store, products: [] });
        }
        contacts.get(key).products.push(item);
        return contacts;
    }, new Map()).values()).map(({ store, products: sellerProducts }) => ({
        store,
        href: buildWhatsAppLink(
            store.whatsappNumber,
            [
                `Hi ${store.name || 'there'}, I have a question about these items in my ABU Marketplace cart:`,
                ...sellerProducts.map((item) => `• ${item.name} (quantity: ${item.quantity})`),
                'Please confirm availability, delivery, and cash-on-delivery options.',
            ].join('\n')
        ),
    })).filter((contact) => contact.href);

    const handleCouponCode = async (event) => {
        event.preventDefault();
        try {
            if(!user) return toast(t('checkout.loginToProceed'))
            const token = await getToken();
            const { data } = await axios.post('/api/coupon', {code: couponCodeInput}, {
                headers: { Authorization: `Bearer ${token}` }
            })
            setCoupon(data.coupon)
            toast.success(t('checkout.couponApplied'))
        } catch (error) {
            toast.error(error?.response?.data?.error || error.message)
        }
    }

    const handlePlaceOrder = async (e) => {
        e.preventDefault();
        if (placingOrder) return;
        setPlacingOrder(true);
        try {
            if(!user) return toast(t('checkout.loginToPlaceOrder'))
            if(!selectedAddress) return toast(t('checkout.selectAddressFirst'))
            const token = await getToken();
            const orderData = {
                addressId: selectedAddress.id,
                items,
                paymentMethod,
                idempotencyKey,
                country: selectedCountry,
            }
            if(coupon) orderData.couponCode = coupon.code

            const {data} = await axios.post('/api/orders', orderData, {
                headers: { Authorization: `Bearer ${token}` }
            })
            if(data.alreadyProcessed){
                toast.success(data.message || t('checkout.orderPlaced'))
                router.push('/order-confirmation')
                dispatch(fetchCart({getToken}))
                return
           }
           toast.success(data.message || t('checkout.orderPlaced'))
           router.push('/order-confirmation')
           dispatch(fetchCart({getToken}))
        } catch (error) {
            toast.error(error?.response?.data?.error || error.message)
        } finally {
            setPlacingOrder(false);
        }
    }

    return (
        <div className='w-full max-w-lg lg:max-w-[360px] lg:sticky lg:top-6 self-start'>
          <div className='bg-white border border-gray-100 rounded-2xl p-6 shadow-sm'>
            {/* Header */}
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                <Banknote size={16} className="text-green-700" />
              </div>
              <h2 className='text-base font-bold text-gray-900'>{t('checkout.paymentSummary')}</h2>
            </div>
            
            {/* Payment on delivery */}
            <div className='mb-5 rounded-xl border border-green-100 bg-green-50 p-3'>
                <div className='flex items-center gap-2'>
                    <Banknote size={17} className='text-green-700' />
                    <span className='text-sm font-semibold text-green-800'>{t('checkout.cod')}</span>
                </div>
                <p className='mt-1 text-xs leading-5 text-green-800/75'>
                    Place your order now and pay the seller when your items are delivered.
                </p>
            </div>

            {sellerContacts.length > 0 && (
                <div className='mb-5 rounded-xl border border-gray-100 bg-gray-50 p-3'>
                    <p className='text-xs font-semibold text-gray-700'>Questions before ordering?</p>
                    <p className='mt-1 text-xs text-gray-500'>Message a seller directly on WhatsApp to confirm availability and delivery.</p>
                    <div className='mt-2 flex flex-col gap-2'>
                        {sellerContacts.map(({ store, href }) => (
                            <a
                                key={store.id || store.username || store.name}
                                href={href}
                                target='_blank'
                                rel='noopener noreferrer'
                                className='inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-green-700'
                            >
                                <MessageCircle size={14} />
                                Contact {store.name || 'vendor'} on WhatsApp
                            </a>
                        ))}
                    </div>
                </div>
            )}

            {/* Address */}
            <div className='mb-5 pb-5 border-b border-gray-100'>
                <p className='text-gray-400 text-[10px] font-semibold mb-2.5 uppercase tracking-wider'>{t('checkout.address')}</p>
                {selectedAddress ? (
                    <div className='flex items-start justify-between gap-3 p-3 bg-gray-50 rounded-xl'>
                        <p className='text-sm text-gray-700 leading-relaxed'>{selectedAddress.name}, {selectedAddress.city}, {selectedAddress.state}, {selectedAddress.zip}</p>
                        <button onClick={() => setSelectedAddress(null)} className='text-gray-400 hover:text-[var(--color-primary)] transition-colors shrink-0 p-1'>
                            <SquarePenIcon size={14} />
                        </button>
                    </div>
                ) : (
                    <div>
                        {addressList.length > 0 && (
                            <select className='border border-gray-200 p-2.5 w-full my-2 outline-none rounded-xl text-sm bg-white focus:border-[var(--color-primary)] focus:ring-2 focus:ring-orange-500/10 transition-all' onChange={(e) => setSelectedAddress(addressList[e.target.value])}>
                                <option value="">{t('checkout.selectAddress')}</option>
                                {addressList.map((address, index) => (
                                    <option key={index} value={index}>{address.name}, {address.city}, {address.state}, {address.zip}</option>
                                ))}
                            </select>
                        )}
                        <button className='flex items-center gap-1.5 text-sm text-[var(--color-primary)] font-semibold mt-1.5 hover:underline transition-colors' onClick={() => setShowAddressModal(true)}>
                            <PlusIcon size={14} />
                            {t('checkout.addAddress')}
                        </button>
                    </div>
                )}
            </div>

            {/* Totals */}
            <div className='space-y-2.5 mb-5 pb-5 border-b border-gray-100'>
                <div className='flex justify-between text-sm'>
                    <span className='text-gray-500'>{t('checkout.subtotal')}</span>
                    <span className='text-gray-800 font-semibold tabular-nums'><CurrencyAmount amount={totalPrice} /></span>
                </div>
                <div className='flex justify-between text-sm'>
                    <span className='text-gray-500'>{t('checkout.delivery')}</span>
                    <span className='text-gray-800 font-semibold'>
                        <Show when={(has) => has({ plan: 'plus' })} fallback={<span className={deliveryFree ? 'text-green-600' : ''}>{deliveryFree ? 'Free' : <CurrencyAmount amount={5} />}</span>}>
                            {t('checkout.free')}
                        </Show>
                    </span>
                </div>
                {coupon && (
                    <div className='flex justify-between text-sm'>
                        <span className='text-gray-500'>Coupon discount</span>
                        <span className='text-green-600 font-semibold'>-<CurrencyAmount amount={(coupon.discount / 100 * totalPrice) * -1} /></span>
                    </div>
                )}
            </div>

            {/* Coupon */}
            {!coupon ? (
                <form onSubmit={e => toast.promise(handleCouponCode(e), { loading: t('checkout.checkingCoupon') })} className='flex gap-2 mb-5'>
                    <input
                        onChange={(e) => setCouponCodeInput(e.target.value)}
                        value={couponCodeInput}
                        type="text"
                        placeholder={t('checkout.couponCode')}
                        className='border border-gray-200 px-3 py-2.5 rounded-xl flex-1 outline-none text-sm bg-white focus:border-[var(--color-primary)] focus:ring-2 focus:ring-orange-500/10 transition-all'
                    />
                    <button className='bg-gray-900 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-800 transition-all duration-200 active:scale-95'>
                        {t('checkout.apply')}
                    </button>
                </form>
            ) : (
                <div className='flex items-center justify-between text-xs mb-5 p-3 bg-green-50 rounded-xl border border-green-100'>
                    <span className='text-green-700 font-medium'>✓ {t('checkout.code')} <span className='font-bold ml-1'>{coupon.code.toUpperCase()}</span> — {coupon.description}</span>
                    <button onClick={() => setCoupon('')} className='text-gray-400 hover:text-red-500 transition-colors p-1'>
                        <XIcon size={14} />
                    </button>
                </div>
            )}

            {/* Total */}
            <div className='flex justify-between items-center mb-5'>
                <span className='text-sm font-semibold text-gray-700'>{t('checkout.total')}</span>
                <span className='text-xl font-bold text-gray-900 tabular-nums'>
                    <Show when={(has) => has({ plan: 'plus' })} fallback={<span><CurrencyAmount amount={coupon ? (totalPrice + (deliveryFree ? 0 : 5) - (coupon.discount / 100 * totalPrice)) : (totalPrice + (deliveryFree ? 0 : 5))} /></span>}>
                        <CurrencyAmount amount={coupon ? (totalPrice - (coupon.discount / 100 * totalPrice)) : totalPrice} />
                    </Show>
                </span>
            </div>

            {/* Place Order Button */}
            <button
                onClick={e => toast.promise(handlePlaceOrder(e), { loading: t('checkout.placingOrder') })}
                disabled={!codEnabled || placingOrder}
                className='w-full bg-[var(--color-primary)] text-white py-3.5 rounded-xl text-sm font-bold uppercase tracking-wide transition-all duration-200 hover:bg-[var(--color-primary-hover)] hover:shadow-lg hover:shadow-orange-500/25 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:transform-none disabled:hover:shadow-none flex items-center justify-center gap-2'
            >
                <Lock size={14} />
                {t('checkout.placeOrder')}
            </button>

            {/* Payment Trust */}
            <div className="flex items-center justify-center gap-5 mt-4 pt-4 border-t border-gray-100">
                <span className="text-[10px] text-gray-400 flex items-center gap-1 font-medium">
                    <ShieldCheck size={12} className="text-green-500" />
                    Secure
                </span>
                <span className="text-[10px] text-gray-400 flex items-center gap-1 font-medium">
                    <Lock size={12} className="text-[var(--color-primary)]" />
                    SSL Encrypted
                </span>
                <span className="text-[10px] text-gray-400 flex items-center gap-1 font-medium">
                    <span className="text-green-500">✓</span>
                    Safe Payment
                </span>
            </div>
          </div>

          {showAddressModal && <AddressModal setShowAddressModal={setShowAddressModal} />}
        </div>
    )
}

export default OrderSummary
