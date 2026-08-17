'use client'
import { ArrowRightIcon } from 'lucide-react'
import Link from 'next/link'

const PageTitle = ({ heading, text, path = "/", linkText, eyebrow }) => {
    return (
        <div className="my-8">
            {eyebrow && (
                <p className="text-editorial mb-2 text-[#C9A96E]">{eyebrow}</p>
            )}
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h2 className="font-display text-3xl font-medium text-[#1A1A1A] sm:text-4xl">{heading}</h2>
                    {text && <p className="mt-2 text-sm text-[#6B6560]">{text}</p>}
                </div>
                {linkText && (
                    <Link href={path} className="group inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.2em] text-[#6B6560] transition hover:text-[#C9A96E]">
                        {linkText}
                        <ArrowRightIcon size={14} className="transition-transform group-hover:translate-x-1" />
                    </Link>
                )}
            </div>
        </div>
    )
}

export default PageTitle
