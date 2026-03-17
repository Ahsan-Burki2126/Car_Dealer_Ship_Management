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
import ReportsPage from "./pages/ReportsPage";
import AuditLogsPage from "./pages/AuditLogsPage";
import UsersPage from "./pages/UsersPage";
import SettingsPage from "./pages/SettingsPage";
import BackupPage from "./pages/BackupPage";

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
        <Route
          path="customers"
          element={
            <RoleRoute roles={["super_admin", "admin"]}>
              <CustomersPage />
            </RoleRoute>
          }
        />
        <Route
          path="customers/new"
          element={
            <RoleRoute roles={["super_admin", "admin"]}>
              <CustomerFormPage />
            </RoleRoute>
          }
        />
        <Route
          path="customers/:id"
          element={
            <RoleRoute roles={["super_admin", "admin"]}>
              <CustomerDetailPage />
            </RoleRoute>
          }
        />
        <Route
          path="customers/:id/edit"
          element={
            <RoleRoute roles={["super_admin", "admin"]}>
              <CustomerFormPage />
            </RoleRoute>
          }
        />
        <Route
          path="sales"
          element={
            <RoleRoute roles={["super_admin", "admin"]}>
              <SalesPage />
            </RoleRoute>
          }
        />
        <Route
          path="sales/new"
          element={
            <RoleRoute roles={["super_admin", "admin"]}>
              <SaleFormPage />
            </RoleRoute>
          }
        />
        <Route
          path="sales/:id"
          element={
            <RoleRoute roles={["super_admin", "admin"]}>
              <SaleDetailPage />
            </RoleRoute>
          }
        />
        <Route
          path="sales/:id/edit"
          element={
            <RoleRoute roles={["super_admin", "admin"]}>
              <SaleFormPage />
            </RoleRoute>
          }
        />
        <Route
          path="installments"
          element={
            <RoleRoute roles={["super_admin", "admin"]}>
              <InstallmentsPage />
            </RoleRoute>
          }
        />
        <Route
          path="expenses"
          element={
            <RoleRoute roles={["super_admin", "admin"]}>
              <ExpensesPage />
            </RoleRoute>
          }
        />
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
        <Route
          path="backup"
          element={
            <RoleRoute roles={["super_admin", "admin"]}>
              <BackupPage />
            </RoleRoute>
          }
        />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}
