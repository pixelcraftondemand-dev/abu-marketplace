'use client'
import Link from 'next/link'
import { useTranslation } from '@/lib/i18n'
import { Headphones, Watch, Shirt, Home, Gamepad2, Gem, Baby, BookOpen } from 'lucide-react'

const categories = [
  { icon: Headphones, labelKey: 'categories.electronics', href: '/shop?category=electronics', gradient: 'from-blue-500 to-blue-600', bg: 'bg-blue-50' },
  { icon: Shirt, labelKey: 'categories.fashion', href: '/shop?category=fashion', gradient: 'from-purple-500 to-purple-600', bg: 'bg-purple-50' },
  { icon: Home, labelKey: 'categories.home', href: '/shop?category=home', gradient: 'from-emerald-500 to-emerald-600', bg: 'bg-emerald-50' },
  { icon: Watch, labelKey: 'categories.watches', href: '/shop?category=watches', gradient: 'from-amber-500 to-amber-600', bg: 'bg-amber-50' },
  { icon: Gem, labelKey: 'categories.accessories', href: '/shop?category=accessories', gradient: 'from-pink-500 to-pink-600', bg: 'bg-pink-50' },
  { icon: Gamepad2, labelKey: 'categories.gaming', href: '/shop?category=gaming', gradient: 'from-red-500 to-red-600', bg: 'bg-red-50' },
  { icon: Baby, labelKey: 'categories.beauty', href: '/shop?category=beauty', gradient: 'from-rose-500 to-rose-600', bg: 'bg-rose-50' },
  { icon: BookOpen, labelKey: 'categories.audio', href: '/shop?category=audio', gradient: 'from-indigo-500 to-indigo-600', bg: 'bg-indigo-50' },
]

const CategoryQuickLinks = () => {
  const { t } = useTranslation()

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
      <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2 sm:justify-center sm:gap-5">
        {categories.map((cat) => (
          <Link
            key={cat.href}
            href={cat.href}
            className="group flex flex-col items-center gap-2.5 min-w-[80px] sm:min-w-[90px]"
          >
            <span className={`flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl ${cat.bg} transition-all duration-300 group-hover:shadow-lg group-hover:scale-110 group-hover:-translate-y-0.5`}>
              <cat.icon size={24} strokeWidth={1.5} className="transition-transform duration-300 group-hover:scale-110" />
            </span>
            <span className="text-[11px] sm:text-xs font-medium text-gray-500 text-center leading-tight transition-colors duration-200 group-hover:text-gray-900 group-hover:font-semibold">
              {t(cat.labelKey)}
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}

export default CategoryQuickLinks
