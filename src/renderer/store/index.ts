import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";
import vehicleReducer from "./slices/vehicleSlice";
import customerReducer from "./slices/customerSlice";
import saleReducer from "./slices/saleSlice";
import inspectionReducer from "./slices/inspectionSlice";
import uiReducer from "./slices/uiSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    vehicles: vehicleReducer,
    customers: customerReducer,
    sales: saleReducer,
    inspections: inspectionReducer,
    ui: uiReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
