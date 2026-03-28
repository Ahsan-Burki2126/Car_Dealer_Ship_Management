import { getDatabase } from "../database/init";
import { format, subDays, subMonths, subWeeks, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval } from "date-fns";
import type {
  DashboardStats,
  SalesReport,
  ProfitReport,
  InventoryReport,
  AuditLog,
} from "../../shared/types";

// ── Chart data point for time-series ───────────────────────────────────
export interface ChartDataPoint {
  label: string;
  sales: number;
  revenue: number;
  cash: number;
  installment: number;
}

// ── Enhanced sales report with chart breakdown ─────────────────────────
export interface EnhancedSalesReport extends SalesReport {
  chart_data: ChartDataPoint[];
  top_vehicles: Array<{
    vehicle_info: string;
    sale_price: number;
    customer_name: string;
    date: string;
    payment_type: string;
  }>;
  expense_summary: {
    vehicle_expenses: number;
    showroom_expenses: number;
    total: number;
  };
}

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

  const overdueAlerts = db
    .prepare(
      `
    SELECT i.id as installment_id, i.sale_id, c.name as customer_name, i.amount, i.due_date, s.invoice_number
    FROM installments i
    JOIN sales s ON s.id = i.sale_id
    JOIN customers c ON c.id = s.customer_id
    WHERE i.status IN ('pending', 'overdue') AND i.due_date < date('now')
    ORDER BY i.due_date ASC
    LIMIT 8
  `,
    )
    .all() as Array<{
    installment_id: string;
    sale_id: string;
    customer_name: string;
    amount: number;
    due_date: string;
    invoice_number: string;
  }>;

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
    overdueAlerts,
    recentSales,
    recentActivities: [] as AuditLog[],
  };
}

export function getSalesReport(
  period: "daily" | "weekly" | "monthly" | "annual",
  date?: string,
): EnhancedSalesReport {
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

  // ── Chart breakdown data ───────────────────────────────────────────
  const chart_data = getChartBreakdown(db, period, startDate, endDate, baseDate);

  // ── Top vehicles sold in period ────────────────────────────────────
  const topVehicles = db
    .prepare(
      `
    SELECT s.vehicle_price, s.date, s.payment_type,
      (v.year || ' ' || v.make || ' ' || v.model) as vehicle_info,
      c.name as customer_name
    FROM sales s
    LEFT JOIN vehicles v ON s.vehicle_id = v.id
    LEFT JOIN customers c ON s.customer_id = c.id
    WHERE s.is_deleted = 0 AND s.date BETWEEN ? AND ?
    ORDER BY s.vehicle_price DESC
    LIMIT 10
  `,
    )
    .all(startDate, endDate) as Array<{
    vehicle_info: string;
    sale_price: number;
    customer_name: string;
    date: string;
    payment_type: string;
    vehicle_price: number;
  }>;

  // ── Expense summary ────────────────────────────────────────────────
  const vehicleExp = db
    .prepare(
      `SELECT COALESCE(SUM(amount), 0) as total FROM vehicle_expenses WHERE date BETWEEN ? AND ?`,
    )
    .get(startDate, endDate) as any;

  const showroomExp = db
    .prepare(
      `SELECT COALESCE(SUM(amount), 0) as total FROM showroom_expenses WHERE date BETWEEN ? AND ?`,
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
    chart_data,
    top_vehicles: topVehicles.map((v) => ({
      vehicle_info: v.vehicle_info,
      sale_price: v.vehicle_price,
      customer_name: v.customer_name,
      date: v.date,
      payment_type: v.payment_type,
    })),
    expense_summary: {
      vehicle_expenses: vehicleExp.total,
      showroom_expenses: showroomExp.total,
      total: vehicleExp.total + showroomExp.total,
    },
  };
}

function getChartBreakdown(
  db: ReturnType<typeof getDatabase>,
  period: string,
  startDate: string,
  endDate: string,
  baseDate: Date,
): ChartDataPoint[] {
  if (period === "daily") {
    // Hourly breakdown not practical for sqlite date, return single point
    return [
      getSalesDataForRange(db, startDate, endDate, format(baseDate, "dd MMM")),
    ];
  }

  if (period === "weekly") {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = eachDayOfInterval({ start, end });
    return days.map((d) => {
      const ds = format(d, "yyyy-MM-dd");
      return getSalesDataForRange(db, ds, ds, format(d, "EEE dd"));
    });
  }

  if (period === "monthly") {
    // Break into ~4 weeks
    const start = new Date(startDate);
    const end = new Date(endDate);
    const weeks = eachWeekOfInterval({ start, end }, { weekStartsOn: 1 });
    return weeks.map((w, idx) => {
      const ws = format(w, "yyyy-MM-dd");
      const we = idx < weeks.length - 1
        ? format(subDays(weeks[idx + 1], 1), "yyyy-MM-dd")
        : endDate;
      return getSalesDataForRange(db, ws, we, format(w, "dd MMM"));
    });
  }

  // Annual: monthly breakdown
  const months: ChartDataPoint[] = [];
  for (let i = 11; i >= 0; i--) {
    const m = subMonths(baseDate, i);
    const ms = format(startOfMonth(m), "yyyy-MM-dd");
    const me = format(endOfMonth(m), "yyyy-MM-dd");
    months.push(getSalesDataForRange(db, ms, me, format(m, "MMM yy")));
  }
  return months;
}

