import { createSlice } from '@reduxjs/toolkit'
import { defaultCountry, defaultLanguage, defaultCurrency } from '@/lib/utils/currency'

const preferencesSlice = createSlice({
  name: 'preferences',
  initialState: {
    selectedCountry: defaultCountry,
    selectedLanguage: defaultLanguage,
    selectedCurrency: defaultCurrency,
  },
  reducers: {
    setCountry: (state, action) => {
      state.selectedCountry = action.payload
    },
    setLanguage: (state, action) => {
      state.selectedLanguage = action.payload
    },
    setCurrency: (state, action) => {
      state.selectedCurrency = action.payload
    },
    setPreferences: (state, action) => {
      const { country, language, currency } = action.payload
      if (country) state.selectedCountry = country
      if (language) state.selectedLanguage = language
      if (currency) state.selectedCurrency = currency
    },
  },
})

export const { setCountry, setLanguage, setCurrency, setPreferences } = preferencesSlice.actions
export default preferencesSlice.reducer
