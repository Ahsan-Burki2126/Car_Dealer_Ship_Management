import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "../store";
import {
  FiChevronLeft,
  FiChevronRight,
  FiShield,
} from "react-icons/fi";

interface AuditLog {
  id: string;
  username: string;
  action_type: string;
  affected_entity: string;
  entity_id?: string;
  old_value?: string;
  new_value?: string;
  timestamp: string;
}

const actionBadge: Record<string, string> = {
  create:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  update: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  delete: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  login:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  payment:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  restore:
    "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
};

export default function AuditLogsPage() {
  const { user } = useSelector((state: RootState) => state.auth);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [entity, setEntity] = useState("");
  const [page, setPage] = useState(1);
  const limit = 30;

  useEffect(() => {
    loadLogs();
  }, [page, entity, user?.id]);

  const loadLogs = async () => {
    if (!user) return;
    setLoading(true);
    const result = await window.api.getAuditLogs(user!.id, {
      entity,
      page,
      limit,
    });
    if (result.success) {
      setLogs(result.data.data);
      setTotal(result.data.total);
    }
    setLoading(false);
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <FiShield className="text-blue-600 dark:text-blue-400" size={24} />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          System Activity Logs
        </h1>
        <span className="text-sm text-gray-500 dark:text-gray-400">({total} entries)</span>
      </div>

      <div className="card">
        <div className="flex gap-4 mb-4">
          <select
            value={entity}
            onChange={(e) => {
              setEntity(e.target.value);
              setPage(1);
            }}
            className="input-field w-auto"
          >
            <option value="">All Entities</option>
            {[
              "users",
              "vehicles",
              "customers",
              "sales",
              "installments",
              "inspections",
              "showroom_expenses",
              "database",
            ].map((entityValue) => (
              <option key={entityValue} value={entityValue}>
                {entityValue.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr>
                <th className="table-header">Timestamp</th>
                <th className="table-header">User</th>
                <th className="table-header">Action</th>
                <th className="table-header">Entity</th>
                <th className="table-header">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={5} className="table-cell text-center">
                    Loading...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="table-cell text-center text-gray-500 dark:text-gray-400"
                  >
                    No logs found
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
                    <td className="table-cell text-sm whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="table-cell font-medium">{log.username}</td>
                    <td className="table-cell">
                      <span
                        className={`text-xs px-2 py-0.5 rounded font-medium ${actionBadge[log.action_type] || "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"}`}
                      >
                        {log.action_type}
                      </span>
                    </td>
                    <td className="table-cell">
                      <span className="capitalize">{log.affected_entity}</span>
                      <span className="text-xs text-gray-400 ml-1">
                        #{log.entity_id?.slice(0, 8)}
                      </span>
                    </td>
                    <td className="table-cell text-sm text-gray-600 dark:text-gray-400 max-w-md truncate">
                      {log.new_value || log.old_value || "-"}
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
                onClick={() => setPage((prev) => prev - 1)}
                disabled={page === 1}
                className="btn-secondary p-2 disabled:opacity-50"
              >
                <FiChevronLeft />
              </button>
              <button
                onClick={() => setPage((prev) => prev + 1)}
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
