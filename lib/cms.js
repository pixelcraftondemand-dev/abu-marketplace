import { createClient } from '@sanity/client'
import imageUrlBuilder from '@sanity/image-url'

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET
const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2024-01-01'

export const sanityClient =
  projectId && dataset
    ? createClient({
        projectId,
        dataset,
        apiVersion,
        useCdn: true,
        perspective: 'published',
      })
    : null

export function normalizeCmsLocale(locale = 'en') {
  const normalized = String(locale || 'en').toLowerCase().split('-')[0]
  return normalized === 'kri' ? 'kri' : 'en'
}

export function urlFor(source) {
  if (!sanityClient || !source) return null
  return imageUrlBuilder(sanityClient).image(source)
}

export async function getHomePageContent(locale = 'en') {
  if (!sanityClient) {
    return null
  }

  const localeCode = normalizeCmsLocale(locale)

  const query = `*[_type == "homePage" && locale == $locale][0]{
    _id,
    locale,
    heroTitle,
    heroSubtitle,
    heroCtaText,
    heroCtaHref,
    heroImage,
    newsletterTitle,
    newsletterSubtitle,
    seoDescription
  }`

  try {
    return await sanityClient.fetch(
      query,
      { locale: localeCode },
      { next: { revalidate: 60 } }
    )
  } catch (error) {
    console.warn('Sanity homepage fetch failed:', error)
    return null
  }
}
