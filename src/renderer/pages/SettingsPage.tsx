import React, { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import type { RootState, AppDispatch } from "../store";
import { toggleDarkMode } from "../store/slices/uiSlice";
import { toast } from "react-toastify";
import { FiSettings, FiLock, FiMoon, FiSun } from "react-icons/fi";

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
    </div>
  );
}
