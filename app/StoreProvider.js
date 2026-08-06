"use client"
import { useRef } from 'react'
import { Provider } from 'react-redux'
import { makeStore } from '../lib/store'
import { setPreferences } from '@/lib/features/preferencesSlice'
import { languageToLangCode } from '@/lib/utils/currency'

export default function StoreProvider({ children }) {
  const storeRef = useRef(undefined)
  if (!storeRef.current) {
    const store = makeStore()

    if (typeof window !== 'undefined') {
      try {
        const savedPrefs = window.localStorage.getItem('marketplacePreferences')
        if (savedPrefs) {
          store.dispatch(setPreferences(JSON.parse(savedPrefs)))
        }
      } catch (error) {
        console.warn('Unable to load preferences from localStorage', error)
      }

      store.subscribe(() => {
          const { preferences } = store.getState()
          window.localStorage.setItem('marketplacePreferences', JSON.stringify(preferences))
          try {
            // also sync to cookies so server-side code can read preferences for SSR
            const maxAge = 60 * 60 * 24 * 365 // 1 year
            document.cookie = `marketplaceCurrency=${encodeURIComponent(preferences.selectedCurrency)}; Path=/; Max-Age=${maxAge}`
            document.cookie = `marketplaceLanguage=${encodeURIComponent(preferences.selectedLanguage)}; Path=/; Max-Age=${maxAge}`
          } catch (e) {
            // ignore cookie write errors
          }
      })
    }

    storeRef.current = store
  }

  // Sync HTML lang attribute when preferences change
  // Listen to store updates and update document.documentElement.lang
  if (typeof window !== 'undefined') {
    const store = storeRef.current
    // set initial lang
    try {
      const prefs = store.getState().preferences
      const lang = languageToLangCode[prefs.selectedLanguage] || 'en'
      document.documentElement.lang = lang
    } catch (e) {}

    store.subscribe(() => {
      try {
        const prefs = store.getState().preferences
        const lang = languageToLangCode[prefs.selectedLanguage] || 'en'
        if (document.documentElement.lang !== lang) {
          document.documentElement.lang = lang
        }
      } catch (e) {}
    })
  }

  return <Provider store={storeRef.current}>{children}</Provider>
}
