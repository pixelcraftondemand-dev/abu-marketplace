import { createSlice } from '@reduxjs/toolkit'

const WISHLIST_KEY = 'abu-wishlist'

export function loadWishlistFromStorage() {
    if (typeof window === 'undefined') return []
    try {
        const stored = localStorage.getItem(WISHLIST_KEY)
        return stored ? JSON.parse(stored) : []
    } catch {
        return []
    }
}

function saveWishlistToStorage(items) {
    if (typeof window === 'undefined') return
    localStorage.setItem(WISHLIST_KEY, JSON.stringify(items))
}

const wishlistSlice = createSlice({
    name: 'wishlist',
    initialState: {
        items: [],
    },
    reducers: {
        hydrateWishlist: (state, action) => {
            state.items = action.payload
        },
        toggleWishlist: (state, action) => {
            const productId = action.payload
            const index = state.items.indexOf(productId)
            if (index >= 0) {
                state.items.splice(index, 1)
            } else {
                state.items.push(productId)
            }
            saveWishlistToStorage(state.items)
        },
        removeFromWishlist: (state, action) => {
            state.items = state.items.filter((id) => id !== action.payload)
            saveWishlistToStorage(state.items)
        },
    },
})

export const { hydrateWishlist, toggleWishlist, removeFromWishlist } = wishlistSlice.actions
export default wishlistSlice.reducer
