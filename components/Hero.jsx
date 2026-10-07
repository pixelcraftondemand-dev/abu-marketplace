'use client'
import Image from 'next/image'
import Link from 'next/link'
import { assets } from '@/assets/assets'
import { useTranslation } from '@/lib/i18n'

const Hero = ({ cmsContent = null }) => {
  const { t } = useTranslation()
  const offer = cmsContent?.heroSubtitle || t('categories.newArrivals')
  const headline = cmsContent?.heroTitle || t('hero.headline')
  const cta = cmsContent?.heroCtaText || t('hero.shopNow')
  const ctaHref = cmsContent?.heroCtaHref || '/shop'
  const image = cmsContent?.image || assets.hero_model_img

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
      <div className="flex flex-col-reverse md:flex-row items-center justify-between bg-[#E6E9F2] py-8 md:py-10 md:px-14 px-5 mt-2 rounded-xl">
        <div className="md:pl-8 mt-6 md:mt-0 text-center md:text-left">
          <p className="md:text-base text-orange-600 pb-1 font-medium">{offer}</p>
          <h1 className="max-w-lg md:text-[38px] md:leading-[46px] text-2xl font-semibold text-gray-900">
            {headline}
          </h1>
          <div className="flex items-center mt-4 md:mt-6 justify-center md:justify-start">
            <Link
              href={ctaHref}
              className="md:px-10 px-7 md:py-2.5 py-2 bg-orange-600 hover:bg-orange-700 rounded-full text-white text-sm font-medium transition-colors duration-200"
            >
              {cta}
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
            src={image}
            alt=""
            width={400}
            height={400}
            priority
          />
        </div>
      </div>
    </section>
  )
}

export default Hero
