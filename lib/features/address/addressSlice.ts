import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit'
import axios from 'axios'

interface AddressItem {
  id: string;
  street?: string;
  city?: string;
  [key: string]: unknown;
}

interface AddressState {
  list: AddressItem[];
}

interface AddressFetchResponse {
  addresses?: AddressItem[];
}

export const fetchAddress = createAsyncThunk<AddressItem[], { getToken: () => Promise<string> }>('address/fetchAddress', 
    async ({ getToken }, thunkAPI) => {
        try {
            const token = await getToken()
            const { data } = await axios.get<AddressFetchResponse>('/api/address', {headers: { Authorization: `Bearer ${token}` }})
            return data ? data.addresses ?? [] : []
        } catch (error: unknown) {
            const err = error as { response?: { data?: unknown } };
            return thunkAPI.rejectWithValue(err.response?.data)
        }
    }
)

const initialState: AddressState = {
    list: [],
}

const addressSlice = createSlice({
    name: 'address',
    initialState,
    reducers: {
        addAddress: (state, action: PayloadAction<AddressItem>) => {
            state.list.push(action.payload)
        },
    },
    extraReducers: (builder)=>{
        builder.addCase(fetchAddress.fulfilled, (state, action)=>{
            state.list = action.payload
        })
    }
})

export const { addAddress } = addressSlice.actions

export default addressSlice.reducer