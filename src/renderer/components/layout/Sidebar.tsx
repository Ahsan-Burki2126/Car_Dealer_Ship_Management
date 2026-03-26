import React from "react";
import { NavLink } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "../../store";
import {
  FiHome,
  FiTruck,
  FiUsers,
  FiShoppingCart,
  FiCalendar,
  FiDollarSign,
  FiBarChart2,
  FiSettings,
  FiUserCheck,
  FiDatabase,
} from "react-icons/fi";

const navItems = [
  {
    path: "/",
    label: "Dashboard",
    icon: FiHome,
    roles: ["super_admin", "admin"],
  },
  {
    path: "/vehicles",
    label: "Vehicles",
    icon: FiTruck,
    roles: ["super_admin", "admin"],
  },
  {
    path: "/customers",
    label: "Customers",
    icon: FiUsers,
    roles: ["super_admin", "admin"],
  },
  {
    path: "/sales",
    label: "Sales",
    icon: FiShoppingCart,
    roles: ["super_admin", "admin"],
  },
  {
    path: "/installments",
    label: "Installments",
    icon: FiCalendar,
    roles: ["super_admin", "admin"],
  },
  {
    path: "/expenses",
    label: "Expenses",
    icon: FiDollarSign,
    roles: ["super_admin", "admin"],
  },
  {
    path: "/reports",
    label: "Reports",
    icon: FiBarChart2,
    roles: ["super_admin", "admin"],
  },
  {
    path: "/backup",
    label: "Backup",
    icon: FiDatabase,
    roles: ["super_admin", "admin"],
  },
  { path: "/users", label: "Users", icon: FiUserCheck, roles: ["super_admin", "admin"] },
  {
    path: "/settings",
    label: "Settings",
    icon: FiSettings,
    roles: ["super_admin", "admin"],
  },
];

export default function Sidebar() {
  const { sidebarOpen } = useSelector((state: RootState) => state.ui);
  const { user } = useSelector((state: RootState) => state.auth);

  const filteredItems = navItems.filter(
    (item) => user && item.roles.includes(user.role),
  );

  return (
    <aside
      className={`fixed left-0 top-0 h-full bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 z-30 ${sidebarOpen ? "w-64" : "w-20"}`}
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary-600 flex items-center justify-center">
            <FiTruck className="text-white text-xl" />
          </div>
          {sidebarOpen && (
            <div>
              <h1 className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
                Pak Japan Motors
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Layyah
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="p-3 space-y-1 overflow-y-auto h-[calc(100%-4rem)]">
        {filteredItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/"}
            className={({ isActive }) =>
              isActive ? "sidebar-link-active" : "sidebar-link"
            }
            title={item.label}
          >
            <item.icon className="text-lg flex-shrink-0" />
            {sidebarOpen && <span className="text-sm">{item.label}</span>}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
