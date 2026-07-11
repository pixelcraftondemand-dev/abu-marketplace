'use client'
import { useEffect, useState } from 'react'

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
    const [timeLeft, setTimeLeft] = useState(getTimeLeft)

    useEffect(() => {
        const timer = setInterval(() => setTimeLeft(getTimeLeft()), 1000)
        return () => clearInterval(timer)
    }, [])

    const pad = (n) => String(n).padStart(2, '0')

    return (
        <div className="inline-flex items-center gap-2 rounded-full bg-red-500 px-3 py-1 text-xs font-semibold text-white">
            <span className="animate-pulse">⚡</span>
            Flash Sale ends in
            <span className="rounded bg-red-600 px-1.5 py-0.5 font-mono">
                {pad(timeLeft.hours)}:{pad(timeLeft.minutes)}:{pad(timeLeft.seconds)}
            </span>
        </div>
    )
}

export default FlashDeals
