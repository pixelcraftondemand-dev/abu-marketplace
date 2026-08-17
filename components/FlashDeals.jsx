'use client'
import { useTranslation } from '@/lib/i18n'
import { useFlashCountdown } from '@/lib/hooks/useFlashCountdown'

const FlashDeals = () => {
    const { t } = useTranslation()
    const { formatted } = useFlashCountdown()

    return (
        <div className="inline-flex items-center gap-2 rounded-full bg-[#1A1A1A] px-3 py-1 text-xs font-semibold text-white">
            <span className="animate-pulse">⚡</span>
            {t('flashDeals.endsIn')}
            <span className="rounded bg-[#C9A96E] px-1.5 py-0.5 font-mono text-[#1A1A1A]">
                {formatted}
            </span>
        </div>
    )
}

export default FlashDeals
