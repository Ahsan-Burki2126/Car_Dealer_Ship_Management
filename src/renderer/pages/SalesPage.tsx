import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "../store";
import {
  FiPlus,
  FiSearch,
  FiEye,
  FiEdit,
  FiTrash2,
  FiChevronLeft,
  FiChevronRight,
} from "react-icons/fi";
import { toast } from "react-toastify";
import { confirmDeleteRecord } from "../utils/confirmDelete";

interface Sale {
  id: string;
  invoice_number: string;
  customer_name: string;
  vehicle_name: string;
  sale_price: number;
  payment_type: string;
  status: string;
  sale_date: string;
  total_paid: number;
  balance: number;
}

const statusBadge: Record<string, string> = {
  active: "badge-yellow",
  completed: "badge-green",
  cancelled: "badge-red",
};

export default function SalesPage() {
  const { user } = useSelector((state: RootState) => state.auth);
  const navigate = useNavigate();
  const [sales, setSales] = useState<Sale[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const limit = 20;

  useEffect(() => {
    loadSales();
  }, [page, search, statusFilter, user?.id]);

  const loadSales = async () => {
    if (!user) return;
    setLoading(true);
    const result = await window.api.getSales(user!.id, {
      search,
      status: statusFilter,
      page,
      limit,
    });
    if (result.success) {
      setSales(result.data.data);
      setTotal(result.data.total);
    }
    setLoading(false);
  };

  const handleDelete = async (saleId: string) => {
    if (!user) return;
    if (!confirmDeleteRecord()) return;

    let result = await window.api.deleteSale(user.id, saleId, false);
    if (
      !result.success &&
      user.role === "super_admin" &&
      String(result.error || "").toLowerCase().includes("confirmation")
    ) {
      const proceed = window.confirm(
        "This sale has installments. As Super Admin, do you want to force delete it and restore vehicle stock?",
      );
      if (!proceed) return;
      result = await window.api.deleteSale(user.id, saleId, true);
    }

    if (result.success) {
      toast.success("Sale deleted");
      loadSales();
    } else {
      toast.error(result.error || "Failed to delete sale");
    }
  };

  const totalPages = Math.ceil(total / limit);
  const formatCurrency = (v: number) => `PKR ${v?.toLocaleString() || "0"}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Sales
        </h1>
        <button
          onClick={() => navigate("/sales/new")}
          className="btn-primary flex items-center gap-2"
        >
          <FiPlus /> New Sale
        </button>
      </div>

      <div className="card">
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="relative flex-1 max-w-md">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by invoice, customer..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="input-field pl-10"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="input-field w-auto"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr>
                <th className="table-header">Invoice</th>
                <th className="table-header">Customer</th>
                <th className="table-header">Vehicle</th>
                <th className="table-header">Type</th>
                <th className="table-header text-right">Sale Price</th>
                <th className="table-header text-right">Paid</th>
                <th className="table-header text-right">Balance</th>
                <th className="table-header">Status</th>
                <th className="table-header">Date</th>
                <th className="table-header">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={10} className="table-cell text-center">
                    Loading...
                  </td>
                </tr>
              ) : sales.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="table-cell text-center text-gray-500"
                  >
                    No sales found
                  </td>
                </tr>
              ) : (
                sales.map((s) => (
                  <tr
                    key={s.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
                    <td className="table-cell font-mono text-sm">
                      {s.invoice_number}
                    </td>
                    <td className="table-cell font-medium">
                      {s.customer_name}
                    </td>
                    <td className="table-cell">{s.vehicle_name}</td>
                    <td className="table-cell capitalize">{s.payment_type}</td>
                    <td className="table-cell text-right">
                      {formatCurrency(s.sale_price)}
                    </td>
                    <td className="table-cell text-right text-green-600">
                      {formatCurrency(s.total_paid)}
                    </td>
                    <td className="table-cell text-right text-red-600">
                      {formatCurrency(s.balance)}
                    </td>
                    <td className="table-cell">
                      <span className={statusBadge[s.status] || "badge-gray"}>
                        {s.status}
                      </span>
                    </td>
                    <td className="table-cell">
                      {new Date(s.sale_date).toLocaleDateString()}
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/sales/${s.id}`}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                          title="View"
                        >
                          <FiEye size={16} />
                        </Link>
                        <Link
                          to={`/sales/${s.id}/edit`}
                          className="p-1.5 text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded"
                          title="Edit"
                        >
                          <FiEdit size={16} />
                        </Link>
                        <button
                          onClick={() => handleDelete(s.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                          title="Delete"
                        >
                          <FiTrash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t dark:border-gray-700">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Showing {(page - 1) * limit + 1}-{Math.min(page * limit, total)}{" "}
              of {total}
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
