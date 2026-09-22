import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { DEFAULT_CURRENCY, supportedCurrencies, FALLBACK_RATES } from '@/lib/utils/currency';

const API_SYMBOLS = supportedCurrencies.filter((code) => code !== DEFAULT_CURRENCY);

interface ExchangeRatesResponse {
  base: string;
  rates: Record<string, number>;
  timestamp?: number;
  source?: string;
  stale?: boolean;
  error?: string;
}

interface ExchangeRatesResult {
  baseCurrency: string;
  rates: Record<string, number>;
  timestamp: number;
  source: string;
  stale: boolean;
}

interface ExchangeRatesError {
  message: string;
}export const fetchExchangeRates = createAsyncThunk<ExchangeRatesResult, void>('currency/fetchExchangeRates',
  async (_, { rejectWithValue }) => {
    try {
      const symbols = API_SYMBOLS.join(',');
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10_000);
      let response: Response;
      try {
        response = await fetch(`/api/exchange?base=${encodeURIComponent(DEFAULT_CURRENCY)}&symbols=${encodeURIComponent(symbols)}`,
          { signal: controller.signal }
        );
      } finally {
        clearTimeout(timeout);
      }
      const data: ExchangeRatesResponse = await response.json();
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
    } catch (error: unknown) {
      const err = error as Error;
      return rejectWithValue({ message: err?.message || 'Unable to load exchange rates' });
    }
  }
);

interface CurrencyState {
  baseCurrency: string;
  rates: Record<string, number>;
  lastFetched: number | null;
  source: string;
  stale: boolean;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: CurrencyState = {
  baseCurrency: DEFAULT_CURRENCY,
  rates: {},
  lastFetched: null,
  source: 'fallback',
  stale: true,
  status: 'idle',
  error: null,
};

interface SetRatesPayload {
  rates?: Record<string, number>;
  timestamp?: number;
  source?: string;
  stale?: boolean;
}

const currencySlice = createSlice({
  name: 'currency',
  initialState,
  reducers: {
    setRates(state, action: PayloadAction<SetRatesPayload>) {
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
        const payload = action.payload as ExchangeRatesError | undefined;
        state.error = payload?.message || action.error?.message || 'Failed to fetch exchange rates';
        state.stale = true;
        state.lastFetched = Date.now();
        state.rates = FALLBACK_RATES;
        state.source = 'fallback';
      });
  },
});

export const { setRates } = currencySlice.actions;
export default currencySlice.reducer;
