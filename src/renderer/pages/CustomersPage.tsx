import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "../store";
import { toast } from "react-toastify";
import {
  FiPlus,
  FiSearch,
  FiEye,
  FiEdit,
  FiTrash2,
  FiChevronLeft,
  FiChevronRight,
} from "react-icons/fi";
import { confirmDeleteRecord } from "../utils/confirmDelete";
import { useSuperadminAuth } from "../components/SuperadminPasswordModal";

interface Customer {
  id: string;
  name: string;
  father_name: string;
  cnic: string;
  phone: string;
  address: string;
  created_at: string;
}

export default function CustomersPage() {
  const { user } = useSelector((state: RootState) => state.auth);
  const navigate = useNavigate();
  const { requestAuth, PasswordModal } = useSuperadminAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const limit = 20;

  useEffect(() => {
    loadCustomers();
  }, [page, search]);

  const loadCustomers = async () => {
    setLoading(true);
    const result = await window.api.getCustomers({ search, page, limit });
    if (result.success) {
      setCustomers(result.data.data);
      setTotal(result.data.total);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirmDeleteRecord()) return;
    const result = await window.api.deleteCustomer(user!.id, id);
    if (result.success) {
      toast.success("Customer deleted");
      loadCustomers();
    } else toast.error(result.error);
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Customers
        </h1>
        <button
          onClick={() => navigate("/customers/new")}
          className="btn-primary flex items-center gap-2"
        >
          <FiPlus /> Add Customer
        </button>
      </div>

      <div className="card">
        <div className="mb-4">
          <div className="relative max-w-md">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, CNIC, phone..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="input-field pl-10"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr>
                <th className="table-header">Name</th>
                <th className="table-header">Father's Name</th>
                <th className="table-header">CNIC</th>
                <th className="table-header">Phone</th>
                <th className="table-header">Address</th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="table-cell text-center">
                    Loading...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="table-cell text-center text-gray-500"
                  >
                    No customers found
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr
                    key={c.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
                    <td className="table-cell font-medium">{c.name}</td>
                    <td className="table-cell">{c.father_name || "-"}</td>
                    <td className="table-cell font-mono text-sm">
                      {c.cnic || "-"}
                    </td>
                    <td className="table-cell">{c.phone || "-"}</td>
                    <td className="table-cell max-w-xs truncate">
                      {c.address || "-"}
                    </td>
                    <td className="table-cell">
                      <div className="flex gap-2">
                        <Link
                          to={`/customers/${c.id}`}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                        >
                          <FiEye size={16} />
                        </Link>
                        <button
                          onClick={() => requestAuth(() => navigate(`/customers/${c.id}/edit`))}
                          className="p-1.5 text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded"
                        >
                          <FiEdit size={16} />
                        </button>
                        <button
                          onClick={() => requestAuth(() => handleDelete(c.id))}
                          className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
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
      <PasswordModal />
    </div>
  );
}
