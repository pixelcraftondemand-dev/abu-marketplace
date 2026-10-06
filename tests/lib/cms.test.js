import { describe, expect, it, vi } from 'vitest'
import { getHomePageContent, normalizeCmsLocale } from '@/lib/cms'

describe('CMS integration', () => {
  it('normalizes locale codes to supported Sanity values', () => {
    expect(normalizeCmsLocale('en')).toBe('en')
    expect(normalizeCmsLocale('en-US')).toBe('en')
    expect(normalizeCmsLocale('kri')).toBe('kri')
    expect(normalizeCmsLocale('fr')).toBe('en')
  })

  it('returns null when the CMS is not configured', async () => {
    vi.stubEnv('NEXT_PUBLIC_SANITY_PROJECT_ID', '')
    vi.stubEnv('NEXT_PUBLIC_SANITY_DATASET', '')

    await expect(getHomePageContent('en')).resolves.toBeNull()
  })
})
