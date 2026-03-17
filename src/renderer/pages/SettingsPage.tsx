import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import type { RootState, AppDispatch } from "../store";
import { toggleDarkMode } from "../store/slices/uiSlice";
import { toast } from "react-toastify";
import {
  FiSettings,
  FiLock,
  FiMoon,
  FiSun,
  FiCreditCard,
  FiEdit,
} from "react-icons/fi";

interface BankAccountRecord {
  id: string;
  name: string;
  account_title?: string;
  account_number?: string;
  type: "bank" | "wallet";
  is_active: boolean;
}

export default function SettingsPage() {
  const { user } = useSelector((state: RootState) => state.auth);
  const { darkMode } = useSelector((state: RootState) => state.ui);
  const dispatch = useDispatch<AppDispatch>();

  const [passwords, setPasswords] = useState({
    current: "",
    newPass: "",
    confirm: "",
  });
  const [changing, setChanging] = useState(false);
  const [bankAccounts, setBankAccounts] = useState<BankAccountRecord[]>([]);
  const [editingBankId, setEditingBankId] = useState<string | null>(null);
  const [bankForm, setBankForm] = useState({
    bank_name: "",
    account_title: "",
    account_number: "",
    type: "bank" as "bank" | "wallet",
  });

  const canManageBanks =
    user?.role === "super_admin" || user?.role === "admin";

  useEffect(() => {
    if (canManageBanks && user?.id) {
      loadBankAccounts();
    }
  }, [canManageBanks, user?.id]);

  const loadBankAccounts = async () => {
    if (!user) return;
    const result = await window.api.getBankAccounts(user.id, false);
    if (result.success) {
      setBankAccounts(result.data || []);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwords.newPass !== passwords.confirm) {
      toast.error("Passwords do not match");
      return;
    }
    if (passwords.newPass.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setChanging(true);
    const result = await window.api.changePassword(
      user!.id,
      passwords.current,
      passwords.newPass,
    );
    if (result.success) {
      toast.success("Password changed successfully");
      setPasswords({ current: "", newPass: "", confirm: "" });
    } else {
      toast.error(result.error);
    }
    setChanging(false);
  };

  const resetBankForm = () => {
    setEditingBankId(null);
    setBankForm({
      bank_name: "",
      account_title: "",
      account_number: "",
      type: "bank",
    });
  };

  const handleBankSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const payload = {
      bank_name: bankForm.bank_name,
      account_title: bankForm.account_title,
      account_number: bankForm.account_number,
      type: bankForm.type,
    };
    const result = editingBankId
      ? await window.api.updateBankAccount(user.id, editingBankId, payload)
      : await window.api.createBankAccount(user.id, payload);
    if (result.success) {
      toast.success(editingBankId ? "Bank account updated" : "Bank account added");
      resetBankForm();
      loadBankAccounts();
    } else {
      toast.error(result.error || "Failed to save bank account");
    }
  };

  const startBankEdit = (account: BankAccountRecord) => {
    setEditingBankId(account.id);
    setBankForm({
      bank_name: account.name || "",
      account_title: account.account_title || "",
      account_number: account.account_number || "",
      type: account.type || "bank",
    });
  };

  const toggleBankStatus = async (account: BankAccountRecord) => {
    if (!user) return;
    const result = await window.api.updateBankAccount(user.id, account.id, {
      is_active: !account.is_active,
    });
    if (result.success) {
      toast.success(
        !account.is_active ? "Bank account activated" : "Bank account deactivated",
      );
      loadBankAccounts();
    } else {
      toast.error(result.error || "Failed to update bank account");
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <FiSettings className="text-blue-600" size={24} />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Settings
        </h1>
      </div>

      {/* Account Info */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Account Information
        </h2>
        <dl className="space-y-3">
          <div className="flex justify-between">
            <dt className="text-sm text-gray-500">Username</dt>
            <dd className="text-sm font-medium text-gray-900 dark:text-white">
              {user?.username}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-sm text-gray-500">Full Name</dt>
            <dd className="text-sm font-medium text-gray-900 dark:text-white">
              {user?.full_name}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-sm text-gray-500">Role</dt>
            <dd className="text-sm font-medium text-gray-900 dark:text-white capitalize">
              {user?.role.replace(/_/g, " ")}
            </dd>
          </div>
        </dl>
      </div>

      {/* Appearance */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Appearance
        </h2>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {darkMode ? <FiMoon size={20} /> : <FiSun size={20} />}
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                Dark Mode
              </p>
              <p className="text-sm text-gray-500">Toggle dark/light theme</p>
            </div>
          </div>
          <button
            onClick={() => dispatch(toggleDarkMode())}
            className={`relative w-14 h-7 rounded-full transition-colors ${darkMode ? "bg-blue-600" : "bg-gray-300"}`}
          >
            <span
              className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${darkMode ? "left-8" : "left-1"}`}
            ></span>
          </button>
        </div>
      </div>

      {/* Change Password */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <FiLock /> Change Password
        </h2>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Current Password
            </label>
            <input
              type="password"
              value={passwords.current}
              onChange={(e) =>
                setPasswords((prev) => ({ ...prev, current: e.target.value }))
              }
              className="input-field"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              New Password
            </label>
            <input
              type="password"
              value={passwords.newPass}
              onChange={(e) =>
                setPasswords((prev) => ({ ...prev, newPass: e.target.value }))
              }
              className="input-field"
              required
              minLength={6}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Confirm New Password
            </label>
            <input
              type="password"
              value={passwords.confirm}
              onChange={(e) =>
                setPasswords((prev) => ({ ...prev, confirm: e.target.value }))
              }
              className="input-field"
              required
            />
          </div>
          <button
            type="submit"
            disabled={changing}
            className="btn-primary disabled:opacity-50"
          >
            {changing ? "Changing..." : "Change Password"}
          </button>
        </form>
      </div>

      {canManageBanks && (
        <div className="card space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <FiCreditCard /> Bank Accounts Management
          </h2>

          <form onSubmit={handleBankSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <input
              type="text"
              value={bankForm.bank_name}
              onChange={(e) =>
                setBankForm((prev) => ({ ...prev, bank_name: e.target.value }))
              }
              className="input-field md:col-span-2"
              placeholder="Bank Name"
              required
            />
            <input
              type="text"
              value={bankForm.account_title}
              onChange={(e) =>
                setBankForm((prev) => ({ ...prev, account_title: e.target.value }))
              }
              className="input-field"
              placeholder="Account Title"
            />
            <input
              type="text"
              value={bankForm.account_number}
              onChange={(e) =>
                setBankForm((prev) => ({ ...prev, account_number: e.target.value }))
              }
              className="input-field"
              placeholder="Account Number"
            />
            <select
              value={bankForm.type}
              onChange={(e) =>
                setBankForm((prev) => ({
                  ...prev,
                  type: e.target.value as "bank" | "wallet",
                }))
              }
              className="input-field"
            >
              <option value="bank">Bank</option>
              <option value="wallet">Wallet</option>
            </select>
            <div className="md:col-span-5 flex items-center gap-2">
              <button type="submit" className="btn-primary">
                {editingBankId ? "Update Account" : "Add Account"}
              </button>
              {editingBankId && (
                <button
                  type="button"
                  onClick={resetBankForm}
                  className="btn-secondary"
                >
                  Cancel Edit
                </button>
              )}
            </div>
          </form>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr>
                  <th className="table-header">Bank</th>
                  <th className="table-header">Account Title</th>
                  <th className="table-header">Account Number</th>
                  <th className="table-header">Type</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {bankAccounts.map((account) => (
                  <tr key={account.id}>
                    <td className="table-cell font-medium">{account.name}</td>
                    <td className="table-cell">{account.account_title || "-"}</td>
                    <td className="table-cell">{account.account_number || "-"}</td>
                    <td className="table-cell capitalize">{account.type}</td>
                    <td className="table-cell">
                      <span className={account.is_active ? "badge-green" : "badge-red"}>
                        {account.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => startBankEdit(account)}
                          className="p-1.5 text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded"
                          title="Edit"
                        >
                          <FiEdit size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleBankStatus(account)}
                          className="btn-secondary py-1 px-2 text-xs"
                        >
                          {account.is_active ? "Deactivate" : "Activate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {bankAccounts.length === 0 && (
                  <tr>
                    <td colSpan={6} className="table-cell text-center text-gray-500">
                      No bank accounts defined
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
