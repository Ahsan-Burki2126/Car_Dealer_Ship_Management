import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "../store";
import type { Vehicle, VehicleExpense } from "../../shared/types";
import {
  VEHICLE_EXPENSE_CATEGORIES,
  VEHICLE_STATUSES,
} from "../../shared/constants";
import {
  FiEdit,
  FiPlus,
  FiTrash2,
  FiClipboard,
  FiArrowLeft,
} from "react-icons/fi";
import { toast } from "react-toastify";

export default function VehicleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useSelector((state: RootState) => state.auth);
  const navigate = useNavigate();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [expenses, setExpenses] = useState<VehicleExpense[]>([]);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    category: "paint_repair",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    notes: "",
  });

  useEffect(() => {
    if (id) {
      loadVehicle();
      loadExpenses();
    }
  }, [id]);

  const loadVehicle = async () => {
    const result = await window.api.getVehicleById(id!);
    if (result.success) setVehicle(result.data);
  };

  const loadExpenses = async () => {
    const result = await window.api.getVehicleExpenses(id!);
    if (result.success) setExpenses(result.data);
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await window.api.addVehicleExpense(user!.id, id!, {
      ...expenseForm,
      amount: parseFloat(expenseForm.amount),
    });
    if (result.success) {
      toast.success("Expense added");
      setShowExpenseForm(false);
      setExpenseForm({
        category: "paint_repair",
        amount: "",
        date: new Date().toISOString().split("T")[0],
        notes: "",
      });
      loadVehicle();
      loadExpenses();
    } else {
      toast.error(result.error);
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!confirm("Delete this expense?")) return;
    const result = await window.api.deleteVehicleExpense(user!.id, expenseId);
    if (result.success) {
      toast.success("Expense deleted");
      loadVehicle();
      loadExpenses();
    }
  };

  if (!vehicle)
    return <div className="text-center py-8 text-gray-500">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/vehicles")}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <FiArrowLeft />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {vehicle.make} {vehicle.model} ({vehicle.year})
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              {vehicle.registration_number || "No registration"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            to={`/inspections/new?vehicleId=${vehicle.id}`}
            className="btn-secondary flex items-center gap-2"
          >
            <FiClipboard /> Inspect
          </Link>
          {user?.role !== "staff" && (
            <Link
              to={`/vehicles/${vehicle.id}/edit`}
              className="btn-primary flex items-center gap-2"
            >
              <FiEdit /> Edit
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Vehicle Info */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Vehicle Information
          </h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500 dark:text-gray-400">Status:</span>
              <span
                className={`ml-2 ${vehicle.status === "in_stock" ? "badge-success" : vehicle.status === "sold" ? "badge-gray" : "badge-warning"}`}
              >
                {
                  VEHICLE_STATUSES.find((s) => s.value === vehicle.status)
                    ?.label
                }
              </span>
            </div>
            <div>
              <span className="text-gray-500">Registration:</span>{" "}
              <span className="ml-2 font-medium text-gray-900 dark:text-white">
                {vehicle.registration_number || "-"}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Chassis:</span>{" "}
              <span className="ml-2 font-medium text-gray-900 dark:text-white">
                {vehicle.chassis_number || "-"}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Engine:</span>{" "}
              <span className="ml-2 font-medium text-gray-900 dark:text-white">
                {vehicle.engine_number || "-"}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Color:</span>{" "}
              <span className="ml-2 font-medium text-gray-900 dark:text-white">
                {vehicle.color || "-"}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Assembly:</span>{" "}
              <span className="ml-2 font-medium text-gray-900 dark:text-white">
                {vehicle.assembly_country || "-"}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Key Available:</span>{" "}
              <span className="ml-2 font-medium text-gray-900 dark:text-white">
                {vehicle.key_available ? "Yes" : "No"}
              </span>
            </div>
          </div>
        </div>

        {/* Financial Info */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Financial Details
          </h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
              <span className="text-gray-500">Purchase Price</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                Rs {vehicle.purchase_price?.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
              <span className="text-gray-500">Total Expenses</span>
              <span className="font-semibold text-orange-600">
                Rs {vehicle.total_expenses?.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
              <span className="text-gray-500">Total Cost</span>
              <span className="font-bold text-gray-900 dark:text-white">
                Rs {vehicle.total_cost?.toLocaleString()}
              </span>
            </div>
            {vehicle.selling_price && (
              <>
                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                  <span className="text-gray-500">Selling Price</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    Rs {vehicle.selling_price?.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-500">Profit</span>
                  <span
                    className={`font-bold ${vehicle.selling_price - vehicle.total_cost >= 0 ? "text-green-600" : "text-red-600"}`}
                  >
                    Rs{" "}
                    {(
                      vehicle.selling_price - vehicle.total_cost
                    ).toLocaleString()}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Seller Info */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Seller Information
          </h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Name:</span>{" "}
              <span className="ml-2 font-medium text-gray-900 dark:text-white">
                {vehicle.seller_name || "-"}
              </span>
            </div>
            <div>
              <span className="text-gray-500">CNIC:</span>{" "}
              <span className="ml-2 font-medium text-gray-900 dark:text-white">
                {vehicle.seller_cnic || "-"}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Phone:</span>{" "}
              <span className="ml-2 font-medium text-gray-900 dark:text-white">
                {vehicle.seller_phone || "-"}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Purchase Date:</span>{" "}
              <span className="ml-2 font-medium text-gray-900 dark:text-white">
                {vehicle.purchase_date || "-"}
              </span>
            </div>
          </div>
        </div>

        {/* Expenses */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Expenses
            </h2>
            {user?.role !== "staff" && (
              <button
                onClick={() => setShowExpenseForm(!showExpenseForm)}
                className="btn-primary text-sm flex items-center gap-1"
              >
                <FiPlus /> Add
              </button>
            )}
          </div>

          {showExpenseForm && (
            <form
              onSubmit={handleAddExpense}
              className="mb-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50 space-y-3"
            >
              <select
                value={expenseForm.category}
                onChange={(e) =>
                  setExpenseForm({ ...expenseForm, category: e.target.value })
                }
                className="input-field"
              >
                {VEHICLE_EXPENSE_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
              <input
                type="number"
                value={expenseForm.amount}
                onChange={(e) =>
                  setExpenseForm({ ...expenseForm, amount: e.target.value })
                }
                placeholder="Amount"
                className="input-field"
                required
              />
              <input
                type="date"
                value={expenseForm.date}
                onChange={(e) =>
                  setExpenseForm({ ...expenseForm, date: e.target.value })
                }
                className="input-field"
              />
              <input
                type="text"
                value={expenseForm.notes}
                onChange={(e) =>
                  setExpenseForm({ ...expenseForm, notes: e.target.value })
                }
                placeholder="Notes"
                className="input-field"
              />
              <div className="flex gap-2">
                <button type="submit" className="btn-primary text-sm">
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setShowExpenseForm(false)}
                  className="btn-secondary text-sm"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {expenses.length > 0 ? (
            <div className="space-y-2">
              {expenses.map((exp) => (
                <div
                  key={exp.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/30"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {
                        VEHICLE_EXPENSE_CATEGORIES.find(
                          (c) => c.value === exp.category,
                        )?.label
                      }
                    </p>
                    <p className="text-xs text-gray-500">
                      {exp.date} {exp.notes && `- ${exp.notes}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      Rs {exp.amount.toLocaleString()}
                    </span>
                    {user?.role !== "staff" && (
                      <button
                        onClick={() => handleDeleteExpense(exp.id)}
                        className="p-1 text-red-500 hover:bg-red-50 rounded"
                      >
                        <FiTrash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No expenses recorded.</p>
          )}
        </div>
      </div>
    </div>
  );
}
