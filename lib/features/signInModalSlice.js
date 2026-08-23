import { createSlice } from "@reduxjs/toolkit";

const signInModalSlice = createSlice({
  name: "signInModal",
  initialState: {
    open: false,
  },
  reducers: {
    openSignInModal(state) {
      state.open = true;
    },
    closeSignInModal(state) {
      state.open = false;
    },
  },
});

export const { openSignInModal, closeSignInModal } = signInModalSlice.actions;
export default signInModalSlice.reducer;
