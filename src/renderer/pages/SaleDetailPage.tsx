import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "../store";
import { toast } from "react-toastify";
import { FiArrowLeft, FiCheck, FiPrinter, FiEdit, FiTrash2 } from "react-icons/fi";
import { generateInvoicePdf } from "../utils/pdfGenerator";
import { confirmDeleteRecord } from "../utils/confirmDelete";
import { useSuperadminAuth } from "../components/SuperadminPasswordModal";
import AmountWords from "../components/AmountWords";

interface SaleDetail {
  id: string;
  invoice_number: string;
  customer_id: string;
  customer_name: string;
  customer_cnic: string;
  customer_phone: string;
  vehicle_id: string;
  vehicle_name: string;
  registration_number: string;
  chassis_number?: string;
  engine_number?: string;
  sale_price: number;
  down_payment: number;
  payment_type: string;
  cash_payment_method?: string;
  bank_account_name?: string;
  installment_count: number;
  installment_frequency: string;
  status: string;
  ownership_transferred?: boolean;
  ownership_transfer_date?: string;
  final_payment_date?: string;
  sale_date: string;
  notes: string;
  total_paid: number;
  balance: number;
  witness_name?: string;
  witness_cnic?: string;
  witness_phone?: string;
}
interface Installment {
  id: string;
  installment_number: number;
  due_date: string;
  amount: number;
  paid_amount: number;
  status: string;
  paid_date: string | null;
}

const statusColors: Record<string, string> = {
  pending: "badge-yellow",
  paid: "badge-green",
  overdue: "badge-red",
  partial: "badge-blue",
};

