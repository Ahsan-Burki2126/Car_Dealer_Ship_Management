// ============================================================
// SHARED TYPES - Used by both main process and renderer
// ============================================================

// ---- User & Auth Types ----
export type UserRole = "super_admin" | "admin";

export interface User {
  id: string;
  username: string;
  full_name: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_login?: string;
}

export interface AuthPayload {
  userId: string;
  username: string;
  role: UserRole;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

// ---- Vehicle Types ----
export type VehicleStatus =
  | "purchased"
  | "in_stock"
  | "reserved"
  | "sold"
  | "on_installments";

export interface Vehicle {
  id: string;
  photo_path?: string;
  seller_photo_path?: string;
  seller_cnic_photo_path?: string;
  seller_cnic_photo_back_path?: string;
  registration_number: string;
  chassis_number: string;
  engine_number: string;
  make: string;
  model: string;
  year_of_manufacture: number;
  year_of_import?: number;
  color: string;
  assembling_company?: string;
  extra_keys_available: boolean;
  extra_keys_count?: number;
  file_available: boolean;
  file_pages?: number;
  current_smart_card: boolean;
  smart_card_count?: number;
  status: VehicleStatus;
  purchase_price: number;
  purchase_date: string;
  seller_name: string;
  seller_father_name?: string;
  seller_caste?: string;
  seller_address?: string;
  seller_cnic: string;
  seller_phone: string;
  seller_witness_name?: string;
  seller_witness_father_name?: string;
  seller_witness_cnic?: string;
  seller_witness_phone?: string;
  total_expenses: number;
  total_cost: number;
  selling_price?: number;
  notes?: string;
  vehicleInspection?: VehicleInspection;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// ---- Vehicle Inspection Types (New SVG-based) ----
export type DamageType =
  | "scratch"
  | "dent"
  | "repaint"
  | "rust"
  | "crack"
  | "replacement";

export type DamageSeverity =
  | "P" // Painted
  | "A1" // Minor Scratch
  | "A2" // Medium Scratch
  | "A3" // Major Scratch
  | "B1" // Minor Dent
  | "B2" // Medium Dent
  | "B3" // Major Dent
  | "U1" // Minor Uneven Paint
  | "U2" // Repair Mark
  | "U3"; // Major Repaint

export interface InspectionMarker {
  id: string;
  panelId: string;
  x: number;
  y: number;
  damageType: DamageType;
  severity: DamageSeverity;
  notes?: string;
}

export interface VehicleInspection {
  inspectionDate?: string;
  inspectorName?: string;
  markers: InspectionMarker[];
  completedPanels?: string[];
}

// ---- Vehicle Expense Types ----
export type VehicleExpenseCategory =
  | "paint_repair"
  | "engine_repair"
  | "tyres_replacement"
  | "battery_replacement"
  | "travel_cost"
  | "fuel_cost"
  | "meals"
  | "transportation_cost"
  | "cleaning_cost"
  | "other";

export interface VehicleExpense {
  id: string;
  vehicle_id: string;
  category: VehicleExpenseCategory;
  amount: number;
  date: string;
  notes?: string;
  condition_before?: string;
  condition_after?: string;
  created_by: string;
  created_at: string;
}

// ---- Customer Types ----
export interface Customer {
  id: string;
  name: string;
  father_name: string;
  caste?: string;
  cnic: string;
  phone: string;
  address: string;
  photo_path?: string;
  cnic_photo_path?: string;
  cnic_photo_back_path?: string;
  notes?: string;
  witness_name?: string;
  witness_father_name?: string;
  witness_cnic?: string;
  witness_phone?: string;
  witness_cnic_photo_path?: string;
  witness_cnic_photo_back_path?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// ---- Sales Types ----
export type PaymentType = "cash" | "installment";
export type CashPaymentMethod = "hard_cash" | "bank_transfer";
export type SaleStatus = "completed" | "active" | "cancelled";
export type InstallmentDurationType =
  | "days"
  | "months"
  | "years"
  | "weekly"
  | "bi_weekly"
  | "monthly";

export interface InstallmentScheduleItem {
  installment_number: number;
  due_date: string;
  amount: number;
}

export interface Sale {
  id: string;
  invoice_number: string;
  date: string;
  sale_date?: string;
  customer_id: string;
  customer_name?: string;
  customer_cnic?: string;
  customer_phone?: string;
  vehicle_id: string;
  vehicle_price: number;
  sale_price?: number;
  vehicle_name?: string;
  registration_number?: string;
  chassis_number?: string;
  engine_number?: string;
  down_payment: number;
  remaining_balance: number;
  total_paid?: number;
  balance?: number;
  payment_type: PaymentType;
  cash_payment_method?: CashPaymentMethod;
  cash_amount?: number;
  bank_transfer_amount?: number;
  bank_account_id?: string;
  bank_account_name?: string;
  installment_count?: number;
  installment_frequency?: string;
  installment_duration_type?: InstallmentDurationType;
  installment_schedule?: InstallmentScheduleItem[];
  status: SaleStatus;
  ownership_transferred?: boolean;
  ownership_transfer_date?: string;
  final_payment_date?: string;
  purchase_price?: number;
  total_cost?: number;
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  customer?: Customer;
  vehicle?: Vehicle;
}

// ---- Installment Types ----
export type InstallmentStatus = "pending" | "paid" | "overdue";

export interface Installment {
  id: string;
  sale_id: string;
  installment_number: number;
  due_date: string;
  amount: number;
  status: InstallmentStatus;
  payment_date?: string;
  payment_amount?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface InstallmentPlan {
  total_price: number;
  down_payment: number;
  remaining_amount: number;
  num_installments: number;
  installment_amount: number;
  frequency: "monthly" | "bi_weekly" | "weekly";
  start_date: string;
}

// ---- Showroom Expense Types ----
export type ShowroomExpenseCategory =
  | "rent"
  | "electricity"
  | "salaries"
  | "office_supplies"
  | "fuel"
  | "maintenance"
  | "other";

export interface ShowroomExpense {
  id: string;
  category: ShowroomExpenseCategory;
  amount: number;
  date: string;
  description?: string;
  created_by: string;
  created_at: string;
}

// ---- Bank Accounts ----
export interface BankAccount {
  id: string;
  name: string;
  bank_name?: string;
  account_title?: string;
  account_number?: string;
  type: "bank" | "wallet";
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ---- Audit Log Types ----
export type ActionType =
  | "create"
  | "update"
  | "delete"
  | "login"
  | "logout"
  | "payment"
  | "restore"
  | "status_change";

export interface AuditLog {
  id: string;
  user_id: string;
  username: string;
  role: UserRole;
  action_type: ActionType;
  affected_entity: string;
  entity_id: string;
  old_value?: string;
  new_value?: string;
  timestamp: string;
  device_info?: string;
  ip_address?: string;
}

// ---- Report Types ----
export interface SalesReport {
  period: string;
  total_sales: number;
  total_revenue: number;
  cash_sales: number;
  installment_sales: number;
  total_collected: number;
  total_pending: number;
}

export interface ProfitReport {
  vehicle_id: string;
  vehicle_info: string;
  purchase_price: number;
  total_expenses: number;
  total_cost: number;
  selling_price: number;
  profit: number;
}

export interface InventoryReport {
  total_vehicles: number;
  in_stock: number;
  sold: number;
  on_installments: number;
  reserved: number;
  long_staying: number;
}

// ---- Sync Types ----
export interface SyncStatus {
  last_sync: string | null;
  pending_changes: number;
  is_syncing: boolean;
  is_online: boolean;
}

// ---- Pagination ----
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ---- API Response ----
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ---- Dashboard Stats ----
export interface DashboardStats {
  totalVehicles: number;
  vehiclesInStock: number;
  vehiclesSold: number;
  vehiclesOnInstallment: number;
  totalCustomers: number;
  totalSales: number;
  totalRevenue: number;
  totalExpenses: number;
  pendingInstallments: number;
  overdueInstallments: number;
  overdueAlerts: Array<{
    installment_id: string;
    sale_id: string;
    customer_name: string;
    amount: number;
    due_date: string;
    invoice_number: string;
  }>;
  recentSales: Sale[];
  recentActivities: AuditLog[];
}

export interface BackupRecord {
  id: string;
  file_path: string;
  backup_type: "automatic" | "manual";
  created_by?: string;
  created_at: string;
}