function getSalesDataForRange(
  db: ReturnType<typeof getDatabase>,
  start: string,
  end: string,
  label: string,
): ChartDataPoint {
  const row = db
    .prepare(
      `
    SELECT
      COUNT(*) as sales,
      COALESCE(SUM(vehicle_price), 0) as revenue,
      SUM(CASE WHEN payment_type = 'cash' THEN 1 ELSE 0 END) as cash,
      SUM(CASE WHEN payment_type = 'installment' THEN 1 ELSE 0 END) as installment
    FROM sales
    WHERE is_deleted = 0 AND date BETWEEN ? AND ?
  `,
    )
    .get(start, end) as any;

  return {
    label,
    sales: row.sales || 0,
    revenue: row.revenue || 0,
    cash: row.cash || 0,
    installment: row.installment || 0,
  };
}

export function getProfitReport(
  period?: "daily" | "weekly" | "monthly" | "annual",
  date?: string,
): ProfitReport[] {
  const db = getDatabase();
  const baseDate = date ? new Date(date) : new Date();
  let dateFilter = "";
  let params: string[] = [];

  if (period) {
    let startDate: string;
    const endDate = format(baseDate, "yyyy-MM-dd");
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
    dateFilter = "AND s.date BETWEEN ? AND ?";
    params = [startDate!, endDate];
  }

  const rows = db
    .prepare(
      `
    SELECT v.id, v.make, v.model, v.year, v.registration_number,
      v.purchase_price, v.total_expenses, v.total_cost,
      COALESCE(s.vehicle_price, 0) as selling_price
    FROM vehicles v
    LEFT JOIN sales s ON v.id = s.vehicle_id AND s.is_deleted = 0
    WHERE v.is_deleted = 0 AND v.status IN ('sold', 'on_installments')
    ${dateFilter}
    ORDER BY s.date DESC
  `,
    )
    .all(...params) as any[];

  return rows.map((row) => ({
    vehicle_id: row.id,
    vehicle_info: `${row.year} ${row.make} ${row.model} (${row.registration_number || "N/A"})`,
    purchase_price: row.purchase_price,
    total_expenses: row.total_expenses,
    total_cost: row.total_cost,
    selling_price: row.selling_price,
    profit: row.selling_price - row.total_cost,
  }));
}

export function getInventoryReport(): InventoryReport {
  const db = getDatabase();
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

export interface VehicleSearchReport {
  vehicle: Record<string, unknown>;
  expenses: Array<Record<string, unknown>>;
  sale: Record<string, unknown> | null;
  installments: Array<Record<string, unknown>>;
  totalExpenses: number;
  totalCost: number;
  profit: number | null;
}

export function getVehicleSearchReport(search: string): VehicleSearchReport[] {
  const db = getDatabase();
  const query = `%${search}%`;
  const vehicles = db
    .prepare(
      `SELECT * FROM vehicles WHERE is_deleted = 0
       AND (registration_number LIKE ? OR chassis_number LIKE ? OR engine_number LIKE ?
            OR make LIKE ? OR model LIKE ? OR seller_name LIKE ?)
       ORDER BY created_at DESC LIMIT 20`,
    )
    .all(query, query, query, query, query, query) as Array<Record<string, unknown>>;

  return vehicles.map((v) => {
    const expenses = db
      .prepare("SELECT * FROM vehicle_expenses WHERE vehicle_id = ? ORDER BY date DESC")
      .all(v.id as string) as Array<Record<string, unknown>>;

    const sale = db
      .prepare(
        `SELECT s.*, c.name as customer_name, c.phone as customer_phone, c.cnic as customer_cnic
         FROM sales s LEFT JOIN customers c ON s.customer_id = c.id
         WHERE s.vehicle_id = ? AND s.is_deleted = 0 LIMIT 1`,
      )
      .get(v.id as string) as Record<string, unknown> | undefined;

    const installments = sale
      ? (db
          .prepare("SELECT * FROM installments WHERE sale_id = ? ORDER BY installment_number ASC")
          .all(sale.id as string) as Array<Record<string, unknown>>)
      : [];

    const totalExpenses = Number(v.total_expenses || 0);
    const totalCost = Number(v.total_cost || 0);
    const sellingPrice = sale ? Number(sale.vehicle_price || 0) : null;
    const profit = sellingPrice !== null ? sellingPrice - totalCost : null;

    return {
      vehicle: v,
      expenses,
      sale: sale || null,
      installments,
      totalExpenses,
      totalCost,
      profit,
    };
  });
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