export default function SaleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useSelector((state: RootState) => state.auth);
  const navigate = useNavigate();
  const [sale, setSale] = useState<SaleDetail | null>(null);
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [paymentModal, setPaymentModal] = useState<{
    installmentId: string;
    amount: number;
    max: number;
  } | null>(null);
  const { requestAuth, modal } = useSuperadminAuth();

  useEffect(() => {
    if (id) {
      loadSale();
      loadInstallments();
    }
  }, [id, user?.id]);

  const loadSale = async () => {
    if (!user) return;
    const result = await window.api.getSaleById(user!.id, id!);
    if (result.success) setSale(result.data);
  };

  const loadInstallments = async () => {
    if (!user) return;
    const result = await window.api.getInstallments(user!.id, id!);
    if (result.success) setInstallments(result.data || []);
  };

  const handlePayment = async () => {
    if (!paymentModal) return;
    const result = await window.api.payInstallment(
      user!.id,
      paymentModal.installmentId,
      {
        amount: paymentModal.amount,
        payment_date: new Date().toISOString().split("T")[0],
      },
    );
    if (result.success) {
      toast.success("Payment recorded");
      setPaymentModal(null);
      loadSale();
      loadInstallments();
    } else {
      toast.error(result.error);
    }
  };

  if (!sale)
    return <div className="text-center py-12 text-gray-500">Loading...</div>;

  const formatCurrency = (v: number) => `PKR ${v?.toLocaleString() || "0"}`;
  const progress =
    sale.sale_price > 0
      ? Math.round((sale.total_paid / sale.sale_price) * 100)
      : 0;

  const handleExportInvoice = async () => {
    const doc = generateInvoicePdf({
      invoice_number: sale.invoice_number,
      sale_date: sale.sale_date,
      customer_name: sale.customer_name,
      customer_cnic: sale.customer_cnic,
      customer_phone: sale.customer_phone,
      vehicle_name: sale.vehicle_name,
      registration_number: sale.registration_number,
      chassis_number: sale.chassis_number,
      engine_number: sale.engine_number,
      sale_price: sale.sale_price,
      down_payment: sale.down_payment,
      payment_type: sale.payment_type,
      notes: sale.notes,
      witness_name: sale.witness_name,
      witness_cnic: sale.witness_cnic,
      witness_phone: sale.witness_phone,
      installments: installments.map((installment) => ({
        number: installment.installment_number,
        due_date: installment.due_date,
        amount: installment.amount,
      })),
    });

    const saved = await window.api.savePdf(
      new Uint8Array(doc.output("arraybuffer")),
      `${sale.invoice_number}.pdf`,
    );
    if (saved.success && saved.data) {
      toast.success("Invoice PDF saved");
    } else if (!saved.success) {
      toast.error(saved.error || "Failed to save invoice");
    }
  };

  const handleDeleteSale = () => {
    requestAuth(() => doDeleteSale());
  };

  const doDeleteSale = async () => {
    if (!user) return;

    let result = await window.api.deleteSale(user.id, sale.id, false);
    if (
      !result.success &&
      user.role === "super_admin" &&
      String(result.error || "").toLowerCase().includes("confirmation")
    ) {
      const proceed = window.confirm(
        "This sale has installments. As Super Admin, do you want to force delete it and restore vehicle stock?",
      );
      if (!proceed) return;
      result = await window.api.deleteSale(user.id, sale.id, true);
    }

    if (result.success) {
      toast.success("Sale deleted");
      navigate("/sales");
    } else {
      toast.error(result.error || "Failed to delete sale");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <FiArrowLeft />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {sale.invoice_number}
            </h1>
            <p className="text-sm text-gray-500">Sale Details</p>
          </div>
        </div>
        <span
          className={`${statusColors[sale.status] || "badge-gray"} text-base px-4 py-1.5`}
        >
          {sale.status}
        </span>
      </div>
      <div className="flex justify-end gap-2">
        <button
          onClick={() => requestAuth(() => navigate(`/sales/${sale.id}/edit`))}
          className="btn-secondary flex items-center gap-2"
        >
          <FiEdit /> Edit Sale
        </button>
        <button
          onClick={handleDeleteSale}
          className="btn-secondary text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
        >
          <FiTrash2 /> Delete Sale
        </button>
        <button
          onClick={handleExportInvoice}
          className="btn-secondary flex items-center gap-2"
        >
          <FiPrinter /> Export Invoice PDF
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Customer Info */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
            Customer
          </h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Name</dt>
              <dd>
                <Link
                  to={`/customers/${sale.customer_id}`}
                  className="text-blue-600 hover:underline"
                >
                  {sale.customer_name}
                </Link>
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">CNIC</dt>
              <dd>{sale.customer_cnic || "-"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Phone</dt>
              <dd>{sale.customer_phone || "-"}</dd>
            </div>
          </dl>
        </div>

        {/* Vehicle Info */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
            Vehicle
          </h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Vehicle</dt>
              <dd>
                <Link
                  to={`/vehicles/${sale.vehicle_id}`}
                  className="text-blue-600 hover:underline"
                >
                  {sale.vehicle_name}
                </Link>
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Registration</dt>
              <dd>{sale.registration_number || "-"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Sale Date</dt>
              <dd>{new Date(sale.sale_date).toLocaleDateString()}</dd>
            </div>
          </dl>
        </div>

        {/* Financial Summary */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
            Financial
          </h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Sale Price</dt>
              <dd className="font-bold">{formatCurrency(sale.sale_price)}</dd>
            </div>
            {sale.payment_type === "installment" && (
              <div className="flex justify-between">
                <dt className="text-gray-500">Down Payment</dt>
                <dd>{formatCurrency(sale.down_payment)}</dd>
              </div>
            )}
            {sale.payment_type === "cash" && (
              <div className="flex justify-between">
                <dt className="text-gray-500">Method</dt>
                <dd>
                  {sale.cash_payment_method === "bank_transfer"
                    ? `Bank Transfer${sale.bank_account_name ? ` (${sale.bank_account_name})` : ""}`
                    : "Hard Cash"}
                </dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-gray-500">Total Paid</dt>
              <dd className="text-green-600">
                {formatCurrency(sale.total_paid)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Balance</dt>
              <dd className="text-red-600">{formatCurrency(sale.balance)}</dd>
            </div>
          </dl>
          <div className="mt-3">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Progress</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${Math.min(progress, 100)}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Installments Schedule */}
      {sale.payment_type === "installment" && installments.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Installment Schedule ({sale.installment_frequency})
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr>
                  <th className="table-header">#</th>
                  <th className="table-header">Due Date</th>
                  <th className="table-header text-right">Amount</th>
                  <th className="table-header text-right">Paid</th>
                  <th className="table-header text-right">Remaining</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Paid Date</th>
                  <th className="table-header">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {installments.map((inst) => {
                  const remaining = inst.amount - inst.paid_amount;
                  const isOverdue =
                    inst.status !== "paid" &&
                    new Date(inst.due_date) < new Date();
                  return (
                    <tr
                      key={inst.id}
                      className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 ${isOverdue ? "bg-red-50 dark:bg-red-900/10" : ""}`}
                    >
                      <td className="table-cell">{inst.installment_number}</td>
                      <td className="table-cell">
                        {new Date(inst.due_date).toLocaleDateString()}
                      </td>
                      <td className="table-cell text-right">
                        {formatCurrency(inst.amount)}
                      </td>
                      <td className="table-cell text-right text-green-600">
                        {formatCurrency(inst.paid_amount)}
                      </td>
                      <td className="table-cell text-right text-red-600">
                        {formatCurrency(remaining)}
                      </td>
                      <td className="table-cell">
                        <span
                          className={
                            statusColors[
                              isOverdue && inst.status !== "paid"
                                ? "overdue"
                                : inst.status
                            ] || "badge-gray"
                          }
                        >
                          {isOverdue && inst.status !== "paid"
                            ? "Overdue"
                            : inst.status}
                        </span>
                      </td>
                      <td className="table-cell">
                        {inst.paid_date
                          ? new Date(inst.paid_date).toLocaleDateString()
                          : "-"}
                      </td>
                      <td className="table-cell">
                        {inst.status !== "paid" && (
                          <button
                            onClick={() =>
                              setPaymentModal({
                                installmentId: inst.id,
                                amount: remaining,
                                max: remaining,
                              })
                            }
                            className="btn-primary text-xs py-1 px-2 flex items-center gap-1"
                          >
                            <FiCheck size={12} /> Pay
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {sale.notes && (
        <div className="card">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
            Notes
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {sale.notes}
          </p>
        </div>
      )}

      {/* Ownership Transfer */}
      {sale.payment_type === "installment" && (
        <div className="card">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
            Ownership Transfer
          </h3>
          {sale.ownership_transferred ? (
            <div className="flex items-center gap-2 text-green-600">
              <FiCheck size={18} />
              <span className="font-medium">
                Ownership transferred on {sale.ownership_transfer_date}
              </span>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                {sale.status === "completed"
                  ? "All payments completed. You can now transfer ownership."
                  : "Ownership can be transferred after all installments are paid."}
              </p>
              {sale.status === "completed" && (
                <button
                  onClick={async () => {
                    if (!confirm("Transfer ownership to the customer? This action will be logged.")) return;
                    const result = await window.api.transferOwnership(user!.id, sale.id);
                    if (result.success) {
                      toast.success("Ownership transferred successfully");
                      loadSale();
                    } else {
                      toast.error(result.error || "Failed to transfer ownership");
                    }
                  }}
                  className="btn-primary flex items-center gap-2"
                >
                  <FiCheck size={16} /> Transfer Ownership
                </button>
              )}
            </div>
          )}
          {sale.final_payment_date && (
            <p className="text-xs text-gray-400 mt-2">
              Final payment received: {sale.final_payment_date}
            </p>
          )}
        </div>
      )}

      {/* Payment Modal */}
      {paymentModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setPaymentModal(null)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Record Payment
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Amount (max: {formatCurrency(paymentModal.max)})
                </label>
                <input
                  type="number"
                  value={paymentModal.amount}
                  onChange={(e) =>
                    setPaymentModal((prev) =>
                      prev
                        ? {
                            ...prev,
                            amount: Math.min(
                              parseFloat(e.target.value) || 0,
                              prev.max,
                            ),
                          }
                        : null,
                    )
                  }
                  className="input-field"
                  max={paymentModal.max}
                  min={1}
                  required
                />
                <AmountWords value={paymentModal.amount} />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setPaymentModal(null)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button onClick={handlePayment} className="btn-primary">
                  Confirm Payment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Superadmin password modal */}
      {modal}
    </div>
  );
}
