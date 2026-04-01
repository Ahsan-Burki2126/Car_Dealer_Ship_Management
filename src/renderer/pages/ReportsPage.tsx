import React, { useEffect, useState, useCallback } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "../store";
import {
  FiTrendingUp,
  FiDollarSign,
  FiPackage,
  FiSearch,
  FiDownload,
} from "react-icons/fi";
import { VEHICLE_EXPENSE_CATEGORIES } from "../../shared/constants";
import { toast } from "react-toastify";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import { generateSalesReportPdf } from "../utils/reportPdfGenerator";
import { getChartColors } from "../utils/themeUtils";
import AmountWords from "../components/AmountWords";

type ReportTab = "sales" | "profit" | "inventory" | "vehicle_search";

interface ChartDataPoint {
  label: string;
  sales: number;
  revenue: number;
  cash: number;
  installment: number;
}

interface SalesReport {
  period: string;
  total_sales: number;
  total_revenue: number;
  cash_sales: number;
  installment_sales: number;
  total_collected: number;
  total_pending: number;
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
interface ProfitReportItem {
  vehicle_id: string;
  vehicle_info: string;
  purchase_price: number;
  total_expenses: number;
  total_cost: number;
  selling_price: number;
  profit: number;
}
interface InventoryReport {
  total_vehicles: number;
  in_stock: number;
  sold: number;
  on_installments: number;
  reserved: number;
  long_staying: number;
}

interface VehicleSearchResult {
  vehicle: Record<string, any>;
  expenses: Array<Record<string, any>>;
  sale: Record<string, any> | null;
  installments: Array<Record<string, any>>;
  totalExpenses: number;
  totalCost: number;
  profit: number | null;
}

const PIE_COLORS = ["#3b82f6", "#8b5cf6", "#f59e0b", "#10b981", "#ef4444", "#6366f1"];
const PERIOD_LABELS: Record<string, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  annual: "Annual",
};

