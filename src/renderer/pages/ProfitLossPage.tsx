import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "../store";
import { fmtDate } from "../utils/dateUtils";
import { VEHICLE_STATUSES } from "../../shared/constants";
import { FiSearch, FiTrendingUp, FiTrendingDown, FiChevronLeft, FiChevronRight } from "react-icons/fi";
import AmountWords from "../components/AmountWords";

interface ProfitRow {
  id: string;
  make: string;
  model: string;
  year: number;
  registration_number: string;
  chassis_number: string;
  status: string;
  purchase_price: number;
  total_expenses: number;
  total_cost: number;
  selling_price: number | null;
  profit: number | null;
  sale_date: string | null;
  customer_name: string | null;
}

const fmt = (v: number) => `PKR ${v?.toLocaleString() || "0"}`;

export default function ProfitLossPage() {
  const { user } = useSelector((state: RootState) => state.auth);
  const [rows, setRows] = useState<ProfitRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const limit = 25;

  useEffect(() => {
    loadReport();
  }, [search, statusFilter, page]);

  const loadReport = async () => {
    if (!user) return;
    setLoading(true);
    const result = await (window.api as any).getVehicleProfitReport(user.id, {
      search,
      status: statusFilter,
      page,
      limit,
    });
    if (result?.success) {
      setRows(result.data.data);
      setTotal(result.data.total);
    }
    setLoading(false);
  };

  const totalPages = Math.ceil(total / limit);

  const soldRows = rows.filter((r) => r.profit != null);
  const totalProfit = soldRows.reduce((s, r) => s + (r.profit || 0), 0);
  const totalRevenue = soldRows.reduce((s, r) => s + (r.selling_price || 0), 0);
  const totalCost = soldRows.reduce((s, r) => s + r.total_cost, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Profit / Loss Report
        </h1>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Revenue (sold)</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">{fmt(totalRevenue)}</p>
          <AmountWords value={totalRevenue} />
        </div>
        <div className="card">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Cost (sold)</p>
          <p className="text-xl font-bold text-orange-600 mt-1">{fmt(totalCost)}</p>
          <AmountWords value={totalCost} />
        </div>
        <div className="card">
          <p className="text-sm text-gray-500 dark:text-gray-400">Net Profit (sold)</p>
          <p className={`text-xl font-bold mt-1 ${totalProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
            {fmt(totalProfit)}
          </p>
          <AmountWords value={totalProfit} />
        </div>
      </div>

      <div className="card">
        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="relative flex-1 min-w-48">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by make, model, reg, chassis..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="input-field pl-10"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="input-field w-40"
          >
            <option value="">All Statuses</option>
            {VEHICLE_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr>
                <th className="table-header">Vehicle</th>
                <th className="table-header">Status</th>
                <th className="table-header text-right">Purchase Price</th>
                <th className="table-header text-right">Expenses</th>
                <th className="table-header text-right">Total Cost</th>
                <th className="table-header text-right">Selling Price</th>
                <th className="table-header text-right">Profit / Loss</th>
                <th className="table-header">Customer</th>
                <th className="table-header">Sale Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={9} className="table-cell text-center">Loading...</td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="table-cell text-center text-gray-500">No vehicles found</td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="table-cell">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {row.make} {row.model} {row.year ? `(${row.year})` : ""}
                      </div>
                      <div className="text-xs text-gray-400">{row.registration_number || row.chassis_number || "-"}</div>
                    </td>
                    <td className="table-cell">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        row.status === "in_stock" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                        row.status === "sold" ? "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300" :
                        "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                      }`}>
                        {VEHICLE_STATUSES.find((s) => s.value === row.status)?.label || row.status}
                      </span>
                    </td>
                    <td className="table-cell text-right">{fmt(row.purchase_price)}</td>
                    <td className="table-cell text-right text-orange-600">{fmt(row.total_expenses)}</td>
                    <td className="table-cell text-right font-semibold">{fmt(row.total_cost)}</td>
                    <td className="table-cell text-right">
                      {row.selling_price != null ? fmt(row.selling_price) : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="table-cell text-right">
                      {row.profit != null ? (
                        <span className={`flex items-center justify-end gap-1 font-bold ${row.profit >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {row.profit >= 0 ? <FiTrendingUp size={13} /> : <FiTrendingDown size={13} />}
                          {fmt(Math.abs(row.profit))}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">Not sold</span>
                      )}
                    </td>
                    <td className="table-cell text-sm">{row.customer_name || "—"}</td>
                    <td className="table-cell text-sm">{row.sale_date ? fmtDate(row.sale_date) : "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t dark:border-gray-700">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => p - 1)}
                disabled={page === 1}
                className="btn-secondary p-2 disabled:opacity-50"
              >
                <FiChevronLeft />
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page === totalPages}
                className="btn-secondary p-2 disabled:opacity-50"
              >
                <FiChevronRight />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
