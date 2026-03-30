import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "../store";
import { FiArrowLeft, FiEdit, FiFileText } from "react-icons/fi";
import { toFileUrl } from "../utils/filePaths";
import { useSuperadminAuth } from "../components/SuperadminPasswordModal";

const IMG_PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='140'%3E%3Crect width='200' height='140' fill='%23e5e7eb'/%3E%3Ctext x='100' y='76' text-anchor='middle' fill='%239ca3af' font-size='13' font-family='sans-serif'%3ENo image%3C/text%3E%3C/svg%3E";

interface CustomerDetail {
  id: string;
  name: string;
  father_name: string;
  cnic: string;
  phone: string;
  address: string;
  photo_path?: string;
  cnic_photo_path?: string;
  cnic_photo_back_path?: string;
  witness_name?: string;
  witness_father_name?: string;
  witness_cnic?: string;
  witness_phone?: string;
  witness_cnic_photo_path?: string;
  witness_cnic_photo_back_path?: string;
  notes: string;
  created_at: string;
}
interface LedgerSale {
  id: string;
  invoice_number: string;
  make: string;
  model: string;
  year: number;
  registration_number: string;
  date: string;
  vehicle_price: number;
  payment_type: string;
  remaining_balance: number;
  down_payment: number;
  status: string;
}

interface LedgerData {
  sales: LedgerSale[];
  payments: any[];
  totalPaid: number;
  totalPending: number;
}

export default function CustomerDetailPage() {
  const { user } = useSelector((state: RootState) => state.auth);
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const { requestAuth, modal } = useSuperadminAuth();
  const [ledger, setLedger] = useState<LedgerData>({
    sales: [],
    payments: [],
    totalPaid: 0,
    totalPending: 0,
  });

  useEffect(() => {
    if (id) {
      loadCustomer();
      loadLedger();
    }
  }, [id, user?.id]);

  const loadCustomer = async () => {
    const result = await window.api.getCustomerById(id!);
    if (result.success) setCustomer(result.data);
  };

  const loadLedger = async () => {
    if (!user) return;
    const result = await window.api.getCustomerLedger(user!.id, id!);
    if (result.success)
      setLedger(
        result.data || {
          sales: [],
          payments: [],
          totalPaid: 0,
          totalPending: 0,
        },
      );
  };

  if (!customer)
    return <div className="text-center py-12 text-gray-500">Loading...</div>;

  const formatCurrency = (v: number) => `PKR ${v?.toLocaleString() || "0"}`;

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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {customer.name}
          </h1>
        </div>
        <button
          onClick={() => requestAuth(() => navigate(`/customers/${id}/edit`))}
          className="btn-primary flex items-center gap-2"
        >
          <FiEdit /> Edit
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Customer Information
          </h2>
          <dl className="space-y-3">
            {[
              ["Name", customer.name],
              ["Father's Name", customer.father_name || "-"],
              ["CNIC", customer.cnic || "-"],
              ["Phone", customer.phone || "-"],
              ["Address", customer.address || "-"],
              ["Witness Name", customer.witness_name || "-"],
              ["Witness Father Name", customer.witness_father_name || "-"],
              ["Witness CNIC", customer.witness_cnic || "-"],
              ["Witness Phone", customer.witness_phone || "-"],
              ["Notes", customer.notes || "-"],
              [
                "Registered",
                new Date(customer.created_at).toLocaleDateString(),
              ],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between">
                <dt className="text-sm text-gray-500 dark:text-gray-400">
                  {label}
                </dt>
                <dd className="text-sm font-medium text-gray-900 dark:text-white text-right max-w-[60%]">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Summary
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">
                {ledger.sales.length}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Total Purchases
              </p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(ledger.totalPaid)}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Total Paid
              </p>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(ledger.totalPending)}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Outstanding
              </p>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-purple-600">
                {formatCurrency(
                  ledger.sales.reduce((sum, l) => sum + l.vehicle_price, 0),
                )}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Total Value
              </p>
            </div>
          </div>
        </div>
      </div>

      {(customer.photo_path || customer.cnic_photo_path || customer.cnic_photo_back_path || customer.witness_cnic_photo_path || customer.witness_cnic_photo_back_path) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {customer.photo_path && (
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Customer Photo
              </h2>
              <img
                src={toFileUrl(customer.photo_path)}
                alt={customer.name}
                className="max-w-full rounded-xl border border-gray-200 dark:border-gray-700"
                onError={(e) => { (e.target as HTMLImageElement).src = IMG_PLACEHOLDER; }}
              />
            </div>
          )}
          {customer.cnic_photo_path && (
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                CNIC (Front)
              </h2>
              <img
                src={toFileUrl(customer.cnic_photo_path)}
                alt={`${customer.name} CNIC Front`}
                className="max-w-full rounded-xl border border-gray-200 dark:border-gray-700"
                onError={(e) => { (e.target as HTMLImageElement).src = IMG_PLACEHOLDER; }}
              />
            </div>
          )}
          {customer.cnic_photo_back_path && (
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                CNIC (Back)
              </h2>
              <img
                src={toFileUrl(customer.cnic_photo_back_path)}
                alt={`${customer.name} CNIC Back`}
                className="max-w-full rounded-xl border border-gray-200 dark:border-gray-700"
                onError={(e) => { (e.target as HTMLImageElement).src = IMG_PLACEHOLDER; }}
              />
            </div>
          )}
          {customer.witness_cnic_photo_path && (
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Witness CNIC (Front)
              </h2>
              <img
                src={toFileUrl(customer.witness_cnic_photo_path)}
                alt={`${customer.name} Witness CNIC Front`}
                className="max-w-full rounded-xl border border-gray-200 dark:border-gray-700"
                onError={(e) => { (e.target as HTMLImageElement).src = IMG_PLACEHOLDER; }}
              />
            </div>
          )}
          {customer.witness_cnic_photo_back_path && (
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Witness CNIC (Back)
              </h2>
              <img
                src={toFileUrl(customer.witness_cnic_photo_back_path)}
                alt={`${customer.name} Witness CNIC Back`}
                className="max-w-full rounded-xl border border-gray-200 dark:border-gray-700"
                onError={(e) => { (e.target as HTMLImageElement).src = IMG_PLACEHOLDER; }}
              />
            </div>
          )}
        </div>
      )}

      {/* Ledger */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <FiFileText /> Purchase Ledger
        </h2>
        {ledger.sales.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No purchases yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr>
                  <th className="table-header">Invoice</th>
                  <th className="table-header">Vehicle</th>
                  <th className="table-header">Date</th>
                  <th className="table-header">Type</th>
                  <th className="table-header text-right">Sale Price</th>
                  <th className="table-header text-right">Balance</th>
                  <th className="table-header">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {ledger.sales.map((l) => (
                  <tr
                    key={l.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
                    <td className="table-cell font-mono text-sm">
                      {l.invoice_number}
                    </td>
                    <td className="table-cell font-medium">
                      {l.year} {l.make} {l.model}
                    </td>
                    <td className="table-cell">
                      {new Date(l.date).toLocaleDateString()}
                    </td>
                    <td className="table-cell capitalize">{l.payment_type}</td>
                    <td className="table-cell text-right">
                      {formatCurrency(l.vehicle_price)}
                    </td>
                    <td className="table-cell text-right text-red-600">
                      {formatCurrency(l.remaining_balance)}
                    </td>
                    <td className="table-cell">
                      <Link
                        to={`/sales/${l.id}`}
                        className="text-blue-600 hover:underline text-sm"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {modal}
    </div>
  );
}
