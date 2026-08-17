'use client'
import { useEffect, useState } from 'react'
import { useTranslation } from '@/lib/i18n'

function getTimeLeft() {
    const now = new Date()
    const end = new Date()
    end.setHours(23, 59, 59, 999)
    const diff = end - now
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((diff % (1000 * 60)) / 1000)
    return { hours, minutes, seconds }
}

const FlashDeals = () => {
    const { t } = useTranslation()
    const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 })

    useEffect(() => {
        const update = () => setTimeLeft(getTimeLeft())
        update()
        const timer = setInterval(update, 1000)
        return () => clearInterval(timer)
    }, [])

    const pad = (n) => String(n).padStart(2, '0')

    return (
        <div className="inline-flex items-center gap-2 rounded-full bg-[#1A1A1A] px-3 py-1 text-xs font-semibold text-white">
            <span className="animate-pulse">⚡</span>
            {t('flashDeals.endsIn')}
            <span className="rounded bg-[#C9A96E] px-1.5 py-0.5 font-mono text-[#1A1A1A]">
                {pad(timeLeft.hours)}:{pad(timeLeft.minutes)}:{pad(timeLeft.seconds)}
            </span>
        </div>
    )
}

export default FlashDeals
