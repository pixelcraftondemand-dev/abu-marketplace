'use client'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { assets } from '@/assets/assets'
import { useTranslation } from '@/lib/i18n'

const slides = [
  {
    id: 1,
    offerKey: 'hero.discounts',
    headlineKey: 'hero.headline',
    ctaKey: 'hero.shopNow',
    ctaHref: '/shop',
    image: assets.hero_model_img,
  },
  {
    id: 2,
    offerKey: 'home.eyebrowBestSelling',
    headlineKey: 'hero.bestProducts',
    ctaKey: 'hero.shopNow',
    ctaHref: '/shop?sort=popular',
    image: assets.hero_product_img1,
  },
  {
    id: 3,
    offerKey: 'categories.flashDeals',
    headlineKey: 'hero.discounts',
    ctaKey: 'hero.shopNow',
    ctaHref: '/shop?deals=flash',
    image: assets.hero_product_img2,
  },
]

const Hero = ({ cmsContent = null }) => {
  const { t } = useTranslation()
  const [currentSlide, setCurrentSlide] = useState(0)

  const contentSlides = cmsContent
    ? [
        {
          ...slides[0],
          image: cmsContent.image || slides[0].image,
          offerKey: 'custom',
          headlineKey: 'custom',
          ctaKey: 'custom',
          customOffer: cmsContent.heroSubtitle || t(slides[0].offerKey),
          customHeadline: cmsContent.heroTitle || t(slides[0].headlineKey),
          customCta: cmsContent.heroCtaText || t(slides[0].ctaKey),
          ctaHref: cmsContent.heroCtaHref || slides[0].ctaHref,
        },
        ...slides.slice(1),
      ]
    : slides

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % contentSlides.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [contentSlides.length])

  const handleSlideChange = (index) => {
    setCurrentSlide(index)
  }

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
      <div className="overflow-hidden relative w-full">
        <div
          className="flex transition-transform duration-700 ease-in-out"
          style={{ transform: `translateX(-${currentSlide * 100}%)` }}
        >
          {contentSlides.map((s, index) => (
            <div
              key={s.id}
              className="flex flex-col-reverse md:flex-row items-center justify-between bg-[#E6E9F2] py-8 md:py-10 md:px-14 px-5 mt-2 rounded-xl min-w-full"
            >
              <div className="md:pl-8 mt-6 md:mt-0 text-center md:text-left">
                <p className="md:text-base text-orange-600 pb-1 font-medium">
                  {s.customOffer ?? t(s.offerKey)}
                </p>
                <h1 className="max-w-lg md:text-[38px] md:leading-[46px] text-2xl font-semibold text-gray-900">
                  {s.customHeadline ?? t(s.headlineKey)}
                </h1>
                <div className="flex items-center mt-4 md:mt-6 justify-center md:justify-start">
                  <Link
                    href={s.ctaHref}
                    className="md:px-10 px-7 md:py-2.5 py-2 bg-orange-600 hover:bg-orange-700 rounded-full text-white text-sm font-medium transition-colors duration-200"
                  >
                    {s.customCta ?? t(s.ctaKey)}
                  </Link>
                  <Link
                    href="/shop"
                    className="group hidden sm:flex items-center gap-2 px-6 py-2.5 font-medium text-gray-800 hover:text-orange-600 transition-colors duration-200"
                  >
                    {t('home.viewMore')}
                    <span aria-hidden className="transition-transform duration-200 group-hover:translate-x-1">→</span>
                  </Link>
                </div>
              </div>
              <div className="flex items-center flex-1 justify-center">
                <Image
                  className="md:w-64 w-44 h-auto object-contain"
                  src={s.image}
                  alt={`Slide ${index + 1}`}
                  width={400}
                  height={400}
                  priority={index === 0}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-center gap-2 mt-6">
          {contentSlides.map((_, index) => (
            <button
              key={index}
              onClick={() => handleSlideChange(index)}
              aria-label={`Go to slide ${index + 1}`}
              className={`h-2 w-2 rounded-full cursor-pointer transition-colors duration-200 ${
                currentSlide === index ? 'bg-orange-600' : 'bg-gray-500/30 hover:bg-gray-500/50'
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

export default Hero
