// ============================================================
// SHARED TYPES - Used by both main process and renderer
// ============================================================

// ---- User & Auth Types ----
export type UserRole = "super_admin" | "admin" | "staff";

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
  registration_number: string;
  chassis_number: string;
  engine_number: string;
  make: string;
  model: string;
  year: number;
  color: string;
  assembly_country: string;
  key_available: boolean;
  status: VehicleStatus;
  purchase_price: number;
  purchase_date: string;
  seller_name: string;
  seller_cnic: string;
  seller_phone: string;
  total_expenses: number;
  total_cost: number;
  selling_price?: number;
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// ---- Vehicle Expense Types ----
export type VehicleExpenseCategory =
  | "paint_repair"
  | "engine_repair"
  | "tyres_replacement"
  | "battery_replacement"
  | "travel_cost"
  | "fuel_cost"
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
  created_by: string;
  created_at: string;
}

// ---- Customer Types ----
export interface Customer {
  id: string;
  name: string;
  father_name: string;
  cnic: string;
  phone: string;
  address: string;
  photo_path?: string;
  cnic_photo_path?: string;
  witness_name?: string;
  witness_father_name?: string;
  witness_cnic?: string;
  witness_phone?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// ---- Sales Types ----
export type PaymentType = "cash" | "installment";
export type SaleStatus = "completed" | "active" | "cancelled";

export interface Sale {
  id: string;
  invoice_number: string;
  date: string;
  customer_id: string;
  vehicle_id: string;
  vehicle_price: number;
  down_payment: number;
  remaining_balance: number;
  payment_type: PaymentType;
  status: SaleStatus;
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

// ---- Inspection Types ----
export type InspectionPointStatus = "good" | "fair" | "poor" | "not_applicable";
export type DamageStatus =
  | "original"
  | "repainted"
  | "dented"
  | "replaced"
  | "scratched";

export interface Inspection {
  id: string;
  vehicle_id: string;
  inspector_id: string;
  inspector_name: string;
  date: string;
  overall_score: number;
  notes?: string;
  status: "draft" | "completed";
  created_at: string;
  updated_at: string;
  // Joined
  vehicle?: Vehicle;
  items?: InspectionItem[];
  damage_map?: DamageMapEntry[];
  photos?: InspectionPhoto[];
}

export interface InspectionItem {
  id: string;
  inspection_id: string;
  category: string;
  item_name: string;
  status: InspectionPointStatus;
  score_deduction: number;
  notes?: string;
  input_type: "dropdown" | "slider" | "radio" | "text" | "photo";
  value?: string;
}

export interface DamageMapEntry {
  id: string;
  inspection_id: string;
  panel: string;
  status: DamageStatus;
}

export interface InspectionPhoto {
  id: string;
  inspection_id: string;
  category: string;
  photo_path: string;
  caption?: string;
  created_at: string;
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
  recentSales: Sale[];
  recentActivities: AuditLog[];
}
