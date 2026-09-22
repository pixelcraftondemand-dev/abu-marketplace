'use client'
import { useTranslation } from '@/lib/i18n'
import { useFlashCountdown } from '@/lib/hooks/useFlashCountdown'

const FlashDeals = () => {
    const { t } = useTranslation()
    const { formatted, mounted } = useFlashCountdown()

    return (
        <div className="inline-flex items-center gap-2 rounded-full bg-gray-900 px-3.5 py-1.5 text-xs font-semibold text-white shadow-lg shadow-black/10">
            <span className="animate-pulse text-sm">⚡</span>
            {t('flashDeals.endsIn')}
            <span className="rounded-md bg-[var(--color-accent)] px-2 py-0.5 font-mono text-white tabular-nums">
                {mounted ? formatted : '--:--:--'}
            </span>
        </div>
    )
}

export default FlashDeals
