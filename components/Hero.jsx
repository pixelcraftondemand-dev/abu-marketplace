'use client'
import { assets } from '@/assets/assets'
import { ArrowRightIcon, ChevronRightIcon, Truck } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import React from 'react'
import CategoriesMarquee from './CategoriesMarquee'
import CurrencyAmount from '@/components/CurrencyAmount'
import { useTranslation } from '@/lib/i18n'
import { FREE_DELIVERY_THRESHOLD } from '@/lib/paymentOptions'

const Hero = () => {

    const { t } = useTranslation()

    return (
        <div className='mx-3 sm:mx-6'>
            <div className='mx-auto my-4 flex max-w-7xl flex-col gap-4 xl:flex-row xl:gap-6'>
                {/* Main feature — warm editorial panel on the brand cream/gold palette */}
                <div className='group relative flex flex-1 flex-col overflow-hidden rounded-3xl bg-[linear-gradient(135deg,#f5efe4_0%,#faf6ef_55%,#f3e9d8_100%)] md:min-h-[300px] lg:min-h-[360px]'>
                    <div className='relative z-10 flex h-full flex-col justify-between p-5 sm:p-8 lg:p-10'>
                        <div>
                            <div className='inline-flex items-center gap-3 rounded-full bg-white/80 p-1 pr-4 text-xs text-[#1A1A1A] shadow-sm ring-1 ring-[#E8E2DB] sm:text-sm'>
                                <span className='ml-1 rounded-full bg-[#C9A96E] px-3 py-1 text-xs font-semibold text-white'>{t('hero.news')}</span>
                                <span className='flex items-center gap-1.5'>
                                    <Truck size={14} className='text-[#A88B52]' />
                                    {t('hero.freeDelivery')} <CurrencyAmount amount={FREE_DELIVERY_THRESHOLD} />
                                </span>
                                <ChevronRightIcon className='transition-all group-hover:ml-1' size={16} />
                            </div>
                            <h2 className='my-3 max-w-md font-display text-3xl font-medium leading-tight text-[#1A1A1A] sm:max-w-md sm:text-4xl lg:text-[2.75rem]'>
                                {t('hero.headline')}
                            </h2>
                            <div className='mt-4 text-sm font-medium text-[#6B6560] sm:mt-6'>
                                <p className='text-editorial text-[#A88B52]'>{t('hero.startsFrom')}</p>
                                <p className='mt-1 text-2xl font-semibold text-[#1A1A1A] sm:text-3xl'><CurrencyAmount amount={4.9} /></p>
                            </div>
                        </div>
                        <div className='mt-5 flex flex-wrap gap-2'>
                            {['hero.phones','hero.audio','hero.home'].map((key) => (
                                <span key={key} className='rounded-full border border-[#E8E2DB] bg-white/80 px-3 py-1 text-xs font-medium text-[#6B6560]'>
                                    {t(key)}
                                </span>
                            ))}
                        </div>
                        <Link href="/shop" className='btn-luxury mt-4 w-fit sm:mt-6'>
                            <span className='flex items-center gap-2'>{t('hero.shopNow')} <ArrowRightIcon className='size-4' /></span>
                        </Link>
                    </div>
                    <Image className='mt-4 w-full max-w-[180px] self-center object-contain sm:absolute sm:bottom-0 sm:right-4 sm:mt-0 sm:max-w-[240px] lg:max-w-[280px]' src={assets.hero_model_img} alt="Featured gadget offers" priority />
                </div>
                {/* Side cards — brand-tinted panels */}
                <div className='flex w-full flex-col gap-3 text-sm text-slate-600 md:flex-row xl:max-w-[320px] xl:flex-col'>
                    <Link href="/shop" className='group flex flex-1 items-center justify-between rounded-3xl bg-[#f6ead8] p-4 ring-1 ring-[#E8E2DB] transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#C9A96E]/10 sm:p-5'>
                        <div>
                            <p className='font-display max-w-36 text-2xl font-medium text-[#1A1A1A] sm:text-3xl'>{t('hero.bestProducts')}</p>
                            <p className='mt-3 flex items-center gap-1 text-[#6B6560]'>{t('hero.viewMore')} <ArrowRightIcon className='transition-all group-hover:ml-1' size={18} /> </p>
                        </div>
                        <Image className='w-24 sm:w-28' src={assets.hero_product_img1} alt="" />
                    </Link>
                    <Link href="/shop?deals=flash" className='group flex flex-1 items-center justify-between rounded-3xl bg-[#e8e2f5] p-4 ring-1 ring-[#E8E2DB] transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#C9A96E]/10 sm:p-5'>
                        <div>
                            <p className='font-display max-w-36 text-2xl font-medium text-[#1A1A1A] sm:text-3xl'>{t('hero.discounts')}</p>
                            <p className='mt-3 flex items-center gap-1 text-[#6B6560]'>{t('hero.viewMore')} <ArrowRightIcon className='transition-all group-hover:ml-1' size={18} /> </p>
                        </div>
                        <Image className='w-24 sm:w-28' src={assets.hero_product_img2} alt="" />
                    </Link>
                </div>
            </div>
            <CategoriesMarquee />
        </div>
    )
}

export default Hero
