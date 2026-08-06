"use client";

import { PlusIcon, SquarePenIcon, XIcon } from 'lucide-react';
import React, { useEffect, useState } from 'react'
import AddressModal from './AddressModal';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { useAuth, useUser, Show } from '@clerk/nextjs'
import axios from 'axios';
import { fetchCart } from '@/lib/features/cart/cartSlice';
import CurrencyAmount from '@/components/CurrencyAmount'
import useWalletBalance from '@/lib/hooks/useWalletBalance'
import { useTranslation } from '@/lib/i18n'
import { isCashOnDeliveryAvailable } from '@/lib/paymentOptions'

const OrderSummary = ({ totalPrice, items }) => {

    const { user } = useUser()
    const { getToken } = useAuth()
    const dispatch = useDispatch()
    const { t } = useTranslation()

    const router = useRouter();

    const addressList = useSelector(state => state.address.list);
    const selectedCountry = useSelector(state => state.preferences.selectedCountry);
    const codEnabled = isCashOnDeliveryAvailable();

    const [paymentMethod, setPaymentMethod] = useState('COD');
    const { balance: walletBalance, loading: walletLoading } = useWalletBalance();

    useEffect(() => {
        if (!codEnabled && paymentMethod === 'COD') {
            setPaymentMethod('STRIPE');
        }
    }, [codEnabled, paymentMethod]);

    // Stable per-checkout idempotency key: a network timeout + retry reuses
    // this key, so the backend can never create a second charge/debit.
    const [idempotencyKey] = useState(() =>
      typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`
    );
    const [selectedAddress, setSelectedAddress] = useState(null);
    const [showAddressModal, setShowAddressModal] = useState(false);
    const [couponCodeInput, setCouponCodeInput] = useState('');
    const [coupon, setCoupon] = useState('');

    const handleCouponCode = async (event) => {
        event.preventDefault();
        try {
            if(!user){
                return toast(t('checkout.loginToProceed'))
            }
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
        try {
            if(!user){
                return toast(t('checkout.loginToPlaceOrder'))
            }
            if(!selectedAddress){
                return toast(t('checkout.selectAddressFirst'))
            }
            const token = await getToken();

            const orderData = {
                addressId: selectedAddress.id,
                items,
                paymentMethod,
                idempotencyKey,
                country: selectedCountry,
            }

            if(coupon){
                orderData.couponCode = coupon.code
            }
           // create order
           const {data} = await axios.post('/api/orders', orderData, {
            headers: { Authorization: `Bearer ${token}` }
           })

           if(data.alreadyProcessed){
            // Retry of a checkout that already succeeded — no duplicate charge.
            toast.success(data.message || t('checkout.orderPlaced'))
            router.push('/orders')
            dispatch(fetchCart({getToken}))
            return
           }

           if(paymentMethod === 'STRIPE'){
            window.location.href = data.session.url;
           }else{
            toast.success(data.message || t('checkout.orderPlaced'))
            router.push('/orders')
            dispatch(fetchCart({getToken}))
           }

        } catch (error) {
            toast.error(error?.response?.data?.error || error.message)
        }

        
    }

    return (
        <div className='w-full max-w-lg lg:max-w-[340px] bg-slate-50/30 border border-slate-200 text-slate-500 text-sm rounded-xl p-7'>
            <h2 className='text-xl font-medium text-slate-600'>{t('checkout.paymentSummary')}</h2>
            <p className='text-slate-400 text-xs my-4'>{t('checkout.paymentMethod')}</p>
            <div className='flex gap-2 items-center'>
                <input type="radio" id="COD" onChange={() => setPaymentMethod('COD')} checked={paymentMethod === 'COD'} className='accent-gray-500' disabled={!codEnabled} />
                <label htmlFor="COD" className={`cursor-pointer ${!codEnabled ? 'text-slate-400' : ''}`}>{t('checkout.cod')}</label>
            </div>
            <div className='flex gap-2 items-center mt-1'>
                <input type="radio" id="STRIPE" name='payment' onChange={() => setPaymentMethod('STRIPE')} checked={paymentMethod === 'STRIPE'} className='accent-gray-500' />
                <label htmlFor="STRIPE" className='cursor-pointer'>{t('checkout.stripePayment')}</label>
            </div>
            <div className='flex gap-2 items-center mt-1'>
                <input type="radio" id="WALLET" name='payment' onChange={() => setPaymentMethod('WALLET')} checked={paymentMethod === 'WALLET'} className='accent-gray-500' disabled={walletLoading} />
                <label htmlFor="WALLET" className='cursor-pointer'>
                    {t('wallet.payWithWallet')}
                    {!walletLoading && walletBalance != null && (
                        <span className='ml-1.5 text-xs text-slate-400'>(<CurrencyAmount amount={walletBalance} />)</span>
                    )}
                </label>
            </div>
            {paymentMethod === 'WALLET' && !walletLoading && walletBalance != null && walletBalance < totalPrice && (
                <p className='mt-1 text-xs text-red-500'>{t('wallet.balanceTooLow')}</p>
            )}
            <div className='my-4 py-4 border-y border-slate-200 text-slate-400'>
                <p>{t('checkout.address')}</p>
                {
                    selectedAddress ? (
                        <div className='flex gap-2 items-center'>
                            <p>{selectedAddress.name}, {selectedAddress.city}, {selectedAddress.state}, {selectedAddress.zip}</p>
                            <SquarePenIcon onClick={() => setSelectedAddress(null)} className='cursor-pointer' size={18} />
                        </div>
                    ) : (
                        <div>
                            {
                                addressList.length > 0 && (
                                    <select className='border border-slate-400 p-2 w-full my-3 outline-none rounded' onChange={(e) => setSelectedAddress(addressList[e.target.value])} >
                                        <option value="">{t('checkout.selectAddress')}</option>
                                        {
                                            addressList.map((address, index) => (
                                                <option key={index} value={index}>{address.name}, {address.city}, {address.state}, {address.zip}</option>
                                            ))
                                        }
                                    </select>
                                )
                            }
                            <button className='flex items-center gap-1 text-slate-600 mt-1' onClick={() => setShowAddressModal(true)} >{t('checkout.addAddress')} <PlusIcon size={18} /></button>
                        </div>
                    )
                }
            </div>
            <div className='pb-4 border-b border-slate-200'>
                <div className='flex justify-between'>
                    <div className='flex flex-col gap-1 text-slate-400'>
                        <p>{t('checkout.subtotal')}</p>
                        <p>{t('checkout.delivery')}</p>
                        {coupon && <p>{t('checkout.coupon')}</p>}
                    </div>
                    <div className='flex flex-col gap-1 font-medium text-right'>
                        <p><CurrencyAmount amount={totalPrice} /></p>
                        <p>
                            <Show when={(has) => has({ plan: 'plus' })} fallback={<span><CurrencyAmount amount={5} /></span>}>
                                {t('checkout.free')}
                            </Show>
                        </p>
                        {coupon && <p>{`-`}<CurrencyAmount amount={(coupon.discount / 100 * totalPrice) * -1} /></p>}
                    </div>
                </div>
                {
                    !coupon ? (
                        <form onSubmit={e => toast.promise(handleCouponCode(e), { loading: t('checkout.checkingCoupon') })} className='flex justify-center gap-3 mt-3'>
                            <input onChange={(e) => setCouponCodeInput(e.target.value)} value={couponCodeInput} type="text" placeholder={t('checkout.couponCode')} className='border border-slate-400 p-1.5 rounded w-full outline-none' />
                            <button className='bg-slate-600 text-white px-3 rounded hover:bg-slate-800 active:scale-95 transition-all'>{t('checkout.apply')}</button>
                        </form>
                    ) : (
                        <div className='w-full flex items-center justify-center gap-2 text-xs mt-2'>
                            <p>{t('checkout.code')} <span className='font-semibold ml-1'>{coupon.code.toUpperCase()}</span></p>
                            <p>{coupon.description}</p>
                            <XIcon size={18} onClick={() => setCoupon('')} className='hover:text-red-700 transition cursor-pointer' />
                        </div>
                    )
                }
            </div>
            <div className='flex justify-between py-4'>
                <p>{t('checkout.total')}</p>
                <p className='font-medium text-right'>
                    <Show when={(has) => has({ plan: 'plus' })} fallback={<span><CurrencyAmount amount={coupon ? (totalPrice + 5 - (coupon.discount / 100 * totalPrice)) : (totalPrice + 5)} /></span>}>
                        <CurrencyAmount amount={coupon ? (totalPrice - (coupon.discount / 100 * totalPrice)) : totalPrice} />
                    </Show>
                </p>
            </div>
            <button onClick={e => toast.promise(handlePlaceOrder(e), { loading: t('checkout.placingOrder') })} disabled={paymentMethod === 'WALLET' && !walletLoading && walletBalance != null && walletBalance < totalPrice} className='w-full bg-slate-700 text-white py-2.5 rounded hover:bg-slate-900 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed'>{t('checkout.placeOrder')}</button>

            {showAddressModal && <AddressModal setShowAddressModal={setShowAddressModal} />}

        </div>
    )
}

export default OrderSummary
