import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { defaultCountry, defaultLanguage, defaultCurrency } from '@/lib/utils/currency'

interface PreferencesState {
  selectedCountry: string;
  selectedLanguage: string;
  selectedCurrency: string;
}

interface PreferencesPayload {
  country?: string;
  language?: string;
  currency?: string;
}

const initialState: PreferencesState = {
  selectedCountry: defaultCountry,
  selectedLanguage: defaultLanguage,
  selectedCurrency: defaultCurrency,
}

const preferencesSlice = createSlice({
  name: 'preferences',
  initialState,
  reducers: {
    setCountry: (state, action: PayloadAction<string>) => {
      state.selectedCountry = action.payload
    },
    setLanguage: (state, action: PayloadAction<string>) => {
      state.selectedLanguage = action.payload
    },
    setCurrency: (state, action: PayloadAction<string>) => {
      state.selectedCurrency = action.payload
    },
    setPreferences: (state, action: PayloadAction<PreferencesPayload>) => {
      const { country, language, currency } = action.payload
      if (country) state.selectedCountry = country
      if (language) state.selectedLanguage = language
      if (currency) state.selectedCurrency = currency
    },
  },
})

export const { setCountry, setLanguage, setCurrency, setPreferences } = preferencesSlice.actions
export default preferencesSlice.reducer
