import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit'
import axios from 'axios'

interface RatingItem {
  id: string;
  rating: number;
  productId: string;
  [key: string]: unknown;
}

interface RatingState {
  ratings: RatingItem[];
}

interface RatingFetchResponse {
  ratings?: RatingItem[];
}

export const fetchUserRatings = createAsyncThunk<RatingItem[], { getToken: () => Promise<string> }>('rating/fetchUserRatings',
    async ({ getToken }, thunkAPI) => {
        try {
            const token = await getToken()
            const { data } = await axios.get<RatingFetchResponse>('/api/rating', {headers: { Authorization: `Bearer ${token}` }})
            return data ? data.ratings ?? [] : []
        } catch (error: unknown) {
            const err = error as { response?: { data?: unknown } };
            return thunkAPI.rejectWithValue(err.response?.data)
        }
    }
)

const initialState: RatingState = {
    ratings: [],
}

const ratingSlice = createSlice({
    name: 'rating',
    initialState,
    reducers: {
        addRating: (state, action: PayloadAction<RatingItem>) => {
            state.ratings.push(action.payload)
        },
    },
    extraReducers: (builder)=>{
        builder.addCase(fetchUserRatings.fulfilled, (state, action)=>{
            state.ratings = action.payload
        })
    }
})

export const { addRating } = ratingSlice.actions

export default ratingSlice.reducer