'use client'
import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import React from 'react'
import { useTranslation } from '@/lib/i18n'

/**
 * Shared section header used across the homepage and content pages:
 * gold eyebrow + Playfair serif title + muted description, with an optional
 * "view all" link. Keeps every section's header visually identical.
 */
const Title = ({ title, description, visibleButton = true, href = '', eyebrow }) => {
    const { t } = useTranslation()

    return (
        <div className='flex flex-col items-center text-center'>
            {eyebrow && (
                <p className='text-editorial mb-3 text-[#C9A96E]'>{eyebrow}</p>
            )}
            <h2 className='font-display text-3xl font-medium text-[#1A1A1A] sm:text-4xl'>{title}</h2>
            {description && (
                <p className='mt-3 max-w-xl text-sm leading-relaxed text-[#6B6560]'>{description}</p>
            )}
            {visibleButton && (
                <Link href={href} className='group mt-5 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-[#6B6560] transition hover:text-[#C9A96E]'>
                    <span className='border-b border-[#C9A96E]/40 pb-0.5'>{t('home.viewMore')}</span>
                    <ArrowRight size={14} className='transition-transform group-hover:translate-x-1' />
                </Link>
            )}
        </div>
    )
}

export default Title
