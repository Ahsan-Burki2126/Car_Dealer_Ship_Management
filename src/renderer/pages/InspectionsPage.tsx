import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FiPlus,
  FiSearch,
  FiEye,
  FiChevronLeft,
  FiChevronRight,
} from "react-icons/fi";

interface Inspection {
  id: string;
  vehicle_name: string;
  registration_number: string;
  inspector_name: string;
  overall_score: number;
  status: string;
  created_at: string;
}

const scoreBadge = (score: number) => {
  if (score >= 8) return "badge-green";
  if (score >= 5) return "badge-yellow";
  return "badge-red";
};

export default function InspectionsPage() {
  const navigate = useNavigate();
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const limit = 20;

  useEffect(() => {
    loadInspections();
  }, [page, search]);

  const loadInspections = async () => {
    setLoading(true);
    const result = await window.api.getInspections({ search, page, limit });
    if (result.success) {
      setInspections(result.data.data);
      setTotal(result.data.total);
    }
    setLoading(false);
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Inspections
        </h1>
        <button
          onClick={() => navigate("/inspections/new")}
          className="btn-primary flex items-center gap-2"
        >
          <FiPlus /> New Inspection
        </button>
      </div>

      <div className="card">
        <div className="mb-4">
          <div className="relative max-w-md">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by vehicle..."
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
                <th className="table-header">Vehicle</th>
                <th className="table-header">Registration</th>
                <th className="table-header">Inspector</th>
                <th className="table-header text-center">Score</th>
                <th className="table-header">Status</th>
                <th className="table-header">Date</th>
                <th className="table-header">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="table-cell text-center">
                    Loading...
                  </td>
                </tr>
              ) : inspections.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="table-cell text-center text-gray-500"
                  >
                    No inspections found
                  </td>
                </tr>
              ) : (
                inspections.map((i) => (
                  <tr
                    key={i.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
                    <td className="table-cell font-medium">{i.vehicle_name}</td>
                    <td className="table-cell font-mono text-sm">
                      {i.registration_number || "-"}
                    </td>
                    <td className="table-cell">{i.inspector_name}</td>
                    <td className="table-cell text-center">
                      <span
                        className={`${scoreBadge(i.overall_score)} text-base font-bold`}
                      >
                        {i.overall_score?.toFixed(1)}/10
                      </span>
                    </td>
                    <td className="table-cell capitalize">
                      <span
                        className={
                          i.status === "completed"
                            ? "badge-green"
                            : "badge-yellow"
                        }
                      >
                        {i.status}
                      </span>
                    </td>
                    <td className="table-cell">
                      {new Date(i.created_at).toLocaleDateString()}
                    </td>
                    <td className="table-cell">
                      <Link
                        to={`/inspections/${i.id}`}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                      >
                        <FiEye size={16} />
                      </Link>
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
