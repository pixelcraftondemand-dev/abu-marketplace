'use client'

import Link from 'next/link'
import { MessageCircle } from 'lucide-react'
import { useTranslation } from '@/lib/i18n'
import { buildWhatsAppSignupLink } from '@/lib/utils/whatsapp'

const Newsletter = () => {
    const { t } = useTranslation()
    const signupLink = buildWhatsAppSignupLink()

    if (!signupLink) return null

    return (
        <section className="flex flex-col items-center justify-center text-center space-y-3 pt-8 pb-14 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="md:text-4xl text-2xl font-medium text-gray-900">
                {t('newsletter.title')}
            </h2>
            <p className="md:text-base text-gray-500/80 max-w-xl">
                {t('newsletter.description')}
            </p>
            <a
                href={signupLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#25D366] px-6 py-3 font-semibold text-[#0B3D2E] transition-colors hover:bg-[#1fbd5b]"
            >
                <MessageCircle size={18} aria-hidden="true" />
                {t('newsletter.cta')}
            </a>
            <p className="text-xs text-gray-500">
                {t('newsletter.consent')} {' '}
                <Link href="/privacy-policy" className="underline underline-offset-2 hover:text-gray-800">
                    {t('newsletter.privacy')}
                </Link>
            </p>
        </section>
    )
}

export default Newsletter
