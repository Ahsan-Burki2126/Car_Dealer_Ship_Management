import { createSlice } from "@reduxjs/toolkit";

// Old inspection slice - preserved for backward compatibility
// The new vehicle inspection system uses vehicleInspection field in Vehicle type

interface InspectionState {
  inspections: any[];
  currentInspection: any | null;
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
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
  },
});

export const { setLoading } = inspectionSlice.actions;
export default inspectionSlice.reducer;
