'use client'
import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { assets } from '@/assets/assets'
import CurrencyAmount from '@/components/CurrencyAmount'
import { useTranslation } from '@/lib/i18n'

const slides = [
  {
    id: 1,
    gradient: 'from-[#0A5FFF] via-[#1A6FFF] to-[#0848CC]',
    overlayPattern: true,
    headlineKey: 'hero.headline',
    subKey: 'hero.startsFrom',
    price: 4.9,
    tags: ['hero.phones', 'hero.audio', 'hero.home'],
    ctaKey: 'hero.shopNow',
    ctaHref: '/shop',
    image: assets.hero_model_img,
  },
  {
    id: 2,
    gradient: 'from-[#1A2B4C] via-[#1E3A5F] to-[#0D3B66]',
    overlayPattern: true,
    headlineKey: 'hero.bestProducts',
    subKey: 'hero.startsFrom',
    price: 9.9,
    tags: ['categories.electronics', 'categories.fashion'],
    ctaKey: 'hero.shopNow',
    ctaHref: '/shop?sort=popular',
    image: assets.hero_product_img1,
  },
  {
    id: 3,
    gradient: 'from-[#E8453C] via-[#EF5350] to-[#C62828]',
    overlayPattern: true,
    headlineKey: 'hero.discounts',
    subKey: 'hero.startsFrom',
    price: 2.9,
    tags: ['categories.watches', 'categories.accessories'],
    ctaKey: 'hero.shopNow',
    ctaHref: '/shop?deals=flash',
    image: assets.hero_product_img2,
  },
]

const Hero = () => {
  const { t } = useTranslation()
  const [current, setCurrent] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)

  const goTo = useCallback((index) => {
    if (isTransitioning) return
    setIsTransitioning(true)
    setCurrent(index)
    setTimeout(() => setIsTransitioning(false), 600)
  }, [isTransitioning])

  const next = useCallback(() => goTo((current + 1) % slides.length), [current, goTo])
  const prev = useCallback(() => goTo((current - 1 + slides.length) % slides.length), [current, goTo])

  useEffect(() => {
    if (isPaused) return
    const timer = setInterval(next, 6000)
    return () => clearInterval(timer)
  }, [isPaused, next])

  const slide = slides[current]

  return (
    <div
      className="relative w-full overflow-hidden group/hero"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* All slides layered for crossfade */}
      {slides.map((s, i) => (
        <div
          key={s.id}
          className={`absolute inset-0 bg-gradient-to-r ${s.gradient} transition-opacity duration-700 ease-in-out ${
            i === current ? 'opacity-100 z-10' : 'opacity-0 z-0'
          }`}
        >
          {/* Subtle dot pattern overlay for depth */}
          <div className="absolute inset-0 opacity-[0.04]" style={{
            backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
            backgroundSize: '20px 20px'
          }} />
          {/* Bottom gradient fade */}
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/10 to-transparent" />
        </div>
      ))}

      {/* Content */}
      <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 lg:py-20">
        <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-16">
          {/* Text content */}
          <div className="flex-1 text-white text-center lg:text-left">
            {/* Eyebrow */}
            <div className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-sm rounded-full px-3 py-1 mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              <span className="text-[11px] font-medium tracking-wide uppercase text-white/90">ABU Marketplace</span>
            </div>
            
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-[1.1] tracking-tight">
              {t(slide.headlineKey)}
            </h1>
            <p className="mt-3 text-sm text-white/60 font-medium">{t(slide.subKey)}</p>
            <p className="mt-2 text-4xl sm:text-5xl font-bold tabular-nums tracking-tight">
              <CurrencyAmount amount={slide.price} />
            </p>
            
            <div className="mt-5 flex flex-wrap gap-2 justify-center lg:justify-start">
              {slide.tags.map((key) => (
                <span key={key} className="rounded-full bg-white/10 border border-white/15 px-3.5 py-1.5 text-xs font-medium text-white/90 backdrop-blur-sm hover:bg-white/20 transition-colors duration-200">
                  {t(key)}
                </span>
              ))}
            </div>
            
            <Link
              href={slide.ctaHref}
              className="mt-7 inline-flex items-center gap-2.5 bg-white text-[var(--text-primary)] px-8 py-3.5 rounded-lg text-sm font-semibold transition-all duration-200 hover:bg-white/90 hover:shadow-lg hover:shadow-black/20 hover:-translate-y-0.5 active:translate-y-0 active:shadow-md"
            >
              {t(slide.ctaKey)}
              <ChevronRight size={16} className="transition-transform group-hover/hero:translate-x-0.5" />
            </Link>
          </div>

          {/* Image */}
          <div className="flex-shrink-0 w-56 sm:w-72 lg:w-96 relative">
            {/* Glow behind image */}
            <div className="absolute inset-0 bg-white/10 rounded-full blur-3xl scale-75" />
            <Image
              src={slide.image}
              alt=""
              className="relative w-full h-auto object-contain drop-shadow-2xl animate-float"
              priority={current === 0}
              width={400}
              height={400}
            />
          </div>
        </div>
      </div>

      {/* Navigation arrows — refined */}
      <button
        onClick={prev}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-30 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow-lg shadow-black/10 text-[var(--text-primary)] transition-all duration-200 hover:bg-white hover:shadow-xl hover:scale-110 opacity-0 group-hover/hero:opacity-100"
        aria-label="Previous slide"
      >
        <ChevronLeft size={20} strokeWidth={2.5} />
      </button>
      <button
        onClick={next}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-30 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow-lg shadow-black/10 text-[var(--text-primary)] transition-all duration-200 hover:bg-white hover:shadow-xl hover:scale-110 opacity-0 group-hover/hero:opacity-100"
        aria-label="Next slide"
      >
        <ChevronRight size={20} strokeWidth={2.5} />
      </button>

      {/* Progress bar + dot indicators */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            className={`relative h-2 rounded-full transition-all duration-500 overflow-hidden ${
              i === current ? 'w-8 bg-white/40' : 'w-2 bg-white/30 hover:bg-white/50'
            }`}
            aria-label={`Go to slide ${i + 1}`}
          >
            {i === current && (
              <div className="absolute inset-0 bg-white rounded-full origin-left" style={{
                animation: 'slideProgress 6s linear forwards'
              }} />
            )}
          </button>
        ))}
      </div>

      <style jsx>{`
        @keyframes slideProgress {
          from { transform: scaleX(0); }
          to { transform: scaleX(1); }
        }
      `}</style>
    </div>
  )
}

export default Hero
