import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "../store";
import { toast } from "react-toastify";
import { FiArrowLeft, FiCheck, FiPrinter } from "react-icons/fi";

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
  sale_price: number;
  down_payment: number;
  payment_type: string;
  installment_count: number;
  installment_frequency: string;
  status: string;
  sale_date: string;
  notes: string;
  total_paid: number;
  balance: number;
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

  useEffect(() => {
    if (id) {
      loadSale();
      loadInstallments();
    }
  }, [id]);

  const loadSale = async () => {
    const result = await window.api.getSaleById(id!);
    if (result.success) setSale(result.data);
  };

  const loadInstallments = async () => {
    const result = await window.api.getInstallments(id!);
    if (result.success) setInstallments(result.data || []);
  };

  const handlePayment = async () => {
    if (!paymentModal) return;
    const result = await window.api.payInstallment(
      user!.id,
      paymentModal.installmentId,
      paymentModal.amount,
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
                />
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
    </div>
  );
}
