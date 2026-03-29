import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "../store";
import { toast } from "react-toastify";
import { FiAlertTriangle, FiCheck, FiSearch } from "react-icons/fi";
import AmountWords from "../components/AmountWords";

interface OverdueInstallment {
  id: string;
  sale_id: string;
  invoice_number: string;
  customer_name: string;
  vehicle_name: string;
  installment_number: number;
  due_date: string;
  amount: number;
  paid_amount: number;
  days_overdue: number;
}

export default function InstallmentsPage() {
  const { user } = useSelector((state: RootState) => state.auth);
  const [installments, setInstallments] = useState<OverdueInstallment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [paymentModal, setPaymentModal] = useState<{
    id: string;
    amount: number;
    max: number;
  } | null>(null);

  useEffect(() => {
    loadOverdue();
  }, [user?.id]);

  const loadOverdue = async () => {
    if (!user) return;
    setLoading(true);
    const result = await window.api.getOverdueInstallments(user!.id);
    if (result.success) setInstallments(result.data || []);
    setLoading(false);
  };

  const handlePayment = async () => {
    if (!paymentModal) return;
    const result = await window.api.payInstallment(
      user!.id,
      paymentModal.id,
      {
        amount: paymentModal.amount,
        payment_date: new Date().toISOString().split("T")[0],
      },
    );
    if (result.success) {
      toast.success("Payment recorded");
      setPaymentModal(null);
      loadOverdue();
    } else {
      toast.error(result.error);
    }
  };

  const formatCurrency = (v: number) => `PKR ${v?.toLocaleString() || "0"}`;

  const filtered = installments.filter(
    (i) =>
      !search ||
      i.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      i.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
      i.vehicle_name.toLowerCase().includes(search.toLowerCase()),
  );

  const totalOverdue = filtered.reduce(
    (sum, i) => sum + (i.amount - i.paid_amount),
    0,
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Overdue Installments
        </h1>
        <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 px-4 py-2 rounded-lg font-semibold">
          Total Overdue: {formatCurrency(totalOverdue)}
        </div>
      </div>

      <div className="card">
        <div className="mb-4">
          <div className="relative max-w-md">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-10"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr>
                <th className="table-header">Invoice</th>
                <th className="table-header">Customer</th>
                <th className="table-header">Vehicle</th>
                <th className="table-header">#</th>
                <th className="table-header">Due Date</th>
                <th className="table-header text-right">Amount</th>
                <th className="table-header text-right">Paid</th>
                <th className="table-header text-right">Remaining</th>
                <th className="table-header">Overdue</th>
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
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="table-cell text-center text-gray-500"
                  >
                    No overdue installments
                  </td>
                </tr>
              ) : (
                filtered.map((inst) => {
                  const remaining = inst.amount - inst.paid_amount;
                  return (
                    <tr
                      key={inst.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 bg-red-50/50 dark:bg-red-900/5"
                    >
                      <td className="table-cell font-mono text-sm">
                        <Link
                          to={`/sales/${inst.sale_id}`}
                          className="text-blue-600 hover:underline"
                        >
                          {inst.invoice_number}
                        </Link>
                      </td>
                      <td className="table-cell font-medium">
                        {inst.customer_name}
                      </td>
                      <td className="table-cell">{inst.vehicle_name}</td>
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
                      <td className="table-cell text-right text-red-600 font-semibold">
                        {formatCurrency(remaining)}
                      </td>
                      <td className="table-cell">
                        <span className="flex items-center gap-1 text-red-600 text-sm font-semibold">
                          <FiAlertTriangle size={14} /> {inst.days_overdue}d
                        </span>
                      </td>
                      <td className="table-cell">
                        <button
                          onClick={() =>
                            setPaymentModal({
                              id: inst.id,
                              amount: remaining,
                              max: remaining,
                            })
                          }
                          className="btn-primary text-xs py-1 px-2 flex items-center gap-1"
                        >
                          <FiCheck size={12} /> Pay
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

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
    </div>
  );
}
