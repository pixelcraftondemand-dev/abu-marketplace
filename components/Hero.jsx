'use client'
import { assets } from '@/assets/assets'
import { ArrowRightIcon, ChevronRightIcon } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import React from 'react'
import CategoriesMarquee from './CategoriesMarquee'
import { useSelector } from 'react-redux'
import CurrencyAmount from '@/components/CurrencyAmount'
import { useTranslation } from '@/lib/i18n'

const Hero = () => {

    const { t } = useTranslation()

    return (
        <div className='mx-3 sm:mx-6'>
            <div className='mx-auto my-4 flex max-w-7xl flex-col gap-4 xl:flex-row xl:gap-6'>
                <div className='group relative flex flex-1 flex-col overflow-hidden rounded-[1.5rem] bg-[linear-gradient(135deg,#e8f8df_0%,#f9fce9_100%)] md:min-h-[280px] lg:min-h-[340px]'>
                    <div className='relative z-10 flex h-full flex-col justify-between p-5 sm:p-8 lg:p-10'>
                        <div>
                            <div className='inline-flex items-center gap-3 rounded-full bg-green-300/80 p-1 pr-4 text-xs text-green-700 sm:text-sm'>
                                <span className='ml-1 rounded-full bg-green-600 px-3 py-1 text-xs text-white'>{t('hero.news')}</span> {t('hero.freeDelivery')} <CurrencyAmount amount={500} />
                                <ChevronRightIcon className='transition-all group-hover:ml-1' size={16} />
                            </div>
                            <h2 className='my-3 max-w-[14rem] bg-gradient-to-r from-slate-700 to-[#7fbf4b] bg-clip-text text-3xl font-medium leading-tight text-transparent sm:max-w-md sm:text-4xl'>
                                {t('hero.headline')}
                            </h2>
                            <div className='mt-4 text-sm font-medium text-slate-700 sm:mt-6'>
                                <p>{t('hero.startsFrom')}</p>
                                <p className='text-2xl sm:text-3xl'><CurrencyAmount amount={4.9} /></p>
                            </div>
                        </div>
                        <div className='mt-5 flex flex-wrap gap-2'>
                            {['hero.phones','hero.audio','hero.home'].map((key) => (
                                <span key={key} className='rounded-full border border-slate-300/70 bg-white/80 px-3 py-1 text-xs font-medium text-slate-700'>
                                    {t(key)}
                                </span>
                            ))}
                        </div>
                        <Link href="/shop" className='mt-4 inline-flex w-fit items-center gap-2 rounded-md bg-slate-800 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-slate-900 sm:mt-6 sm:px-8 sm:py-3'>{t('hero.shopNow')} <ArrowRightIcon className='size-4' /></Link>
                    </div>
                    <Image className='mt-4 w-full max-w-[180px] self-center object-contain sm:absolute sm:bottom-0 sm:right-4 sm:mt-0 sm:max-w-[240px] lg:max-w-[280px]' src={assets.hero_model_img} alt="Featured gadget offers" priority />
                </div>
                <div className='flex w-full flex-col gap-3 text-sm text-slate-600 md:flex-row xl:max-w-[320px] xl:flex-col'>
                    <Link href="/shop" className='group flex flex-1 items-center justify-between rounded-[1.5rem] bg-orange-200 p-4 sm:p-5'>
                        <div>
                            <p className='max-w-36 bg-gradient-to-r from-slate-800 to-[#FFAD51] bg-clip-text text-2xl font-medium text-transparent sm:text-3xl'>{t('hero.bestProducts')}</p>
                            <p className='mt-3 flex items-center gap-1'>{t('hero.viewMore')} <ArrowRightIcon className='transition-all group-hover:ml-1' size={18} /> </p>
                        </div>
                        <Image className='w-24 sm:w-28' src={assets.hero_product_img1} alt="" />
                    </Link>
                    <Link href="/shop?deals=flash" className='group flex flex-1 items-center justify-between rounded-[1.5rem] bg-blue-200 p-4 sm:p-5'>
                        <div>
                            <p className='max-w-36 bg-gradient-to-r from-slate-800 to-[#78B2FF] bg-clip-text text-2xl font-medium text-transparent sm:text-3xl'>{t('hero.discounts')}</p>
                            <p className='mt-3 flex items-center gap-1'>{t('hero.viewMore')} <ArrowRightIcon className='transition-all group-hover:ml-1' size={18} /> </p>
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