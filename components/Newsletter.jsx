'use client'
import React from 'react'
import { useTranslation } from '@/lib/i18n'

const Newsletter = () => {
    const { t } = useTranslation()
    return (
        <div className="flex flex-col items-center justify-center text-center space-y-2 pt-8 pb-14 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h1 className="md:text-4xl text-2xl font-medium text-gray-900">
                {t('newsletter.title')}
            </h1>
            <p className="md:text-base text-gray-500/80 pb-8 max-w-xl">
                {t('newsletter.description')}
            </p>
            <div className="flex items-center justify-between max-w-2xl w-full md:h-14 h-12">
                <input
                    className="border border-gray-500/30 rounded-md h-full border-r-0 outline-none w-full rounded-r-none px-3 text-gray-500"
                    type="text"
                    placeholder={t('newsletter.placeholder')}
                />
                <button className="md:px-12 px-8 h-full text-white bg-orange-600 rounded-md rounded-l-none hover:bg-orange-700 transition-colors duration-200">
                    {t('newsletter.cta')}
                </button>
            </div>
        </div>
    )
}

export default Newsletter
