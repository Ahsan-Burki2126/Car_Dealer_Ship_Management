// Shared constants used across the application

export const APP_NAME = "Dealership Management System";
export const APP_VERSION = "1.0.0";

export const VEHICLE_STATUSES = [
  { value: "purchased", label: "Purchased" },
  { value: "in_stock", label: "In Stock" },
  { value: "reserved", label: "Reserved" },
  { value: "sold", label: "Sold" },
  { value: "on_installments", label: "On Installments" },
] as const;

export const VEHICLE_EXPENSE_CATEGORIES = [
  { value: "paint_repair", label: "Paint Repair" },
  { value: "engine_repair", label: "Engine Repair" },
  { value: "tyres_replacement", label: "Tyres Replacement" },
  { value: "battery_replacement", label: "Battery Replacement" },
  { value: "travel_cost", label: "Travel Cost" },
  { value: "fuel_cost", label: "Fuel Cost" },
  { value: "transportation_cost", label: "Transportation Cost" },
  { value: "cleaning_cost", label: "Cleaning Cost" },
  { value: "other", label: "Other" },
] as const;

export const SHOWROOM_EXPENSE_CATEGORIES = [
  { value: "rent", label: "Rent" },
  { value: "electricity", label: "Electricity" },
  { value: "salaries", label: "Salaries" },
  { value: "office_supplies", label: "Office Supplies" },
  { value: "fuel", label: "Fuel" },
  { value: "maintenance", label: "Maintenance" },
  { value: "other", label: "Other" },
] as const;

export const PAYMENT_TYPES = [
  { value: "cash", label: "Cash Sale" },
  { value: "installment", label: "Installment Sale" },
] as const;

export const CASH_PAYMENT_METHODS = [
  { value: "hard_cash", label: "Hard Cash" },
  { value: "bank_transfer", label: "Bank Transfer" },
] as const;

export const INSTALLMENT_DURATION_TYPES = [
  { value: "days", label: "Days" },
  { value: "months", label: "Months" },
  { value: "years", label: "Years" },
] as const;

export const INSTALLMENT_FREQUENCIES = [
  { value: "days", label: "Days" },
  { value: "months", label: "Months" },
  { value: "years", label: "Years" },
  { value: "monthly", label: "Monthly" },
  { value: "bi_weekly", label: "Bi-Weekly" },
  { value: "weekly", label: "Weekly" },
] as const;

export const USER_ROLES = [
  { value: "super_admin", label: "Super Admin" },
  { value: "admin", label: "Admin" },
  { value: "staff", label: "Staff" },
] as const;

export const INSPECTION_CATEGORIES = [
  { value: "Exterior", label: "Exterior" },
  { value: "Interior", label: "Interior" },
  { value: "Engine", label: "Engine" },
  { value: "Suspension", label: "Suspension" },
  { value: "Electronics", label: "Electronics" },
  { value: "Underbody", label: "Underbody" },
  { value: "Tyres & Brakes", label: "Tyres & Brakes" },
] as const;

export const DAMAGE_STATUSES = [
  { value: "original", label: "Original", color: "#10b981" },
  { value: "scratch", label: "Scratch", color: "#facc15" },
  { value: "dent", label: "Dent", color: "#f97316" },
  { value: "repainted", label: "Repainted", color: "#f59e0b" },
  { value: "rust", label: "Rust", color: "#92400e" },
  { value: "cracked", label: "Cracked", color: "#ef4444" },
  { value: "replaced", label: "Replaced", color: "#dc2626" },
] as const;

export const CAR_PANELS = [
  "front_bumper",
  "rear_bumper",
  "bonnet",
  "trunk",
  "roof",
  "left_front_door",
  "left_rear_door",
  "right_front_door",
  "right_rear_door",
  "left_front_fender",
  "left_rear_fender",
  "right_front_fender",
  "right_rear_fender",
] as const;

export const PANEL_LABELS: Record<string, string> = {
  front_bumper: "Front Bumper",
  rear_bumper: "Rear Bumper",
  bonnet: "Bonnet/Hood",
  trunk: "Trunk/Boot",
  roof: "Roof",
  left_front_door: "Left Front Door",
  left_rear_door: "Left Rear Door",
  right_front_door: "Right Front Door",
  right_rear_door: "Right Rear Door",
  left_front_fender: "Left Front Fender",
  left_rear_fender: "Left Rear Fender",
  right_front_fender: "Right Front Fender",
  right_rear_fender: "Right Rear Fender",
};
