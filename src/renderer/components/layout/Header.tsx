import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import type { RootState, AppDispatch } from "../../store";
import { toggleSidebar, toggleDarkMode } from "../../store/slices/uiSlice";
import { logout } from "../../store/slices/authSlice";
import { FiMenu, FiSun, FiMoon, FiLogOut, FiUser } from "react-icons/fi";

export default function Header() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);
  const { darkMode } = useSelector((state: RootState) => state.ui);

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login");
  };

  const roleLabel =
    user?.role === "super_admin"
      ? "Super Admin"
      : user?.role === "admin"
        ? "Admin"
        : "Staff";

  return (
    <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => dispatch(toggleSidebar())}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
        >
          <FiMenu className="text-xl" />
        </button>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={() => dispatch(toggleDarkMode())}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
        >
          {darkMode ? (
            <FiSun className="text-xl" />
          ) : (
            <FiMoon className="text-xl" />
          )}
        </button>

        <div className="flex items-center gap-3 border-l border-gray-200 dark:border-gray-700 pl-4">
          <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
            <FiUser className="text-primary-600 dark:text-primary-400" />
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {user?.full_name}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {roleLabel}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-600 dark:text-gray-400 hover:text-red-600"
            title="Logout"
          >
            <FiLogOut />
          </button>
        </div>
      </div>
    </header>
  );
}
