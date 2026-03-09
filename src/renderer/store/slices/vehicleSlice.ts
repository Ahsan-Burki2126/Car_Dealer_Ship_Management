import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { Vehicle } from "../../../shared/types";

interface VehicleState {
  vehicles: Vehicle[];
  currentVehicle: Vehicle | null;
  total: number;
  loading: boolean;
  error: string | null;
}

const initialState: VehicleState = {
  vehicles: [],
  currentVehicle: null,
  total: 0,
  loading: false,
  error: null,
};

const vehicleSlice = createSlice({
  name: "vehicles",
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setVehicles: (
      state,
      action: PayloadAction<{ data: Vehicle[]; total: number }>,
    ) => {
      state.vehicles = action.payload.data;
      state.total = action.payload.total;
      state.loading = false;
    },
    setCurrentVehicle: (state, action: PayloadAction<Vehicle | null>) => {
      state.currentVehicle = action.payload;
    },
    addVehicle: (state, action: PayloadAction<Vehicle>) => {
      state.vehicles.unshift(action.payload);
      state.total++;
    },
    updateVehicle: (state, action: PayloadAction<Vehicle>) => {
      const index = state.vehicles.findIndex((v) => v.id === action.payload.id);
      if (index !== -1) state.vehicles[index] = action.payload;
      if (state.currentVehicle?.id === action.payload.id)
        state.currentVehicle = action.payload;
    },
    removeVehicle: (state, action: PayloadAction<string>) => {
      state.vehicles = state.vehicles.filter((v) => v.id !== action.payload);
      state.total--;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.loading = false;
    },
  },
});

export const {
  setLoading,
  setVehicles,
  setCurrentVehicle,
  addVehicle,
  updateVehicle,
  removeVehicle,
  setError,
} = vehicleSlice.actions;
export default vehicleSlice.reducer;
