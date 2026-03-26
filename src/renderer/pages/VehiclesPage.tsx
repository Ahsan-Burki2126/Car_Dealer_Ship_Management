import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "../store";
import type { Vehicle, VehicleStatus } from "../../shared/types";
import { VEHICLE_STATUSES } from "../../shared/constants";
import { FiPlus, FiSearch, FiEye, FiEdit, FiTrash2 } from "react-icons/fi";
import { toast } from "react-toastify";
import { confirmDeleteRecord } from "../utils/confirmDelete";
import { useSuperadminAuth } from "../components/SuperadminPasswordModal";

export default function VehiclesPage() {
  const { user } = useSelector((state: RootState) => state.auth);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { requestAuth, PasswordModal } = useSuperadminAuth();

  useEffect(() => {
    loadVehicles();
  }, [search, statusFilter, page]);

  const loadVehicles = async () => {
    setLoading(true);
    const result = await window.api.getVehicles({
      search,
      status: statusFilter || undefined,
      page,
      limit: 20,
    });
    if (result.success) {
      setVehicles(result.data.data);
      setTotal(result.data.total);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirmDeleteRecord()) return;
    const result = await window.api.deleteVehicle(user!.id, id);
    if (result.success) {
      toast.success("Vehicle deleted");
      loadVehicles();
    } else {
      toast.error(result.error);
    }
  };

  const getStatusBadge = (status: VehicleStatus) => {
    const styles: Record<string, string> = {
      purchased: "badge-info",
      in_stock: "badge-success",
      reserved: "badge-warning",
      sold: "badge-gray",
      on_installments: "badge-warning",
    };
    return styles[status] || "badge-gray";
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Vehicles
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {total} vehicles total
          </p>
        </div>
        <Link
          to="/vehicles/new"
          className="btn-primary flex items-center gap-2"
        >
          <FiPlus /> Add Vehicle
        </Link>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by chassis number..."
              className="input-field pl-10"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="input-field w-full sm:w-48"
          >
            <option value="">All Statuses</option>
            {VEHICLE_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="table-header">Vehicle</th>
                <th className="table-header">Chassis #</th>
                <th className="table-header">Registration</th>
                <th className="table-header">Year</th>
                <th className="table-header">Color</th>
                <th className="table-header">Status</th>
                <th className="table-header">Purchase Price</th>
                <th className="table-header">Total Cost</th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : vehicles.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-gray-500">
                    No vehicles found
                  </td>
                </tr>
              ) : (
                vehicles.map((v) => (
                  <tr
                    key={v.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/30"
                  >
                    <td className="table-cell font-medium">
                      {v.make} {v.model}
                    </td>
                    <td className="table-cell font-mono text-sm">
                      {v.chassis_number || "-"}
                    </td>
                    <td className="table-cell">
                      {v.registration_number || "-"}
                    </td>
                    <td className="table-cell">{(v as any).year_of_manufacture || (v as any).year}</td>
                    <td className="table-cell">{v.color || "-"}</td>
                    <td className="table-cell">
                      <span className={getStatusBadge(v.status)}>
                        {
                          VEHICLE_STATUSES.find((s) => s.value === v.status)
                            ?.label
                        }
                      </span>
                    </td>
                    <td className="table-cell">
                      Rs {v.purchase_price?.toLocaleString()}
                    </td>
                    <td className="table-cell">
                      Rs {v.total_cost?.toLocaleString()}
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => navigate(`/vehicles/${v.id}`)}
                          className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-400"
                          title="View"
                        >
                          <FiEye size={16} />
                        </button>
                        <button
                          onClick={() => requestAuth(() => navigate(`/vehicles/${v.id}/edit`))}
                          className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-400"
                          title="Edit"
                        >
                          <FiEdit size={16} />
                        </button>
                        <button
                          onClick={() => requestAuth(() => handleDelete(v.id))}
                          className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600"
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-secondary text-sm py-1.5"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="btn-secondary text-sm py-1.5"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
      <PasswordModal />
    </div>
  );
}
