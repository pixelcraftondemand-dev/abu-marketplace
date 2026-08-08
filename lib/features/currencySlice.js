import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { DEFAULT_CURRENCY, supportedCurrencies, FALLBACK_RATES, isValidCurrency } from '@/lib/utils/currency';

const API_SYMBOLS = supportedCurrencies.filter((code) => code !== DEFAULT_CURRENCY);

export const fetchExchangeRates = createAsyncThunk(
  'currency/fetchExchangeRates',
  async (_, { rejectWithValue }) => {
    try {
      const symbols = API_SYMBOLS.join(',');
      const response = await fetch(`/api/exchange?base=${encodeURIComponent(DEFAULT_CURRENCY)}&symbols=${encodeURIComponent(symbols)}`);
      const data = await response.json();
      if (!response.ok || !data?.rates) {
        throw new Error(data?.error || 'Failed to fetch exchange rates');
      }
      return {
        baseCurrency: data.base,
        rates: data.rates,
        timestamp: data.timestamp || Date.now(),
        source: data.source || 'live',
        stale: Boolean(data.stale),
      };
    } catch (error) {
      return rejectWithValue({ message: error?.message || 'Unable to load exchange rates' });
    }
  }
);

const initialState = {
  baseCurrency: DEFAULT_CURRENCY,
  rates: {},
  lastFetched: null,
  source: 'fallback',
  stale: true,
  status: 'idle',
  error: null,
};

const currencySlice = createSlice({
  name: 'currency',
  initialState,
  reducers: {
    setRates(state, action) {
      const { rates, timestamp, source, stale } = action.payload;
      state.rates = rates || state.rates;
      state.lastFetched = timestamp || Date.now();
      state.source = source || 'live';
      state.stale = Boolean(stale);
      state.status = 'succeeded';
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchExchangeRates.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchExchangeRates.fulfilled, (state, action) => {
        state.rates = action.payload.rates;
        state.lastFetched = action.payload.timestamp;
        state.source = action.payload.source;
        state.stale = action.payload.stale;
        state.status = 'succeeded';
        state.error = null;
      })
      .addCase(fetchExchangeRates.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload?.message || action.error?.message || 'Failed to fetch exchange rates';
        state.stale = true;
        state.lastFetched = Date.now();
        state.rates = FALLBACK_RATES;
        state.source = 'fallback';
      });
  },
});

export const { setRates } = currencySlice.actions;
export default currencySlice.reducer;
