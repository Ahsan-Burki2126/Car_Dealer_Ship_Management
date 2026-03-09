import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import type { User } from "../../../shared/types";

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  token: localStorage.getItem("dms_token"),
  isAuthenticated: false,
  loading: false,
  error: null,
};

export const loginUser = createAsyncThunk(
  "auth/login",
  async (
    credentials: { username: string; password: string },
    { rejectWithValue },
  ) => {
    const result = await window.api.login(
      credentials.username,
      credentials.password,
    );
    if (!result.success) return rejectWithValue(result.error);
    return result.data;
  },
);

export const verifyAuth = createAsyncThunk(
  "auth/verify",
  async (_, { getState, rejectWithValue }) => {
    const state = getState() as { auth: AuthState };
    if (!state.auth.token) return rejectWithValue("No token");
    const result = await window.api.verifyToken(state.auth.token);
    if (!result.success) return rejectWithValue(result.error);
    return result.data;
  },
);

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      localStorage.removeItem("dms_token");
    },
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      state.isAuthenticated = true;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
        localStorage.setItem("dms_token", action.payload.token);
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(verifyAuth.fulfilled, (state, action) => {
        state.isAuthenticated = true;
      })
      .addCase(verifyAuth.rejected, (state) => {
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        localStorage.removeItem("dms_token");
      });
  },
});

export const { logout, setUser, clearError } = authSlice.actions;
export default authSlice.reducer;
