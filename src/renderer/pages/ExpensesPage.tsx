import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "../store";
import { SHOWROOM_EXPENSE_CATEGORIES } from "../../shared/constants";
import { toast } from "react-toastify";
import {
  FiPlus,
  FiTrash2,
  FiSearch,
  FiChevronLeft,
  FiChevronRight,
} from "react-icons/fi";

interface Expense {
  id: string;
  category: string;
  description: string;
  amount: number;
  date: string;
  created_at: string;
}

export default function ExpensesPage() {
  const { user } = useSelector((state: RootState) => state.auth);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const limit = 20;

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<{
    category: string;
    description: string;
    amount: string;
    expense_date: string;
  }>({
    category: SHOWROOM_EXPENSE_CATEGORIES[0]?.value || "",
    description: "",
    amount: "",
    expense_date: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    loadExpenses();
  }, [page, category, dateFrom, dateTo, user?.id]);

  const loadExpenses = async () => {
    if (!user) return;
    setLoading(true);
    const result = await window.api.getShowroomExpenses(user!.id, {
      category,
      startDate: dateFrom,
      endDate: dateTo,
      page,
      limit,
    });
    if (result.success) {
      setExpenses(result.data.data);
      setTotal(result.data.total);
    }
    setLoading(false);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await window.api.addShowroomExpense(user!.id, {
      ...form,
      amount: parseFloat(form.amount) || 0,
      date: form.expense_date,
    });
    if (result.success) {
      toast.success("Expense added");
      setShowForm(false);
      setForm({
        category: SHOWROOM_EXPENSE_CATEGORIES[0]?.value || "",
        description: "",
        amount: "",
        expense_date: new Date().toISOString().split("T")[0],
      });
      loadExpenses();
    } else {
      toast.error(result.error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this expense?")) return;
    const result = await window.api.deleteShowroomExpense(user!.id, id);
    if (result.success) {
      toast.success("Deleted");
      loadExpenses();
    } else toast.error(result.error);
  };

  const totalPages = Math.ceil(total / limit);
  const formatCurrency = (v: number) => `PKR ${v?.toLocaleString() || "0"}`;
  const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Showroom Expenses
        </h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-primary flex items-center gap-2"
        >
          <FiPlus /> Add Expense
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="card">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
            New Expense
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Category
              </label>
              <select
                value={form.category}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, category: e.target.value }))
                }
                className="input-field"
              >
                {SHOWROOM_EXPENSE_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <input
                type="text"
                value={form.description}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, description: e.target.value }))
                }
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Amount
              </label>
              <input
                type="number"
                value={form.amount}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, amount: e.target.value }))
                }
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Date
              </label>
              <input
                type="date"
                value={form.expense_date}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, expense_date: e.target.value }))
                }
                className="input-field"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Save
            </button>
          </div>
        </form>
      )}

      <div className="card">
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
            className="input-field w-auto"
          >
            <option value="">All Categories</option>
            {SHOWROOM_EXPENSE_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPage(1);
            }}
            className="input-field w-auto"
            placeholder="From"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPage(1);
            }}
            className="input-field w-auto"
            placeholder="To"
          />
          <div className="ml-auto bg-gray-100 dark:bg-gray-700 px-4 py-2 rounded-lg text-sm font-semibold">
            Page Total: {formatCurrency(totalAmount)}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr>
                <th className="table-header">Date</th>
                <th className="table-header">Category</th>
                <th className="table-header">Description</th>
                <th className="table-header text-right">Amount</th>
                <th className="table-header">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={5} className="table-cell text-center">
                    Loading...
                  </td>
                </tr>
              ) : expenses.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="table-cell text-center text-gray-500"
                  >
                    No expenses found
                  </td>
                </tr>
              ) : (
                expenses.map((e) => (
                  <tr
                    key={e.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
                    <td className="table-cell">
                      {new Date(e.date).toLocaleDateString()}
                    </td>
                    <td className="table-cell capitalize">
                      {e.category.replace(/_/g, " ")}
                    </td>
                    <td className="table-cell">{e.description}</td>
                    <td className="table-cell text-right font-medium">
                      {formatCurrency(e.amount)}
                    </td>
                    <td className="table-cell">
                      <button
                        onClick={() => handleDelete(e.id)}
                        className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                      >
                        <FiTrash2 size={16} />
                      </button>
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
