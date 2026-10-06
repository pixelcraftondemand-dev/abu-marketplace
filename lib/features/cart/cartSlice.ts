import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit'
import axios from 'axios'

let debounceTimer: ReturnType<typeof setTimeout> | null = null

interface CartGetToken {
  getToken: () => Promise<string>;
}

interface CartState {
  total: number;
  cartItems: Record<string, number>;
}

interface CartFetchResponse {
  cart: Record<string, number>;
}

export const uploadCart = createAsyncThunk<void, CartGetToken, { state: { cart: CartState } }>('cart/uploadCart', 
    async ({ getToken }, thunkAPI) => {
        try {
            if (debounceTimer) clearTimeout(debounceTimer)
            debounceTimer = setTimeout(async ()=> {
                const { cartItems } = thunkAPI.getState().cart;
                const token = await getToken();
                await axios.post('/api/cart', {cart: cartItems}, { headers: { Authorization: `Bearer ${token}` } })
            },1000)
        } catch (error: unknown) {
            const err = error as { response?: { data?: unknown } };
            return thunkAPI.rejectWithValue(err.response?.data)
        }
    }
)

export const fetchCart = createAsyncThunk<CartFetchResponse, CartGetToken>('cart/fetchCart', 
    async ({ getToken }, thunkAPI) => {
        try {
            const token = await getToken()
            const { data } = await axios.get('/api/cart', {headers: { Authorization: `Bearer ${token}` }})
            return data
        } catch (error: unknown) {
            const err = error as { response?: { data?: unknown } };
            return thunkAPI.rejectWithValue(err.response?.data)
        }
    }
)

const initialState: CartState = {
    total: 0,
    cartItems: {},
}

const cartSlice = createSlice({
    name: 'cart',
    initialState,
    reducers: {
        addToCart: (state, action: PayloadAction<{ productId: string }>) => {
            const { productId } = action.payload
            if (state.cartItems[productId]) {
                state.cartItems[productId]++
            } else {
                state.cartItems[productId] = 1
            }
            state.total += 1
        },
        removeFromCart: (state, action: PayloadAction<{ productId: string }>) => {
            const { productId } = action.payload
            if (state.cartItems[productId]) {
                state.cartItems[productId]--
                if (state.cartItems[productId] === 0) {
                    delete state.cartItems[productId]
                }
            }
            state.total -= 1
        },
        deleteItemFromCart: (state, action: PayloadAction<{ productId: string }>) => {
            const { productId } = action.payload
            state.total -= state.cartItems[productId] ? state.cartItems[productId] : 0
            delete state.cartItems[productId]
        },
        clearCart: (state) => {
            state.cartItems = {}
            state.total = 0
        },
    },
    extraReducers: (builder)=>{
        builder.addCase(fetchCart.fulfilled, (state, action)=>{
            state.cartItems = action.payload.cart
            state.total = Object.values(action.payload.cart).reduce((acc, item)=>acc + item, 0)
        })
    }
})

export const { addToCart, removeFromCart, clearCart, deleteItemFromCart } = cartSlice.actions

export default cartSlice.reducer
