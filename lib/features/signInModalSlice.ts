import { createSlice } from "@reduxjs/toolkit";

interface SignInModalState {
  open: boolean;
}

const initialState: SignInModalState = {
  open: false,
};

const signInModalSlice = createSlice({
  name: "signInModal",
  initialState,
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
