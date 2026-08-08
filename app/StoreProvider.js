"use client"
import { useRef, useEffect } from 'react'
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
        } else {
          const cookies = Object.fromEntries(
            document.cookie.split(';').map((part) => {
              const [key, value] = part.split('=')
              return [key?.trim(), decodeURIComponent(value || '')]
            })
          )
          const language = cookies.marketplaceLanguage
          const currency = cookies.marketplaceCurrency
          if (language || currency) {
            store.dispatch(setPreferences({
              language: language || undefined,
              currency: currency || undefined,
            }))
          }
        }
      } catch (error) {
        console.warn('Unable to load preferences from localStorage or cookies', error)
      }

      store.subscribe(() => {
          const { preferences } = store.getState()
          window.localStorage.setItem('marketplacePreferences', JSON.stringify(preferences))
          try {
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

  // Sync HTML lang attribute when preferences change.
  // This hook is always declared so React rules stay valid.
  const currentStore = storeRef.current
  useEffect(() => {
    if (!currentStore) return

    try {
      const prefs = currentStore.getState().preferences
      const lang = languageToLangCode[prefs.selectedLanguage] || 'en'
      document.documentElement.lang = lang
    } catch (e) {}

    const unsubscribe = currentStore.subscribe(() => {
      try {
        const prefs = currentStore.getState().preferences
        const lang = languageToLangCode[prefs.selectedLanguage] || 'en'
        if (document.documentElement.lang !== lang) {
          document.documentElement.lang = lang
        }
      } catch (e) {}
    })

    return () => unsubscribe()
  }, [currentStore])

  return <Provider store={storeRef.current}>{children}</Provider>
}