export default function ReportsPage() {
  const { user } = useSelector((state: RootState) => state.auth);
  const c = getChartColors();
  const [tab, setTab] = useState<ReportTab>("sales");
  const [period, setPeriod] = useState("monthly");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [salesReport, setSalesReport] = useState<SalesReport | null>(null);
  const [profitReport, setProfitReport] = useState<ProfitReportItem[]>([]);
  const [inventoryReport, setInventoryReport] =
    useState<InventoryReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Vehicle Search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<VehicleSearchResult[]>([]);
  const [expandedVehicle, setExpandedVehicle] = useState<string | null>(null);

  useEffect(() => {
    if (tab !== "vehicle_search" && period !== "custom") loadReport();
  }, [tab, period, user?.id]);

  const loadReport = async () => {
    if (!user) return;
    if (period === "custom" && (!dateFrom || !dateTo)) {
      toast.error("Please select both From and To dates");
      return;
    }
    setLoading(true);
    if (tab === "sales") {
      const result = period === "custom"
        ? await window.api.getSalesReport(user!.id, "custom", dateFrom, dateTo)
        : await window.api.getSalesReport(user!.id, period);
      if (result.success) setSalesReport(result.data);
    } else if (tab === "profit") {
      const result = period === "custom"
        ? await window.api.getProfitReport(user!.id, "custom", dateFrom, dateTo)
        : await window.api.getProfitReport(user!.id, period);
      if (result.success) setProfitReport(result.data || []);
    } else if (tab === "inventory") {
      const result = await window.api.getInventoryReport(user!.id);
      if (result.success) setInventoryReport(result.data);
    }
    setLoading(false);
  };

  const handleVehicleSearch = async () => {
    if (!user || !searchQuery.trim()) return;
    setLoading(true);
    const result = await window.api.getVehicleSearchReport(user.id, searchQuery.trim());
    if (result.success) setSearchResults(result.data || []);
    setLoading(false);
  };

  const handleExportPdf = useCallback(async () => {
    if (!salesReport || !user) return;
    setExporting(true);
    try {
      // Also load profit + inventory for the full report
      const profitRes = period === "custom"
        ? await window.api.getProfitReport(user.id, "custom", dateFrom, dateTo)
        : await window.api.getProfitReport(user.id, period);
      const invRes = await window.api.getInventoryReport(user.id);

      const doc = generateSalesReportPdf({
        period: period === "custom" ? `${dateFrom} to ${dateTo}` : (PERIOD_LABELS[period] || period),
        periodRange: salesReport.period,
        salesReport,
        profitReport: profitRes.success ? profitRes.data || [] : [],
        inventoryReport: invRes.success ? invRes.data : null,
      });

      const saved = await window.api.savePdf(
        new Uint8Array(doc.output("arraybuffer")),
        `Report_${PERIOD_LABELS[period]}_${new Date().toISOString().split("T")[0]}.pdf`,
      );
      if (saved.success && saved.data) {
        toast.success("Report PDF saved successfully");
      } else if (!saved.success) {
        toast.error(saved.error || "Failed to save report");
      }
    } catch (err) {
      toast.error("Failed to generate report PDF");
    }
    setExporting(false);
  }, [salesReport, user, period]);

  const formatCurrency = (v: number) => `PKR ${v?.toLocaleString() || "0"}`;
  const formatShort = (v: number) => {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
    return v.toString();
  };

  const tabs = [
    { id: "sales" as const, label: "Sales Report", icon: FiTrendingUp },
    { id: "profit" as const, label: "Profit Analysis", icon: FiDollarSign },
    { id: "inventory" as const, label: "Inventory Report", icon: FiPackage },
    { id: "vehicle_search" as const, label: "Vehicle Search", icon: FiSearch },
  ];

  const totalProfit = profitReport.reduce((sum, v) => sum + v.profit, 0);
  const totalInvested = profitReport.reduce((sum, v) => sum + v.total_cost, 0);

  // Pie data for payment type
  const paymentPieData = salesReport
    ? [
        { name: "Cash Sales", value: salesReport.cash_sales },
        { name: "Installment Sales", value: salesReport.installment_sales },
      ].filter((d) => d.value > 0)
    : [];

  // Pie data for collection
  const collectionPieData = salesReport
    ? [
        { name: "Collected", value: salesReport.total_collected },
        { name: "Pending", value: salesReport.total_pending },
      ].filter((d) => d.value > 0)
    : [];

  // Inventory pie
  const inventoryPieData = inventoryReport
    ? [
        { name: "In Stock", value: inventoryReport.in_stock, color: "#10b981" },
        { name: "Sold", value: inventoryReport.sold, color: "#3b82f6" },
        { name: "On Installments", value: inventoryReport.on_installments, color: "#f59e0b" },
      ].filter((d) => d.value > 0)
    : [];

  // Profit chart data
  const profitChartData = profitReport.slice(0, 15).map((v) => ({
    name: v.vehicle_info.length > 20 ? v.vehicle_info.slice(0, 20) + "..." : v.vehicle_info,
    cost: v.total_cost,
    sale: v.selling_price,
    profit: v.profit,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Reports & Analytics
        </h1>
        {tab === "sales" && salesReport && (
          <button
            onClick={handleExportPdf}
            disabled={exporting}
            className="btn-primary flex items-center gap-2"
          >
            <FiDownload size={16} />
            {exporting ? "Generating..." : "Export PDF Report"}
          </button>
        )}
      </div>

      <div className="flex gap-2 flex-wrap">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.id ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200"}`}
          >
            <t.icon size={16} /> {t.label}
          </button>
        ))}
      </div>

      {/* ── Period / Date Range Selector ── */}
      {tab !== "vehicle_search" && (
        <div className="card py-3 px-4 flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400 shrink-0">Period:</span>
          <div className="flex flex-wrap gap-2">
            {["daily", "weekly", "monthly", "annual", "custom"].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded text-sm capitalize ${period === p ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"}`}
              >
                {p === "custom" ? "Custom Range" : p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
          {period === "custom" && (
            <div className="flex flex-wrap items-center gap-2 ml-2">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="input-field w-auto text-sm"
              />
              <span className="text-gray-400 text-sm">→</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="input-field w-auto text-sm"
              />
              <button
                onClick={loadReport}
                disabled={!dateFrom || !dateTo || loading}
                className="btn-primary text-sm py-1.5 px-4 disabled:opacity-50"
              >
                Generate
              </button>
            </div>
          )}
          {tab !== "inventory" && period !== "custom" && salesReport && (
            <span className="text-xs text-gray-400 ml-auto">{salesReport.period}</span>
          )}
        </div>
      )}

      {loading && (
        <div className="text-center py-12 text-gray-500">Loading report...</div>
      )}

      {/* ═══════════════ SALES REPORT ═══════════════ */}
      {tab === "sales" && salesReport && !loading && (
        <div className="space-y-6">

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="card text-center">
              <p className="text-3xl font-bold text-blue-600">
                {salesReport.total_sales}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Sales</p>
            </div>
            <div className="card text-center">
              <p className="text-xl font-bold text-green-600">
                {formatCurrency(salesReport.total_revenue)}
              </p>
              <AmountWords value={salesReport.total_revenue} />
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Revenue</p>
            </div>
            <div className="card text-center">
              <p className="text-xl font-bold text-purple-600">
                {formatCurrency(salesReport.total_collected)}
              </p>
              <AmountWords value={salesReport.total_collected} />
              <p className="text-sm text-gray-500 dark:text-gray-400">Collected</p>
            </div>
            <div className="card text-center">
              <p className="text-xl font-bold text-red-600">
                {formatCurrency(salesReport.total_pending)}
              </p>
              <AmountWords value={salesReport.total_pending} />
              <p className="text-sm text-gray-500 dark:text-gray-400">Pending</p>
            </div>
          </div>

          {/* Revenue Trend Chart */}
          {salesReport.chart_data.length > 1 && (
            <div className="card">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                Revenue Trend
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={salesReport.chart_data}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={c.gridStroke} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: c.axisText }} />
                  <YAxis tickFormatter={formatShort} tick={{ fontSize: 11, fill: c.axisText }} />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    labelStyle={{ fontWeight: "bold" }}
                    contentStyle={{ backgroundColor: c.tooltipBg, border: `1px solid ${c.tooltipBorder}` }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                    name="Revenue"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Sales Count Bar Chart */}
          {salesReport.chart_data.length > 1 && (
            <div className="card">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                Sales by Payment Type
              </h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={salesReport.chart_data}>
                  <CartesianGrid strokeDasharray="3 3" stroke={c.gridStroke} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: c.axisText }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: c.axisText }} />
                  <Tooltip contentStyle={{ backgroundColor: c.tooltipBg, border: `1px solid ${c.tooltipBorder}` }} />
                  <Legend wrapperStyle={{ color: c.legendText }} />
                  <Bar dataKey="cash" stackId="a" fill="#3b82f6" name="Cash" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="installment" stackId="a" fill="#8b5cf6" name="Installment" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Pie Charts Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {paymentPieData.length > 0 && (
              <div className="card">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                  Payment Type Distribution
                </h3>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={paymentPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={4}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {paymentPieData.map((_, idx) => (
                        <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
            {collectionPieData.length > 0 && (
              <div className="card">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                  Collection Status
                </h3>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={collectionPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={4}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      <Cell fill="#10b981" />
                      <Cell fill="#ef4444" />
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Expense Summary */}
          {salesReport.expense_summary.total > 0 && (
            <div className="card">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                Expenses in Period
              </h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-lg font-bold text-orange-600">{formatCurrency(salesReport.expense_summary.vehicle_expenses)}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Vehicle Expenses</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-red-600">{formatCurrency(salesReport.expense_summary.showroom_expenses)}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Showroom Expenses</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(salesReport.expense_summary.total)}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Total Expenses</p>
                </div>
              </div>
            </div>
          )}

          {/* Top Sales Table */}
          {salesReport.top_vehicles.length > 0 && (
            <div className="card">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                Top Sales in Period
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr>
                      <th className="table-header">#</th>
                      <th className="table-header">Vehicle</th>
                      <th className="table-header">Customer</th>
                      <th className="table-header">Date</th>
                      <th className="table-header">Type</th>
                      <th className="table-header text-right">Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {salesReport.top_vehicles.map((v, i) => (
                      <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="table-cell">{i + 1}</td>
                        <td className="table-cell font-medium">{v.vehicle_info}</td>
                        <td className="table-cell">{v.customer_name}</td>
                        <td className="table-cell">{v.date}</td>
                        <td className="table-cell">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${v.payment_type === "cash" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"}`}>
                            {v.payment_type}
                          </span>
                        </td>
                        <td className="table-cell text-right font-semibold">{formatCurrency(v.sale_price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════ PROFIT REPORT ═══════════════ */}
      {tab === "profit" && !loading && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="card text-center bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(totalProfit)}
              </p>
              <AmountWords value={totalProfit} />
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Profit / Loss</p>
            </div>
            <div className="card text-center">
              <p className="text-2xl font-bold text-blue-600">
                {formatCurrency(totalInvested)}
              </p>
              <AmountWords value={totalInvested} />
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Invested</p>
            </div>
            <div className="card text-center">
              <p className="text-2xl font-bold text-purple-600">
                {totalInvested > 0
                  ? ((totalProfit / totalInvested) * 100).toFixed(1)
                  : "0"}
                %
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">ROI</p>
            </div>
          </div>

          {/* Profit Bar Chart */}
          {profitChartData.length > 0 && (
            <div className="card">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                Per Vehicle: Cost vs Sale Price
              </h3>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={profitChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke={c.gridStroke} />
                  <XAxis type="number" tickFormatter={formatShort} tick={{ fontSize: 10, fill: c.axisText }} />
                  <YAxis dataKey="name" type="category" width={160} tick={{ fontSize: 10, fill: c.axisText }} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ backgroundColor: c.tooltipBg, border: `1px solid ${c.tooltipBorder}` }} />
                  <Legend wrapperStyle={{ color: c.legendText }} />
                  <Bar dataKey="cost" fill="#ef4444" name="Total Cost" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="sale" fill="#10b981" name="Sale Price" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Profit Table */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
              Per Vehicle Profit
            </h3>
            {profitReport.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No vehicles sold in the selected {PERIOD_LABELS[period]?.toLowerCase() || period} period
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr>
                      <th className="table-header">Vehicle</th>
                      <th className="table-header text-right">Purchase</th>
                      <th className="table-header text-right">Expenses</th>
                      <th className="table-header text-right">Total Cost</th>
                      <th className="table-header text-right">Sale Price</th>
                      <th className="table-header text-right">Profit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {profitReport.map((v) => (
                      <tr
                        key={v.vehicle_id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                      >
                        <td className="table-cell font-medium">{v.vehicle_info}</td>
                        <td className="table-cell text-right">{formatCurrency(v.purchase_price)}</td>
                        <td className="table-cell text-right">{formatCurrency(v.total_expenses)}</td>
                        <td className="table-cell text-right">{formatCurrency(v.total_cost)}</td>
                        <td className="table-cell text-right">{formatCurrency(v.selling_price)}</td>
                        <td className={`table-cell text-right font-semibold ${v.profit >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {formatCurrency(v.profit)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50 dark:bg-gray-700/30 font-bold">
                      <td className="table-cell">TOTAL</td>
                      <td className="table-cell text-right">{formatCurrency(profitReport.reduce((s, v) => s + v.purchase_price, 0))}</td>
                      <td className="table-cell text-right">{formatCurrency(profitReport.reduce((s, v) => s + v.total_expenses, 0))}</td>
                      <td className="table-cell text-right">{formatCurrency(totalInvested)}</td>
                      <td className="table-cell text-right">{formatCurrency(profitReport.reduce((s, v) => s + v.selling_price, 0))}</td>
                      <td className={`table-cell text-right ${totalProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {formatCurrency(totalProfit)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════ INVENTORY REPORT ═══════════════ */}
      {tab === "inventory" && inventoryReport && !loading && (
        <div className="space-y-6">
          <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 text-sm text-blue-700 dark:text-blue-300">
            <span>📦</span>
            <span>Inventory report shows the <strong>current live status</strong> of all vehicles in the system.</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="card text-center">
              <p className="text-3xl font-bold text-blue-600">{inventoryReport.total_vehicles}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Purchased</p>
            </div>
            <div className="card text-center">
              <p className="text-3xl font-bold text-green-600">{inventoryReport.in_stock}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Cars in Stock</p>
            </div>
            <div className="card text-center">
              <p className="text-3xl font-bold text-purple-600">{inventoryReport.sold}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Sold</p>
            </div>
            <div className="card text-center">
              <p className="text-3xl font-bold text-yellow-600">{inventoryReport.on_installments}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">On Installments</p>
            </div>
            <div className="card text-center">
              <p className="text-3xl font-bold text-orange-600">{inventoryReport.long_staying}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Long Staying (60+ days)</p>
            </div>
          </div>

          {/* Inventory Pie Chart */}
          {inventoryPieData.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="card">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                  Inventory Distribution
                </h3>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={inventoryPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {inventoryPieData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="card">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                  Status Breakdown
                </h3>
                <div className="space-y-3">
                  {[
                    { label: "In Stock", count: inventoryReport.in_stock, color: "bg-green-600" },
                    { label: "Sold", count: inventoryReport.sold, color: "bg-blue-600" },
                    { label: "On Installments", count: inventoryReport.on_installments, color: "bg-yellow-500" },
                    { label: "Long Staying", count: inventoryReport.long_staying, color: "bg-orange-500" },
                  ].map((s) => {
                    const pct = inventoryReport.total_vehicles > 0 ? (s.count / inventoryReport.total_vehicles) * 100 : 0;
                    return (
                      <div key={s.label}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-700 dark:text-gray-300">{s.label}</span>
                          <span className="font-medium">{s.count} ({pct.toFixed(0)}%)</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                          <div className={`${s.color} h-3 rounded-full transition-all`} style={{ width: `${pct}%` }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════ VEHICLE SEARCH ═══════════════ */}
      {tab === "vehicle_search" && !loading && (
        <div className="space-y-6">
          <div className="card">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
              Search Vehicle Complete Report
            </h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleVehicleSearch()}
                placeholder="Search by registration, chassis, engine number, make, model, or seller name..."
                className="input-field flex-1"
              />
              <button onClick={handleVehicleSearch} className="btn-primary flex items-center gap-2">
                <FiSearch size={16} /> Search
              </button>
            </div>
          </div>

          {searchResults.length > 0 && (
            <div className="space-y-4">
              {searchResults.map((result) => {
                const v = result.vehicle;
                const isExpanded = expandedVehicle === (v.id as string);
                return (
                  <div key={v.id as string} className="card">
                    <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpandedVehicle(isExpanded ? null : (v.id as string))}>
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white">{(v as any).year_of_manufacture || v.year} {v.make} {v.model}</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Reg: {v.registration_number || "N/A"} | Chassis: {v.chassis_number || "N/A"} | Status: {v.status}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">Cost: {formatCurrency(result.totalCost)}</p>
                        {result.profit !== null && (
                          <p className={`text-sm font-semibold ${result.profit >= 0 ? "text-green-600" : "text-red-600"}`}>
                            {result.profit >= 0 ? "Profit" : "Loss"}: {formatCurrency(Math.abs(result.profit))}
                          </p>
                        )}
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <div><span className="text-gray-500">Purchase Price:</span> <span className="ml-1 font-medium">{formatCurrency(Number(v.purchase_price || 0))}</span></div>
                          <div><span className="text-gray-500">Total Expenses:</span> <span className="ml-1 font-medium text-orange-600">{formatCurrency(result.totalExpenses)}</span></div>
                          <div><span className="text-gray-500">Total Cost:</span> <span className="ml-1 font-bold">{formatCurrency(result.totalCost)}</span></div>
                          <div><span className="text-gray-500">Seller:</span> <span className="ml-1 font-medium">{v.seller_name || "N/A"}</span></div>
                        </div>
                        {result.expenses.length > 0 && (
                          <div>
                            <h5 className="font-medium text-gray-900 dark:text-white mb-2">Expenses ({result.expenses.length})</h5>
                            <div className="overflow-x-auto">
                              <table className="min-w-full text-sm">
                                <thead><tr><th className="table-header">Category</th><th className="table-header text-right">Amount</th><th className="table-header">Date</th><th className="table-header">Notes</th></tr></thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                  {result.expenses.map((exp) => (
                                    <tr key={exp.id as string}>
                                      <td className="table-cell">{VEHICLE_EXPENSE_CATEGORIES.find((c) => c.value === exp.category)?.label || exp.category}</td>
                                      <td className="table-cell text-right font-medium">{formatCurrency(Number(exp.amount || 0))}</td>
                                      <td className="table-cell">{exp.date}</td>
                                      <td className="table-cell">{exp.notes || "-"}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                        {result.sale && (
                          <div>
                            <h5 className="font-medium text-gray-900 dark:text-white mb-2">Sale Information</h5>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                              <div><span className="text-gray-500">Invoice:</span> <span className="ml-1 font-medium">{result.sale.invoice_number}</span></div>
                              <div><span className="text-gray-500">Customer:</span> <span className="ml-1 font-medium">{result.sale.customer_name || "N/A"}</span></div>
                              <div><span className="text-gray-500">Sale Price:</span> <span className="ml-1 font-medium">{formatCurrency(Number(result.sale.vehicle_price || 0))}</span></div>
                              <div><span className="text-gray-500">Status:</span> <span className={`ml-1 font-medium ${result.sale.status === "completed" ? "text-green-600" : "text-yellow-600"}`}>{result.sale.status}</span></div>
                            </div>
                          </div>
                        )}
                        {result.installments.length > 0 && (
                          <div>
                            <h5 className="font-medium text-gray-900 dark:text-white mb-2">Installments ({result.installments.filter((i) => i.status === "paid").length}/{result.installments.length} paid)</h5>
                            <div className="overflow-x-auto">
                              <table className="min-w-full text-sm">
                                <thead><tr><th className="table-header">#</th><th className="table-header">Due Date</th><th className="table-header text-right">Amount</th><th className="table-header">Status</th><th className="table-header">Paid Date</th></tr></thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                  {result.installments.map((inst) => (
                                    <tr key={inst.id as string}>
                                      <td className="table-cell">{inst.installment_number}</td>
                                      <td className="table-cell">{inst.due_date}</td>
                                      <td className="table-cell text-right">{formatCurrency(Number(inst.amount || 0))}</td>
                                      <td className="table-cell">
                                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${inst.status === "paid" ? "bg-green-100 text-green-700" : inst.status === "overdue" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>{inst.status}</span>
                                      </td>
                                      <td className="table-cell">{inst.payment_date || "-"}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {searchResults.length === 0 && searchQuery && !loading && (
            <div className="text-center py-8 text-gray-500">No vehicles found matching "{searchQuery}"</div>
          )}
        </div>
      )}
    </div>
  );
}
