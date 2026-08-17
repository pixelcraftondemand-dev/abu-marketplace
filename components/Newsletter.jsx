'use client'
import React from 'react'
import Title from './Title'
import { useTranslation } from '@/lib/i18n'

const Newsletter = () => {
    const { t } = useTranslation()
    return (
        <div className='flex flex-col items-center mx-4 my-24'>
            <Title title={t('newsletter.title')} description={t('newsletter.description')} visibleButton={false} />
            <div className='flex bg-white text-sm p-1 rounded-full w-full max-w-xl my-10 border border-[#E8E2DB] ring-1 ring-[#E8E2DB] shadow-sm focus-within:ring-2 focus-within:ring-[#C9A96E]'>
                <input className='flex-1 pl-5 outline-none bg-transparent' type="text" placeholder={t('newsletter.placeholder')} />
                <button className='font-medium bg-[#1A1A1A] text-white px-7 py-3 rounded-full hover:bg-[#C9A96E] transition active:scale-95'>{t('newsletter.cta')}</button>
            </div>
        </div>
    )
}

export default Newsletter
