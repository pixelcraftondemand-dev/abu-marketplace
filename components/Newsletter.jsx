'use client'
import React from 'react'
import Title from './Title'
import { useTranslation } from '@/lib/i18n'

const Newsletter = () => {
    const { t } = useTranslation()
    return (
        <div className='flex flex-col items-center mx-4 my-24'>
            <Title title={t('newsletter.title')} description={t('newsletter.description')} visibleButton={false} />
            <div className='flex bg-[var(--bg-surface)] text-sm p-1 rounded-full w-full max-w-xl my-10 border border-[var(--border-primary)] ring-1 ring-[var(--border-primary)] shadow-sm focus-within:ring-2 focus-within:ring-[var(--accent)]'>
                <input className='flex-1 pl-5 outline-none bg-transparent text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]' type="text" placeholder={t('newsletter.placeholder')} />
                <button className='font-medium bg-[var(--text-primary)] text-[var(--bg-primary)] px-7 py-3 rounded-full hover:bg-[var(--accent)] transition active:scale-95'>{t('newsletter.cta')}</button>
            </div>
        </div>
    )
}

export default Newsletter
