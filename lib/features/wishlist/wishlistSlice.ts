import { createSlice, PayloadAction } from '@reduxjs/toolkit'

const WISHLIST_KEY = 'abu-wishlist'

interface WishlistState {
  items: string[];
}

export function loadWishlistFromStorage(): string[] {
    if (typeof window === 'undefined') return []
    try {
        const stored = localStorage.getItem(WISHLIST_KEY)
        return stored ? JSON.parse(stored) : []
    } catch {
        return []
    }
}

function saveWishlistToStorage(items: string[]): void {
    if (typeof window === 'undefined') return
    localStorage.setItem(WISHLIST_KEY, JSON.stringify(items))
}

const initialState: WishlistState = {
    items: [],
}

const wishlistSlice = createSlice({
    name: 'wishlist',
    initialState,
    reducers: {
        hydrateWishlist: (state, action: PayloadAction<string[]>) => {
            state.items = action.payload
        },
        toggleWishlist: (state, action: PayloadAction<string>) => {
            const productId = action.payload
            const index = state.items.indexOf(productId)
            if (index >= 0) {
                state.items.splice(index, 1)
            } else {
                state.items.push(productId)
            }
            saveWishlistToStorage(state.items)
        },
        removeFromWishlist: (state, action: PayloadAction<string>) => {
            state.items = state.items.filter((id) => id !== action.payload)
            saveWishlistToStorage(state.items)
        },
    },
})

export const { hydrateWishlist, toggleWishlist, removeFromWishlist } = wishlistSlice.actions
export default wishlistSlice.reducer
