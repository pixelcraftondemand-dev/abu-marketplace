import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit'
import axios from 'axios'

interface ProductItem {
  id: string;
  name: string;
  price: number;
  [key: string]: unknown;
}

interface ProductState {
  list: ProductItem[];
}

export const fetchProducts = createAsyncThunk<ProductItem[], { storeId?: string }>('product/fetchProducts', 
    async ({ storeId }, thunkAPI) => {
        try {
            const { data } = await axios.get('/api/products' + (storeId ? `?storeId=${storeId}` : ''))
            return data.products
        } catch (error: unknown) {
            const err = error as { response?: { data?: unknown } };
            return thunkAPI.rejectWithValue(err.response?.data)
        }
    }
)

const initialState: ProductState = {
    list: [],
}

const productSlice = createSlice({
    name: 'product',
    initialState,
    reducers: {
        setProduct: (state, action: PayloadAction<ProductItem[]>) => {
            state.list = action.payload
        },
        clearProduct: (state) => {
            state.list = []
        }
    },
    extraReducers: (builder) => {
        builder.addCase(fetchProducts.fulfilled, (state, action) => {
            state.list = action.payload
        })
    }
})

export const { setProduct, clearProduct } = productSlice.actions
export default productSlice.reducer