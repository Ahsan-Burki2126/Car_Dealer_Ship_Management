import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "../store";
import { fmtDate } from "../utils/dateUtils";
import { USER_ROLES } from "../../shared/constants";
import { toast } from "react-toastify";
import { FiPlus, FiEdit, FiTrash2, FiUsers } from "react-icons/fi";
import { useAccessControl } from "../components/SuperadminPasswordModal";

interface UserRecord {
  id: string;
  username: string;
  full_name: string;
  role: string;
  is_active: number;
  created_at: string;
}

export default function UsersPage() {
  const { user: currentUser } = useSelector((state: RootState) => state.auth);
  const {
    canEdit,
    canDelete,
    requestEditAction,
    requestDeleteAction,
    modal,
  } = useAccessControl();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    username: "",
    password: "",
    full_name: "",
    role: "admin",
  });

  useEffect(() => {
    loadUsers();
  }, [currentUser?.id]);

  const loadUsers = async () => {
    if (!currentUser) return;
    setLoading(true);
    const result = await window.api.getUsers(currentUser!.id);
    if (result.success) setUsers(result.data || []);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editId) {
      const updateData: any = { full_name: form.full_name, role: form.role };
      const result = await window.api.updateUser(
        currentUser!.id,
        editId,
        updateData,
      );
      if (result.success) {
        toast.success("User updated");
        resetForm();
        loadUsers();
      } else toast.error(result.error);
    } else {
      if (!form.password) {
        toast.error("Password is required");
        return;
      }
      const result = await window.api.createUser(currentUser!.id, form);
      if (result.success) {
        toast.success("User created");
        resetForm();
        loadUsers();
      } else toast.error(result.error);
    }
  };

  const startEdit = (u: UserRecord) => {
    setEditId(u.id);
    setForm({
      username: u.username,
      password: "",
      full_name: u.full_name,
      role: u.role,
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setShowForm(false);
    setEditId(null);
    setForm({ username: "", password: "", full_name: "", role: "admin" });
  };

  const handleDelete = async (userId: string) => {
    if (!currentUser) return;
    const result = await window.api.deleteUser(currentUser.id, userId);
    if (result.success) {
      toast.success("User deleted permanently");
      loadUsers();
    } else {
      toast.error(result.error || "Failed to delete user");
    }
  };

  const roleBadge: Record<string, string> = {
    super_admin: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    admin: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FiUsers className="text-blue-600" size={24} />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            User Management (Superadmin Only)
          </h1>
        </div>
        {currentUser?.role === "super_admin" && (
          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="btn-primary flex items-center gap-2"
          >
            <FiPlus /> Add User
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
            {editId ? "Edit User" : "New User"}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Username *
              </label>
              <input
                type="text"
                value={form.username}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, username: e.target.value }))
                }
                className="input-field"
                required
                disabled={!!editId}
              />
            </div>
            {!editId && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Password *
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, password: e.target.value }))
                  }
                  className="input-field"
                  required
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                value={form.full_name}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, full_name: e.target.value }))
                }
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Role
              </label>
              <select
                value={form.role}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, role: e.target.value }))
                }
                className="input-field"
              >
                {USER_ROLES.filter((r) => r.value !== "super_admin").map(
                  (r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ),
                )}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <button type="button" onClick={resetForm} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {editId ? "Update" : "Create"} User
            </button>
          </div>
        </form>
      )}

      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr>
                <th className="table-header">Username</th>
                <th className="table-header">Full Name</th>
                <th className="table-header">Role</th>
                <th className="table-header">Status</th>
                <th className="table-header">Created</th>
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
              ) : (
                users
                  .filter((u) => u.is_active === true)
                  .map((u) => (
                    <tr
                      key={u.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    >
                      <td className="table-cell font-medium">{u.username}</td>
                      <td className="table-cell">{u.full_name}</td>
                      <td className="table-cell">
                        <span
                          className={`text-xs px-2 py-0.5 rounded font-medium ${roleBadge[u.role] || ""}`}
                        >
                          {u.role.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="table-cell">
                        <span
                          className={u.is_active ? "badge-green" : "badge-red"}
                        >
                          {u.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="table-cell">
                        {fmtDate(u.created_at)}
                      </td>
                      <td className="table-cell">
                        {u.role !== "super_admin" && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() =>
                                requestEditAction(() => startEdit(u))
                              }
                              className="p-1.5 text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded"
                              title="Edit User"
                            >
                              <FiEdit size={16} />
                            </button>
                            <button
                              onClick={() =>
                                requestDeleteAction(() => handleDelete(u.id))
                              }
                              className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                              title="Delete User"
                            >
                              <FiTrash2 size={16} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      {modal}
    </div>
  );
}
