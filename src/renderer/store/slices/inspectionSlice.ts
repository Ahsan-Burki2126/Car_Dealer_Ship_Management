import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { Inspection } from "../../../shared/types";

interface InspectionState {
  inspections: Inspection[];
  currentInspection: Inspection | null;
  total: number;
  loading: boolean;
}

const initialState: InspectionState = {
  inspections: [],
  currentInspection: null,
  total: 0,
  loading: false,
};

const inspectionSlice = createSlice({
  name: "inspections",
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setInspections: (
      state,
      action: PayloadAction<{ data: Inspection[]; total: number }>,
    ) => {
      state.inspections = action.payload.data;
      state.total = action.payload.total;
      state.loading = false;
    },
    setCurrentInspection: (state, action: PayloadAction<Inspection | null>) => {
      state.currentInspection = action.payload;
    },
    addInspection: (state, action: PayloadAction<Inspection>) => {
      state.inspections.unshift(action.payload);
      state.total++;
    },
  },
});

export const {
  setLoading,
  setInspections,
  setCurrentInspection,
  addInspection,
} = inspectionSlice.actions;
export default inspectionSlice.reducer;
