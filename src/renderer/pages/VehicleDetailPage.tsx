import React, { useEffect, useState, Suspense } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "../store";
import type { Vehicle, VehicleExpense } from "../../shared/types";
import {
  VEHICLE_EXPENSE_CATEGORIES,
  VEHICLE_STATUSES,
} from "../../shared/constants";
import { FiEdit, FiPlus, FiTrash2, FiArrowLeft, FiPrinter, FiDownload, FiClock, FiShoppingCart, FiTool, FiDollarSign } from "react-icons/fi";
import { toast } from "react-toastify";
import { toFileUrl } from "../utils/filePaths";
import ErrorBoundary from "../components/ErrorBoundary";
import InspectionReportPrint from "../components/inspection/InspectionReportPrint";
import { useSuperadminAuth } from "../components/SuperadminPasswordModal";
import { generateVehiclePurchasePdf } from "../utils/pdfGenerator";
import AmountWords from "../components/AmountWords";

// Grey SVG shown when a local image fails to load (missing file, 403, etc.)
const IMG_PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='140'%3E%3Crect width='200' height='140' fill='%23e5e7eb'/%3E%3Ctext x='100' y='76' text-anchor='middle' fill='%239ca3af' font-size='13' font-family='sans-serif'%3ENo image%3C/text%3E%3C/svg%3E";

const VehicleInspectionSVG = React.lazy(() =>
  import("../components/inspection/VehicleInspectionSVG").catch((err) => {
    console.error("Failed to load inspection component:", err);
    return {
      default: () => (
        <div className="p-6 bg-gray-100 dark:bg-gray-900 rounded-lg border border-gray-300 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Inspection component failed to load.
          </p>
        </div>
      ),
    };
  }),
);

