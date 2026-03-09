import { getDatabase } from "../database/init";
import { format, subDays } from "date-fns";
import type {
  DashboardStats,
  SalesReport,
  ProfitReport,
  InventoryReport,
  AuditLog,
} from "../../shared/types";

export function getDashboardStats(): DashboardStats {
  const db = getDatabase();

  const vehicles = db
    .prepare(
      `
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'in_stock' THEN 1 ELSE 0 END) as in_stock,
      SUM(CASE WHEN status = 'sold' THEN 1 ELSE 0 END) as sold,
      SUM(CASE WHEN status = 'on_installments' THEN 1 ELSE 0 END) as on_installment
    FROM vehicles WHERE is_deleted = 0
  `,
    )
    .get() as any;

  const customers = db
    .prepare("SELECT COUNT(*) as count FROM customers WHERE is_deleted = 0")
    .get() as any;

  const salesData = db
    .prepare(
      `
    SELECT COUNT(*) as count, COALESCE(SUM(vehicle_price), 0) as revenue
    FROM sales WHERE is_deleted = 0
  `,
    )
    .get() as any;

  const expenses = db
    .prepare(
      `
    SELECT COALESCE(SUM(amount), 0) as total
    FROM showroom_expenses
  `,
    )
    .get() as any;

  const vehicleExpenses = db
    .prepare(
      `
    SELECT COALESCE(SUM(amount), 0) as total FROM vehicle_expenses
  `,
    )
    .get() as any;

  const pendingInstallments = db
    .prepare(
      `
    SELECT COUNT(*) as count FROM installments WHERE status = 'pending'
  `,
    )
    .get() as any;

  const overdueInstallments = db
    .prepare(
      `
    SELECT COUNT(*) as count FROM installments WHERE status = 'overdue' OR (status = 'pending' AND due_date < date('now'))
  `,
    )
    .get() as any;

  const recentSales = db
    .prepare(
      `
    SELECT s.*, c.name as customer_name, v.make, v.model, v.year
    FROM sales s
    LEFT JOIN customers c ON s.customer_id = c.id
    LEFT JOIN vehicles v ON s.vehicle_id = v.id
    WHERE s.is_deleted = 0
    ORDER BY s.created_at DESC LIMIT 5
  `,
    )
    .all() as any[];

  const recentActivities = db
    .prepare(
      `
    SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 10
  `,
    )
    .all() as AuditLog[];

  return {
    totalVehicles: vehicles.total,
    vehiclesInStock: vehicles.in_stock,
    vehiclesSold: vehicles.sold,
    vehiclesOnInstallment: vehicles.on_installment,
    totalCustomers: customers.count,
    totalSales: salesData.count,
    totalRevenue: salesData.revenue,
    totalExpenses: expenses.total + vehicleExpenses.total,
    pendingInstallments: pendingInstallments.count,
    overdueInstallments: overdueInstallments.count,
    recentSales,
    recentActivities,
  };
}

export function getSalesReport(
  period: "daily" | "weekly" | "monthly" | "annual",
  date?: string,
): SalesReport {
  const db = getDatabase();
  const baseDate = date ? new Date(date) : new Date();
  let startDate: string;
  let endDate: string = format(baseDate, "yyyy-MM-dd");

  switch (period) {
    case "daily":
      startDate = endDate;
      break;
    case "weekly":
      startDate = format(subDays(baseDate, 7), "yyyy-MM-dd");
      break;
    case "monthly":
      startDate = format(subDays(baseDate, 30), "yyyy-MM-dd");
      break;
    case "annual":
      startDate = format(subDays(baseDate, 365), "yyyy-MM-dd");
      break;
  }

  const salesData = db
    .prepare(
      `
    SELECT
      COUNT(*) as total_sales,
      COALESCE(SUM(vehicle_price), 0) as total_revenue,
      SUM(CASE WHEN payment_type = 'cash' THEN 1 ELSE 0 END) as cash_sales,
      SUM(CASE WHEN payment_type = 'installment' THEN 1 ELSE 0 END) as installment_sales
    FROM sales
    WHERE is_deleted = 0 AND date BETWEEN ? AND ?
  `,
    )
    .get(startDate, endDate) as any;

  const collected = db
    .prepare(
      `
    SELECT COALESCE(SUM(p.amount), 0) as total
    FROM payments p
    JOIN sales s ON p.sale_id = s.id
    WHERE s.date BETWEEN ? AND ?
  `,
    )
    .get(startDate, endDate) as any;

  const pending = db
    .prepare(
      `
    SELECT COALESCE(SUM(remaining_balance), 0) as total
    FROM sales
    WHERE is_deleted = 0 AND date BETWEEN ? AND ? AND status = 'active'
  `,
    )
    .get(startDate, endDate) as any;

  return {
    period: `${startDate} to ${endDate}`,
    total_sales: salesData.total_sales,
    total_revenue: salesData.total_revenue,
    cash_sales: salesData.cash_sales,
    installment_sales: salesData.installment_sales,
    total_collected: collected.total,
    total_pending: pending.total,
  };
}

