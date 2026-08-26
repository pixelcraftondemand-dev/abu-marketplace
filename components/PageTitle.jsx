'use client'
import { ArrowRightIcon } from 'lucide-react'
import Link from 'next/link'

const PageTitle = ({ heading, text, path = "/", linkText, eyebrow }) => {
    return (
        <div className="my-6">
            {eyebrow && (
                <p className="text-xs text-[var(--color-primary)] font-medium mb-1 uppercase tracking-wide">{eyebrow}</p>
            )}
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h2 className="text-2xl font-semibold text-[var(--text-primary)] sm:text-3xl">{heading}</h2>
                    {text && <p className="mt-1 text-sm text-[var(--text-muted)]">{text}</p>}
                </div>
                {linkText && (
                    <Link href={path} className="group inline-flex items-center gap-1.5 text-xs font-medium text-[var(--color-primary)] hover:underline transition">
                        {linkText}
                        <ArrowRightIcon size={12} className="transition-transform group-hover:translate-x-1" />
                    </Link>
                )}
            </div>
        </div>
    )
}

export default PageTitle
