'use client'
import React from 'react'
import { useTranslation } from '@/lib/i18n'
import { Mail } from 'lucide-react'

const Newsletter = () => {
    const { t } = useTranslation()
    return (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 my-10 sm:my-14">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-blue-500 to-blue-700 p-8 sm:p-12 text-center">
                {/* Subtle pattern */}
                <div className="absolute inset-0 opacity-[0.05]" style={{
                    backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
                    backgroundSize: '20px 20px'
                }} />
                
                <div className="relative z-10">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-white/15 mb-4">
                        <Mail size={22} className="text-white" />
                    </div>
                    <h2 className='text-xl sm:text-2xl font-bold text-white tracking-tight'>{t('newsletter.title')}</h2>
                    <p className='text-sm text-white/60 mt-2 mb-6 max-w-md mx-auto leading-relaxed'>{t('newsletter.description')}</p>
                    <div className='flex bg-white text-sm p-1.5 rounded-xl w-full max-w-xl mx-auto shadow-xl shadow-black/10 focus-within:ring-2 focus-within:ring-white/30 transition-shadow duration-200'>
                        <input className='flex-1 px-4 outline-none bg-transparent text-gray-900 placeholder:text-gray-400 text-sm' type="text" placeholder={t('newsletter.placeholder')} />
                        <button className='font-semibold bg-[var(--color-primary)] text-white px-6 py-2.5 rounded-lg text-sm transition-all duration-200 hover:bg-[var(--color-primary-hover)] hover:shadow-lg active:scale-95'>{t('newsletter.cta')}</button>
                    </div>
                </div>
            </div>
        </section>
    )
}

export default Newsletter
