import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { Sale, Installment } from "../../../shared/types";

interface SaleState {
  sales: Sale[];
  currentSale: Sale | null;
  installments: Installment[];
  total: number;
  loading: boolean;
}

const initialState: SaleState = {
  sales: [],
  currentSale: null,
  installments: [],
  total: 0,
  loading: false,
};

const saleSlice = createSlice({
  name: "sales",
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setSales: (
      state,
      action: PayloadAction<{ data: Sale[]; total: number }>,
    ) => {
      state.sales = action.payload.data;
      state.total = action.payload.total;
      state.loading = false;
    },
    setCurrentSale: (state, action: PayloadAction<Sale | null>) => {
      state.currentSale = action.payload;
    },
    addSale: (state, action: PayloadAction<Sale>) => {
      state.sales.unshift(action.payload);
      state.total++;
    },
    setInstallments: (state, action: PayloadAction<Installment[]>) => {
      state.installments = action.payload;
    },
  },
});

export const {
  setLoading,
  setSales,
  setCurrentSale,
  addSale,
  setInstallments,
} = saleSlice.actions;
export default saleSlice.reducer;
