import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { visionTool } from '@sanity/vision'
import { homePage, siteSettings } from './sanity/schema'

export default defineConfig({
  name: 'abu-marketplace',
  title: 'ABU Marketplace',
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || '',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  plugins: [structureTool(), visionTool()],
  schema: {
    types: [homePage, siteSettings],
  },
})
