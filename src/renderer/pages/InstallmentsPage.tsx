import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "../store";
import { toast } from "react-toastify";
import { fmtDate } from "../utils/dateUtils";
import { FiAlertTriangle, FiCheck, FiSearch, FiPrinter } from "react-icons/fi";
import AmountWords from "../components/AmountWords";
import { generatePaymentReceiptPdf } from "../utils/pdfGenerator";

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

interface InstallmentSale {
  sale_id: string;
  invoice_number: string;
  customer_name: string;
  vehicle_name: string;
  vehicle_price: number;
  remaining_balance: number;
  total_installments: number;
  paid_installments: number;
  overdue_installments: number;
  next_due_date: string | null;
  next_due_amount: number | null;
  created_at: string;
}

export default function InstallmentsPage() {
  const { user } = useSelector((state: RootState) => state.auth);
  const [overdueList, setOverdueList] = useState<OverdueInstallment[]>([]);
  const [installmentSales, setInstallmentSales] = useState<InstallmentSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [paymentModal, setPaymentModal] = useState<{
    id: string;
    amount: number;
    max: number;
    inst: OverdueInstallment;
    paid?: boolean;
  } | null>(null);

  useEffect(() => {
    loadAll();
  }, [user?.id]);

  const loadAll = async () => {
    if (!user) return;
    setLoading(true);
    const [overdueRes, salesRes] = await Promise.all([
      window.api.getOverdueInstallments(user.id),
      (window.api as any).getInstallmentSales(user.id),
    ]);
    if (overdueRes.success) setOverdueList(overdueRes.data || []);
    if (salesRes?.success) setInstallmentSales(salesRes.data || []);
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
      setPaymentModal((prev) => prev ? { ...prev, paid: true } : null);
      loadAll();
    } else {
      toast.error(result.error);
    }
  };

  const fmt = (v: number) => `PKR ${v?.toLocaleString() || "0"}`;

  const filteredOverdue = overdueList.filter(
    (i) =>
      !search ||
      i.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      i.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
      i.vehicle_name.toLowerCase().includes(search.toLowerCase()),
  );

  const filteredSales = installmentSales.filter(
    (s) =>
      !search ||
      s.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      s.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
      s.vehicle_name.toLowerCase().includes(search.toLowerCase()),
  );

  const totalOverdue = filteredOverdue.reduce(
    (sum, i) => sum + (i.amount - i.paid_amount),
    0,
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Installments
        </h1>
        {totalOverdue > 0 && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 px-4 py-2 rounded-lg font-semibold">
            Total Overdue: {fmt(totalOverdue)}
          </div>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search by customer, invoice, vehicle..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field pl-10"
        />
      </div>

      {/* ── Section 1: All Installment Sales ─────────────────────────── */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Sales on Installments
          <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
            ({filteredSales.length} active)
          </span>
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr>
                <th className="table-header">Invoice</th>
                <th className="table-header">Customer</th>
                <th className="table-header">Vehicle</th>
                <th className="table-header text-right">Remaining</th>
                <th className="table-header text-center">Progress</th>
                <th className="table-header">Next Due</th>
                <th className="table-header text-right">Next Amount</th>
                <th className="table-header text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={8} className="table-cell text-center">Loading...</td>
                </tr>
              ) : filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={8} className="table-cell text-center text-gray-500">
                    No active installment sales
                  </td>
                </tr>
              ) : (
                filteredSales.map((s) => {
                  const progressPct = s.total_installments
                    ? Math.round((s.paid_installments / s.total_installments) * 100)
                    : 0;
                  const hasOverdue = s.overdue_installments > 0;
                  return (
                    <tr
                      key={s.sale_id}
                      className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 ${hasOverdue ? "bg-orange-50/40 dark:bg-orange-900/5" : ""}`}
                    >
                      <td className="table-cell font-mono text-sm">
                        <Link
                          to={`/sales/${s.sale_id}`}
                          className="text-blue-600 hover:underline"
                        >
                          {s.invoice_number}
                        </Link>
                      </td>
                      <td className="table-cell font-medium">{s.customer_name}</td>
                      <td className="table-cell">{s.vehicle_name}</td>
                      <td className="table-cell text-right font-semibold text-orange-600">
                        {fmt(s.remaining_balance)}
                      </td>
                      <td className="table-cell text-center">
                        <div className="flex items-center gap-2 justify-center">
                          <div className="w-20 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-green-500 rounded-full"
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500">
                            {s.paid_installments}/{s.total_installments}
                          </span>
                        </div>
                      </td>
                      <td className="table-cell">
                        {s.next_due_date
                          ? fmtDate(s.next_due_date)
                          : "—"}
                      </td>
                      <td className="table-cell text-right">
                        {s.next_due_amount ? fmt(s.next_due_amount) : "—"}
                      </td>
                      <td className="table-cell text-center">
                        {hasOverdue ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded-full">
                            <FiAlertTriangle size={11} />
                            {s.overdue_installments} Overdue
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-600 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-full">
                            On Track
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Section 2: Overdue Installments ──────────────────────────── */}
      <div className="card border border-red-200 dark:border-red-800">
        <h2 className="text-lg font-semibold text-red-700 dark:text-red-400 mb-4 flex items-center gap-2">
          <FiAlertTriangle />
          Overdue Installments
          {filteredOverdue.length > 0 && (
            <span className="ml-1 text-sm font-normal text-gray-500 dark:text-gray-400">
              ({filteredOverdue.length})
            </span>
          )}
        </h2>
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
                  <td colSpan={10} className="table-cell text-center">Loading...</td>
                </tr>
              ) : filteredOverdue.length === 0 ? (
                <tr>
                  <td colSpan={10} className="table-cell text-center text-gray-500">
                    No overdue installments
                  </td>
                </tr>
              ) : (
                filteredOverdue.map((inst) => {
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
                      <td className="table-cell font-medium">{inst.customer_name}</td>
                      <td className="table-cell">{inst.vehicle_name}</td>
                      <td className="table-cell">{inst.installment_number}</td>
                      <td className="table-cell">
                        {fmtDate(inst.due_date)}
                      </td>
                      <td className="table-cell text-right">{fmt(inst.amount)}</td>
                      <td className="table-cell text-right text-green-600">
                        {fmt(inst.paid_amount)}
                      </td>
                      <td className="table-cell text-right text-red-600 font-semibold">
                        {fmt(remaining)}
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
                              inst,
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
          onClick={() => !paymentModal.paid && setPaymentModal(null)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            {paymentModal.paid ? (
              /* ── Success / Receipt Screen ── */
              <div className="text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
                  <FiCheck size={32} className="text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Payment Recorded
                </h3>
                <div className="text-left bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Customer</span>
                    <span className="font-medium">{paymentModal.inst.customer_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Vehicle</span>
                    <span className="font-medium">{paymentModal.inst.vehicle_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Installment #</span>
                    <span className="font-medium">{paymentModal.inst.installment_number}</span>
                  </div>
                  <div className="flex justify-between border-t pt-1 mt-1 dark:border-gray-600">
                    <span className="text-gray-500">Amount Paid</span>
                    <span className="font-bold text-green-600">{fmt(paymentModal.amount)}</span>
                  </div>
                </div>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => {
                      const doc = generatePaymentReceiptPdf({
                        receiptNumber: `RCP-${paymentModal.inst.invoice_number}-${paymentModal.inst.installment_number}`,
                        paymentDate: new Date().toISOString().split("T")[0],
                        customerName: paymentModal.inst.customer_name,
                        vehicleName: paymentModal.inst.vehicle_name,
                        invoiceNumber: paymentModal.inst.invoice_number,
                        installmentNumber: paymentModal.inst.installment_number,
                        amountPaid: paymentModal.amount,
                        receivedBy: user?.full_name || user?.username || "Staff",
                      });
                      doc.save(`Receipt_${paymentModal.inst.invoice_number}_Inst${paymentModal.inst.installment_number}.pdf`);
                    }}
                    className="btn-primary flex items-center gap-2"
                  >
                    <FiPrinter size={15} /> Print Receipt
                  </button>
                  <button onClick={() => setPaymentModal(null)} className="btn-secondary">
                    Close
                  </button>
                </div>
              </div>
            ) : (
              /* ── Payment Form ── */
              <>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Record Payment
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Amount (max: {fmt(paymentModal.max)})
                    </label>
                    <input
                      type="number"
                      value={paymentModal.amount}
                      onChange={(e) =>
                        setPaymentModal((prev) =>
                          prev
                            ? { ...prev, amount: Math.min(parseFloat(e.target.value) || 0, prev.max) }
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
                    <button onClick={() => setPaymentModal(null)} className="btn-secondary">
                      Cancel
                    </button>
                    <button onClick={handlePayment} className="btn-primary">
                      Confirm Payment
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
