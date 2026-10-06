export const homePage = {
  name: 'homePage',
  title: 'Home Page',
  type: 'document',
  fields: [
    {
      name: 'locale',
      title: 'Locale',
      type: 'string',
      options: {
        list: [
          { title: 'English', value: 'en' },
          { title: 'Krio', value: 'kri' },
        ],
      },
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'heroTitle',
      title: 'Hero heading',
      type: 'string',
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'heroSubtitle',
      title: 'Hero subheading',
      type: 'string',
    },
    {
      name: 'heroCtaText',
      title: 'Hero CTA text',
      type: 'string',
      initialValue: 'Shop now',
    },
    {
      name: 'heroCtaHref',
      title: 'Hero CTA link',
      type: 'string',
      initialValue: '/shop',
    },
    {
      name: 'heroImage',
      title: 'Hero image',
      type: 'image',
      options: {
        hotspot: true,
      },
    },
    {
      name: 'newsletterTitle',
      title: 'Newsletter heading',
      type: 'string',
    },
    {
      name: 'newsletterSubtitle',
      title: 'Newsletter subheading',
      type: 'text',
    },
    {
      name: 'seoDescription',
      title: 'SEO description',
      type: 'text',
    },
  ],
}

export const siteSettings = {
  name: 'siteSettings',
  title: 'Site Settings',
  type: 'document',
  fields: [
    {
      name: 'siteName',
      title: 'Site name',
      type: 'string',
      initialValue: 'ABU Marketplace',
    },
    {
      name: 'tagline',
      title: 'Tagline',
      type: 'string',
    },
  ],
}
