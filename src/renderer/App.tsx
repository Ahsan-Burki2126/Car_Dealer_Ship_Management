import React, { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import type { RootState, AppDispatch } from "./store";
import { setDarkMode } from "./store/slices/uiSlice";

// Layout
import MainLayout from "./components/layout/MainLayout";
import LoginPage from "./pages/LoginPage";

// Pages
import DashboardPage from "./pages/DashboardPage";
import VehiclesPage from "./pages/VehiclesPage";
import VehicleDetailPage from "./pages/VehicleDetailPage";
import VehicleFormPage from "./pages/VehicleFormPage";
import CustomersPage from "./pages/CustomersPage";
import CustomerFormPage from "./pages/CustomerFormPage";
import CustomerDetailPage from "./pages/CustomerDetailPage";
import SalesPage from "./pages/SalesPage";
import SaleFormPage from "./pages/SaleFormPage";
import SaleDetailPage from "./pages/SaleDetailPage";
import InstallmentsPage from "./pages/InstallmentsPage";
import ExpensesPage from "./pages/ExpensesPage";
import InspectionsPage from "./pages/InspectionsPage";
import InspectionFormPage from "./pages/InspectionFormPage";
import InspectionDetailPage from "./pages/InspectionDetailPage";
import ReportsPage from "./pages/ReportsPage";
import AuditLogsPage from "./pages/AuditLogsPage";
import UsersPage from "./pages/UsersPage";
import SettingsPage from "./pages/SettingsPage";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useSelector(
    (state: RootState) => state.auth,
  );
  if (!isAuthenticated || !user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RoleRoute({
  children,
  roles,
}: {
  children: React.ReactNode;
  roles: string[];
}) {
  const { user } = useSelector((state: RootState) => state.auth);
  if (!user || !roles.includes(user.role)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  const dispatch = useDispatch<AppDispatch>();
  const { darkMode } = useSelector((state: RootState) => state.ui);

  useEffect(() => {
    dispatch(setDarkMode(darkMode));
  }, []);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="vehicles" element={<VehiclesPage />} />
        <Route path="vehicles/new" element={<VehicleFormPage />} />
        <Route path="vehicles/:id" element={<VehicleDetailPage />} />
        <Route path="vehicles/:id/edit" element={<VehicleFormPage />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="customers/new" element={<CustomerFormPage />} />
        <Route path="customers/:id" element={<CustomerDetailPage />} />
        <Route path="customers/:id/edit" element={<CustomerFormPage />} />
        <Route path="sales" element={<SalesPage />} />
        <Route path="sales/new" element={<SaleFormPage />} />
        <Route path="sales/:id" element={<SaleDetailPage />} />
        <Route path="installments" element={<InstallmentsPage />} />
        <Route path="expenses" element={<ExpensesPage />} />
        <Route path="inspections" element={<InspectionsPage />} />
        <Route path="inspections/new" element={<InspectionFormPage />} />
        <Route path="inspections/:id" element={<InspectionDetailPage />} />
        <Route
          path="reports"
          element={
            <RoleRoute roles={["super_admin", "admin"]}>
              <ReportsPage />
            </RoleRoute>
          }
        />
        <Route
          path="audit-logs"
          element={
            <RoleRoute roles={["super_admin"]}>
              <AuditLogsPage />
            </RoleRoute>
          }
        />
        <Route
          path="users"
          element={
            <RoleRoute roles={["super_admin"]}>
              <UsersPage />
            </RoleRoute>
          }
        />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}