export default function VehicleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useSelector((state: RootState) => state.auth);
  const navigate = useNavigate();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [expenses, setExpenses] = useState<VehicleExpense[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [showPrintReport, setShowPrintReport] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const { requestAuth, modal } = useSuperadminAuth();
  const [expenseForm, setExpenseForm] = useState({
    category: "paint_repair",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    notes: "",
    condition_before: "",
    condition_after: "",
  });

  useEffect(() => {
    if (id) {
      loadVehicle();
      loadExpenses();
      loadHistory();
    }
  }, [id, user?.id]);

  const loadVehicle = async () => {
    const result = await window.api.getVehicleById(id!);
    if (result.success) setVehicle(result.data);
  };

  const loadExpenses = async () => {
    if (!user) return;
    const result = await window.api.getVehicleExpenses(user!.id, id!);
    if (result.success) setExpenses(result.data);
  };

  const loadHistory = async () => {
    const result = await (window.api as any).getVehicleHistory(id!);
    if (result?.success) setHistory(result.data || []);
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
        condition_before: "",
        condition_after: "",
      });
      loadVehicle();
      loadExpenses();
    } else {
      toast.error(result.error);
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    requestAuth(async () => {
      await doDeleteExpense(expenseId);
    });
  };

  const doDeleteExpense = async (expenseId: string) => {
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
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
          >
            <FiArrowLeft />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {vehicle.make} {vehicle.model} ({(vehicle as any).year_of_manufacture || (vehicle as any).year})
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              {vehicle.registration_number || "No registration"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              requestAuth(() => navigate(`/vehicles/${vehicle.id}/edit`));
            }}
            className="btn-primary flex items-center gap-2"
          >
            <FiEdit /> Edit
          </button>
          <button
            type="button"
            onClick={() => {
              const doc = generateVehiclePurchasePdf(vehicle as any);
              doc.save(`Purchase_${vehicle.make}_${vehicle.model}_${vehicle.chassis_number || vehicle.id}.pdf`);
              toast.success("Purchase PDF generated");
            }}
            className="btn-secondary flex items-center gap-2"
          >
            <FiDownload /> Purchase PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {vehicle.photo_path && (
          <div className="card lg:col-span-2">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Vehicle Image
            </h2>
            <img
              src={toFileUrl(vehicle.photo_path)}
              alt={`${vehicle.make} ${vehicle.model}`}
              className="w-full max-w-3xl rounded-xl border border-gray-200 object-cover dark:border-gray-700"
              onError={(e) => { (e.target as HTMLImageElement).src = IMG_PLACEHOLDER; }}
            />
          </div>
        )}

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
              <span className="text-gray-500">Extra Keys:</span>{" "}
              <span className="ml-2 font-medium text-gray-900 dark:text-white">
                {(vehicle as any).extra_keys_available ? `Yes (${(vehicle as any).extra_keys_count || 0})` : "No"}
              </span>
            </div>
            <div>
              <span className="text-gray-500">File Available:</span>{" "}
              <span className="ml-2 font-medium text-gray-900 dark:text-white">
                {(vehicle as any).file_available ? `Yes (${(vehicle as any).file_pages || 0} pages)` : "No"}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Smart Card:</span>{" "}
              <span className="ml-2 font-medium text-gray-900 dark:text-white">
                {(vehicle as any).current_smart_card ? `Yes (${(vehicle as any).smart_card_count || 0})` : "No"}
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
            <div className="flex justify-between items-start py-2 border-b border-gray-100 dark:border-gray-700">
              <span className="text-gray-500">Purchase Price</span>
              <div className="text-right">
                <span className="font-semibold text-gray-900 dark:text-white">Rs {vehicle.purchase_price?.toLocaleString()}</span>
                <AmountWords value={vehicle.purchase_price} />
              </div>
            </div>
            <div className="flex justify-between items-start py-2 border-b border-gray-100 dark:border-gray-700">
              <span className="text-gray-500">Total Expenses</span>
              <div className="text-right">
                <span className="font-semibold text-orange-600">Rs {vehicle.total_expenses?.toLocaleString()}</span>
                <AmountWords value={vehicle.total_expenses} />
              </div>
            </div>
            <div className="flex justify-between items-start py-2 border-b border-gray-100 dark:border-gray-700">
              <span className="text-gray-500">Total Cost</span>
              <div className="text-right">
                <span className="font-bold text-gray-900 dark:text-white">Rs {vehicle.total_cost?.toLocaleString()}</span>
                <AmountWords value={vehicle.total_cost} />
              </div>
            </div>
            {vehicle.selling_price && (
              <>
                <div className="flex justify-between items-start py-2 border-b border-gray-100 dark:border-gray-700">
                  <span className="text-gray-500">Selling Price</span>
                  <div className="text-right">
                    <span className="font-semibold text-gray-900 dark:text-white">Rs {vehicle.selling_price?.toLocaleString()}</span>
                    <AmountWords value={vehicle.selling_price} />
                  </div>
                </div>
                <div className="flex justify-between items-start py-2">
                  <span className="text-gray-500">Profit</span>
                  <div className="text-right">
                    <span className={`font-bold ${vehicle.selling_price - vehicle.total_cost >= 0 ? "text-green-600" : "text-red-600"}`}>
                      Rs {(vehicle.selling_price - vehicle.total_cost).toLocaleString()}
                    </span>
                    <AmountWords value={vehicle.selling_price - vehicle.total_cost} />
                  </div>
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
          {(vehicle.seller_photo_path || vehicle.seller_cnic_photo_path || vehicle.seller_cnic_photo_back_path) && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              {vehicle.seller_photo_path && (
                <div>
                  <p className="text-xs text-gray-500 mb-2">Seller Photo</p>
                  <img
                    src={toFileUrl(vehicle.seller_photo_path)}
                    alt="Seller"
                    className="w-full max-w-xs rounded-xl border border-gray-200 object-cover dark:border-gray-700"
                    onError={(e) => { (e.target as HTMLImageElement).src = IMG_PLACEHOLDER; }}
                  />
                </div>
              )}
              {vehicle.seller_cnic_photo_path && (
                <div>
                  <p className="text-xs text-gray-500 mb-2">
                    Seller CNIC (Front)
                  </p>
                  <img
                    src={toFileUrl(vehicle.seller_cnic_photo_path)}
                    alt="Seller CNIC Front"
                    className="w-full max-w-sm rounded-xl border border-gray-200 object-cover dark:border-gray-700"
                    onError={(e) => { (e.target as HTMLImageElement).src = IMG_PLACEHOLDER; }}
                  />
                </div>
              )}
              {vehicle.seller_cnic_photo_back_path && (
                <div>
                  <p className="text-xs text-gray-500 mb-2">
                    Seller CNIC (Back)
                  </p>
                  <img
                    src={toFileUrl(vehicle.seller_cnic_photo_back_path)}
                    alt="Seller CNIC Back"
                    className="w-full max-w-sm rounded-xl border border-gray-200 object-cover dark:border-gray-700"
                    onError={(e) => { (e.target as HTMLImageElement).src = IMG_PLACEHOLDER; }}
                  />
                </div>
              )}
            </div>
          )}
        </div>

      </div>

      {/* Expenses - Full Width Section */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Expenses & Repair Information
          </h2>
          <button
            onClick={() => setShowExpenseForm(!showExpenseForm)}
            className="btn-primary text-sm flex items-center gap-1"
          >
            <FiPlus /> Add Expense
          </button>
        </div>

        {showExpenseForm && (
          <form
            onSubmit={handleAddExpense}
            className="mb-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50 space-y-3"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
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
                placeholder="Amount (Rs)"
                className="input-field"
                required
              />
              <AmountWords value={expenseForm.amount} />
              <input
                type="date"
                value={expenseForm.date}
                onChange={(e) =>
                  setExpenseForm({ ...expenseForm, date: e.target.value })
                }
                className="input-field"
                required
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
            </div>
            {["paint_repair", "engine_repair", "tyres_replacement", "battery_replacement"].includes(expenseForm.category) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  type="text"
                  value={expenseForm.condition_before}
                  onChange={(e) =>
                    setExpenseForm({ ...expenseForm, condition_before: e.target.value })
                  }
                  placeholder="Condition Before Repair (e.g. dented, scratched)"
                  className="input-field"
                />
                <input
                  type="text"
                  value={expenseForm.condition_after}
                  onChange={(e) =>
                    setExpenseForm({ ...expenseForm, condition_after: e.target.value })
                  }
                  placeholder="Condition After Repair (e.g. fixed, repainted)"
                  className="input-field"
                />
              </div>
            )}
            <div className="flex gap-2">
              <button type="submit" className="btn-primary text-sm">
                Save Expense
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
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr>
                  <th className="table-header">Category</th>
                  <th className="table-header text-right">Amount</th>
                  <th className="table-header">Date</th>
                  <th className="table-header">Notes</th>
                  <th className="table-header">Before / After</th>
                  <th className="table-header w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {expenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="table-cell font-medium">
                      {
                        VEHICLE_EXPENSE_CATEGORIES.find(
                          (c) => c.value === exp.category,
                        )?.label || exp.category
                      }
                    </td>
                    <td className="table-cell text-right font-semibold">
                      Rs {exp.amount.toLocaleString()}
                    </td>
                    <td className="table-cell">{exp.date}</td>
                    <td className="table-cell text-gray-500">{exp.notes || "-"}</td>
                    <td className="table-cell text-xs">
                      {exp.condition_before || exp.condition_after ? (
                        <>
                          {exp.condition_before && <span className="text-red-500">Before: {exp.condition_before}</span>}
                          {exp.condition_before && exp.condition_after && <br />}
                          {exp.condition_after && <span className="text-green-500">After: {exp.condition_after}</span>}
                        </>
                      ) : "-"}
                    </td>
                    <td className="table-cell">
                      <button
                        onClick={() => handleDeleteExpense(exp.id)}
                        className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                      >
                        <FiTrash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 dark:bg-gray-700/30">
                  <td className="table-cell font-bold">Total</td>
                  <td className="table-cell text-right font-bold text-orange-600">
                    Rs {expenses.reduce((sum, e) => sum + e.amount, 0).toLocaleString()}
                  </td>
                  <td colSpan={4}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-500 text-center py-4">No expenses recorded yet. Click "Add Expense" to add repair costs, travel expenses, or other costs.</p>
        )}
      </div>

      {/* Vehicle History Timeline */}
      {history.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <FiClock size={18} /> Vehicle History
          </h2>
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />
            <div className="space-y-4">
              {history.map((event, idx) => {
                const iconMap: Record<string, React.ReactNode> = {
                  purchase: <FiShoppingCart size={14} />,
                  expense: <FiTool size={14} />,
                  sale: <FiShoppingCart size={14} />,
                  payment: <FiDollarSign size={14} />,
                };
                const colorMap: Record<string, string> = {
                  purchase: "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400",
                  expense: "bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400",
                  sale: "bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400",
                  payment: "bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400",
                };
                return (
                  <div key={idx} className="flex gap-4 pl-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${colorMap[event.type] || "bg-gray-100 text-gray-500"}`}>
                      {iconMap[event.type] || <FiClock size={14} />}
                    </div>
                    <div className="flex-1 pb-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{event.title}</p>
                        <span className="text-xs text-gray-400">
                          {new Date(event.date).toLocaleDateString()}
                        </span>
                      </div>
                      {event.description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{event.description}</p>
                      )}
                      {event.amount != null && (
                        <p className={`text-xs font-semibold mt-0.5 ${event.type === "expense" ? "text-orange-600" : "text-green-600"}`}>
                          PKR {event.amount.toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Vehicle Inspection Section */}
      {vehicle.vehicleInspection && (
        <ErrorBoundary>
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Vehicle Inspection Details
                </h2>
                {vehicle.vehicleInspection.markers.length > 0 && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {vehicle.vehicleInspection.markers.length} damage marker
                    {vehicle.vehicleInspection.markers.length !== 1 ? "s" : ""} recorded
                    {vehicle.vehicleInspection.inspectorName && (
                      <> · Inspector: {vehicle.vehicleInspection.inspectorName}</>
                    )}
                  </p>
                )}
              </div>
              <button
                onClick={() => setShowPrintReport(true)}
                className="btn-secondary flex items-center gap-2 text-sm"
              >
                <FiPrinter size={15} />
                Print Inspection Report
              </button>
            </div>
            <Suspense
              fallback={
                <div className="p-6 bg-gray-100 dark:bg-gray-900 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Loading inspection details...
                  </p>
                </div>
              }
            >
              <VehicleInspectionSVG
                inspection={vehicle.vehicleInspection}
                readonly={true}
                inspectorName={vehicle.vehicleInspection.inspectorName}
              />
            </Suspense>
          </div>
        </ErrorBoundary>
      )}

      {/* Print report modal */}
      {showPrintReport && vehicle.vehicleInspection && (
        <InspectionReportPrint
          vehicle={vehicle}
          inspection={vehicle.vehicleInspection}
          onClose={() => setShowPrintReport(false)}
        />
      )}

      {/* Superadmin password modal */}
      {modal}
    </div>
  );
}
