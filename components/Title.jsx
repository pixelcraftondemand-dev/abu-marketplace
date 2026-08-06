'use client'
import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import React from 'react'
import { useTranslation } from '@/lib/i18n'

const Title = ({ title, description, visibleButton = true, href = '' }) => {
    const { t } = useTranslation()

    return (
        <div className='flex flex-col items-center text-center'>
            <h2 className='text-xl font-semibold text-slate-800 sm:text-2xl'>{title}</h2>
            <Link href={href} className='mt-2 flex items-center gap-3 text-sm text-slate-600'>
                <p className='max-w-lg'>{description}</p>
                {visibleButton && <span className='flex items-center gap-1 text-green-600'>{t('home.viewMore')} <ArrowRight size={14} /></span>}
            </Link>
        </div>
    )
}

export default Title