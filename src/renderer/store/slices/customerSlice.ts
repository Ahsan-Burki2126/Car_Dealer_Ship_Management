import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { Customer } from "../../../shared/types";

interface CustomerState {
  customers: Customer[];
  currentCustomer: Customer | null;
  total: number;
  loading: boolean;
}

const initialState: CustomerState = {
  customers: [],
  currentCustomer: null,
  total: 0,
  loading: false,
};

const customerSlice = createSlice({
  name: "customers",
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setCustomers: (
      state,
      action: PayloadAction<{ data: Customer[]; total: number }>,
    ) => {
      state.customers = action.payload.data;
      state.total = action.payload.total;
      state.loading = false;
    },
    setCurrentCustomer: (state, action: PayloadAction<Customer | null>) => {
      state.currentCustomer = action.payload;
    },
    addCustomer: (state, action: PayloadAction<Customer>) => {
      state.customers.unshift(action.payload);
      state.total++;
    },
    updateCustomer: (state, action: PayloadAction<Customer>) => {
      const idx = state.customers.findIndex((c) => c.id === action.payload.id);
      if (idx !== -1) state.customers[idx] = action.payload;
    },
    removeCustomer: (state, action: PayloadAction<string>) => {
      state.customers = state.customers.filter((c) => c.id !== action.payload);
      state.total--;
    },
  },
});

export const {
  setLoading,
  setCustomers,
  setCurrentCustomer,
  addCustomer,
  updateCustomer,
  removeCustomer,
} = customerSlice.actions;
export default customerSlice.reducer;