export function getProfitReport(): ProfitReport[] {
  const db = getDatabase();
  const rows = db
    .prepare(
      `
    SELECT v.id, v.make, v.model, v.year, v.registration_number,
      v.purchase_price, v.total_expenses, v.total_cost,
      COALESCE(s.vehicle_price, 0) as selling_price
    FROM vehicles v
    LEFT JOIN sales s ON v.id = s.vehicle_id AND s.is_deleted = 0
    WHERE v.is_deleted = 0 AND v.status IN ('sold', 'on_installments')
    ORDER BY s.date DESC
  `,
    )
    .all() as any[];

  return rows.map((row) => ({
    vehicle_id: row.id,
    vehicle_info: `${row.year} ${row.make} ${row.model} (${row.registration_number})`,
    purchase_price: row.purchase_price,
    total_expenses: row.total_expenses,
    total_cost: row.total_cost,
    selling_price: row.selling_price,
    profit: row.selling_price - row.total_cost,
  }));
}

export function getInventoryReport(): InventoryReport {
  const db = getDatabase();
  const today = format(new Date(), "yyyy-MM-dd");
  const sixtyDaysAgo = format(subDays(new Date(), 60), "yyyy-MM-dd");

  const stats = db
    .prepare(
      `
    SELECT
      COUNT(*) as total_vehicles,
      SUM(CASE WHEN status = 'in_stock' THEN 1 ELSE 0 END) as in_stock,
      SUM(CASE WHEN status = 'sold' THEN 1 ELSE 0 END) as sold,
      SUM(CASE WHEN status = 'on_installments' THEN 1 ELSE 0 END) as on_installments,
      SUM(CASE WHEN status = 'reserved' THEN 1 ELSE 0 END) as reserved,
      SUM(CASE WHEN status = 'in_stock' AND purchase_date <= ? THEN 1 ELSE 0 END) as long_staying
    FROM vehicles WHERE is_deleted = 0
  `,
    )
    .get(sixtyDaysAgo) as any;

  return {
    total_vehicles: stats.total_vehicles,
    in_stock: stats.in_stock,
    sold: stats.sold,
    on_installments: stats.on_installments,
    reserved: stats.reserved,
    long_staying: stats.long_staying,
  };
}

export function getAuditLogs(filters?: {
  userId?: string;
  entity?: string;
  page?: number;
  limit?: number;
}): { data: AuditLog[]; total: number } {
  const db = getDatabase();
  let whereClause = "WHERE 1=1";
  const params: any[] = [];

  if (filters?.userId) {
    whereClause += " AND user_id = ?";
    params.push(filters.userId);
  }

  if (filters?.entity) {
    whereClause += " AND affected_entity = ?";
    params.push(filters.entity);
  }

  const countRow = db
    .prepare(`SELECT COUNT(*) as count FROM audit_logs ${whereClause}`)
    .get(...params) as any;
  const page = filters?.page || 1;
  const limit = filters?.limit || 50;
  const offset = (page - 1) * limit;

  const rows = db
    .prepare(
      `SELECT * FROM audit_logs ${whereClause} ORDER BY timestamp DESC LIMIT ? OFFSET ?`,
    )
    .all(...params, limit, offset) as AuditLog[];

  return { data: rows, total: countRow.count };
}
