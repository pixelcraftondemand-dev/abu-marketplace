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
                <p className='text-editorial mb-2 text-[var(--accent)]'>{eyebrow}</p>
            )}
            <h2 className='font-display text-2xl font-bold text-[var(--text-primary)] sm:text-3xl'>{title}</h2>
            {description && (
                <p className='mt-2 max-w-xl text-sm text-[var(--text-secondary)]'>{description}</p>
            )}
            {visibleButton && (
                <Link href={href} className='group mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--accent)] transition hover:text-[var(--accent-hover)]'>
                    <span>{t('home.viewMore')}</span>
                    <ArrowRight size={14} className='transition-transform group-hover:translate-x-1' />
                </Link>
            )}
        </div>
    )
}

export default Title
