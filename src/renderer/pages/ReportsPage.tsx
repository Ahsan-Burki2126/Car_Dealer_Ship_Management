import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "../store";
import {
  FiTrendingUp,
  FiDollarSign,
  FiPackage,
  FiCalendar,
} from "react-icons/fi";

type ReportTab = "sales" | "profit" | "inventory";

interface SalesReport {
  period: string;
  total_sales: number;
  total_revenue: number;
  cash_sales: number;
  installment_sales: number;
  total_collected: number;
  total_pending: number;
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

export default function ReportsPage() {
  const { user } = useSelector((state: RootState) => state.auth);
  const [tab, setTab] = useState<ReportTab>("sales");
  const [period, setPeriod] = useState("monthly");
  const [salesReport, setSalesReport] = useState<SalesReport | null>(null);
  const [profitReport, setProfitReport] = useState<ProfitReportItem[]>([]);
  const [inventoryReport, setInventoryReport] =
    useState<InventoryReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadReport();
  }, [tab, period, user?.id]);

  const loadReport = async () => {
    if (!user) return;
    setLoading(true);
    if (tab === "sales") {
      const result = await window.api.getSalesReport(user!.id, period);
      if (result.success) setSalesReport(result.data);
    } else if (tab === "profit") {
      const result = await window.api.getProfitReport(user!.id);
      if (result.success) setProfitReport(result.data || []);
    } else {
      const result = await window.api.getInventoryReport(user!.id);
      if (result.success) setInventoryReport(result.data);
    }
    setLoading(false);
  };

  const formatCurrency = (v: number) => `PKR ${v?.toLocaleString() || "0"}`;

  const tabs = [
    { id: "sales" as const, label: "Sales Report", icon: FiTrendingUp },
    { id: "profit" as const, label: "Profit Analysis", icon: FiDollarSign },
    { id: "inventory" as const, label: "Inventory Report", icon: FiPackage },
  ];

  const totalProfit = profitReport.reduce((sum, v) => sum + v.profit, 0);
  const totalInvested = profitReport.reduce((sum, v) => sum + v.total_cost, 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
        Reports & Analytics
      </h1>

      <div className="flex gap-2">
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

      {loading && (
        <div className="text-center py-12 text-gray-500">Loading report...</div>
      )}

      {/* Sales Report */}
      {tab === "sales" && salesReport && !loading && (
        <div className="space-y-6">
          <div className="flex gap-2">
            {["daily", "weekly", "monthly", "annual"].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded text-sm ${period === p ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"}`}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>

          <div className="text-xs text-gray-400 mb-2">
            Period: {salesReport.period}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="card text-center">
              <p className="text-3xl font-bold text-blue-600">
                {salesReport.total_sales}
              </p>
              <p className="text-sm text-gray-500">Total Sales</p>
            </div>
            <div className="card text-center">
              <p className="text-xl font-bold text-green-600">
                {formatCurrency(salesReport.total_revenue)}
              </p>
              <p className="text-sm text-gray-500">Total Revenue</p>
            </div>
            <div className="card text-center">
              <p className="text-xl font-bold text-purple-600">
                {formatCurrency(salesReport.total_collected)}
              </p>
              <p className="text-sm text-gray-500">Collected</p>
            </div>
            <div className="card text-center">
              <p className="text-xl font-bold text-red-600">
                {formatCurrency(salesReport.total_pending)}
              </p>
              <p className="text-sm text-gray-500">Pending</p>
            </div>
          </div>

          <div className="card">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
              By Payment Type
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900 dark:text-white">
                    Cash
                  </span>
                  <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                    {salesReport.cash_sales} sales
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900 dark:text-white">
                    Installment
                  </span>
                  <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                    {salesReport.installment_sales} sales
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Profit Report */}
      {tab === "profit" && !loading && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="card text-center bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(totalProfit)}
              </p>
              <p className="text-sm text-gray-500">Total Profit</p>
            </div>
            <div className="card text-center">
              <p className="text-2xl font-bold text-blue-600">
                {formatCurrency(totalInvested)}
              </p>
              <p className="text-sm text-gray-500">Total Invested</p>
            </div>
            <div className="card text-center">
              <p className="text-2xl font-bold text-purple-600">
                {totalInvested > 0
                  ? ((totalProfit / totalInvested) * 100).toFixed(1)
                  : "0"}
                %
              </p>
              <p className="text-sm text-gray-500">ROI</p>
            </div>
          </div>

          <div className="card">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
              Per Vehicle Profit
            </h3>
            {profitReport.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No sold vehicles yet
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
                        <td className="table-cell font-medium">
                          {v.vehicle_info}
                        </td>
                        <td className="table-cell text-right">
                          {formatCurrency(v.purchase_price)}
                        </td>
                        <td className="table-cell text-right">
                          {formatCurrency(v.total_expenses)}
                        </td>
                        <td className="table-cell text-right">
                          {formatCurrency(v.total_cost)}
                        </td>
                        <td className="table-cell text-right">
                          {formatCurrency(v.selling_price)}
                        </td>
                        <td
                          className={`table-cell text-right font-semibold ${v.profit >= 0 ? "text-green-600" : "text-red-600"}`}
                        >
                          {formatCurrency(v.profit)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Inventory Report */}
      {tab === "inventory" && inventoryReport && !loading && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="card text-center">
              <p className="text-3xl font-bold text-blue-600">
                {inventoryReport.total_vehicles}
              </p>
              <p className="text-sm text-gray-500">Total Vehicles</p>
            </div>
            <div className="card text-center">
              <p className="text-3xl font-bold text-green-600">
                {inventoryReport.in_stock}
              </p>
              <p className="text-sm text-gray-500">In Stock</p>
            </div>
            <div className="card text-center">
              <p className="text-3xl font-bold text-purple-600">
                {inventoryReport.sold}
              </p>
              <p className="text-sm text-gray-500">Sold</p>
            </div>
            <div className="card text-center">
              <p className="text-3xl font-bold text-yellow-600">
                {inventoryReport.on_installments}
              </p>
              <p className="text-sm text-gray-500">On Installments</p>
            </div>
            <div className="card text-center">
              <p className="text-3xl font-bold text-orange-600">
                {inventoryReport.long_staying}
              </p>
              <p className="text-sm text-gray-500">Long Staying (60+ days)</p>
            </div>
          </div>

          <div className="card">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
              Status Breakdown
            </h3>
            <div className="space-y-3">
              {[
                {
                  label: "In Stock",
                  count: inventoryReport.in_stock,
                  color: "bg-green-600",
                },
                {
                  label: "Sold",
                  count: inventoryReport.sold,
                  color: "bg-blue-600",
                },
                {
                  label: "On Installments",
                  count: inventoryReport.on_installments,
                  color: "bg-yellow-500",
                },
                {
                  label: "Reserved",
                  count: inventoryReport.reserved,
                  color: "bg-purple-600",
                },
              ].map((s) => {
                const pct =
                  inventoryReport.total_vehicles > 0
                    ? (s.count / inventoryReport.total_vehicles) * 100
                    : 0;
                return (
                  <div key={s.label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700 dark:text-gray-300">
                        {s.label}
                      </span>
                      <span className="font-medium">
                        {s.count} ({pct.toFixed(0)}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                      <div
                        className={`${s.color} h-3 rounded-full transition-all`}
                        style={{ width: `${pct}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
