import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "../store";
import {
  FiTruck,
  FiUsers,
  FiShoppingCart,
  FiDollarSign,
  FiAlertTriangle,
  FiCalendar,
  FiTrendingUp,
  FiPackage,
} from "react-icons/fi";
import type { DashboardStats } from "../../shared/types";

export default function DashboardPage() {
  const { user } = useSelector((state: RootState) => state.auth);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (user?.id) {
      loadDashboard();
    }
  }, [user?.id]);

  const loadDashboard = async () => {
    if (!user) return;
    const result = await window.api.getDashboardStats(user.id);
    if (result.success) setStats(result.data);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading dashboard...</div>
      </div>
    );
  }

  if (!stats) return null;

  const statCards = [
    {
      label: "Total Vehicles",
      value: stats.totalVehicles,
      icon: FiTruck,
      color: "bg-blue-500",
      link: "/vehicles",
    },
    {
      label: "In Stock",
      value: stats.vehiclesInStock,
      icon: FiPackage,
      color: "bg-green-500",
      link: "/vehicles",
    },
    {
      label: "Sold",
      value: stats.vehiclesSold,
      icon: FiTrendingUp,
      color: "bg-purple-500",
      link: "/vehicles",
    },
    {
      label: "On Installments",
      value: stats.vehiclesOnInstallment,
      icon: FiCalendar,
      color: "bg-orange-500",
      link: "/installments",
    },
    {
      label: "Total Customers",
      value: stats.totalCustomers,
      icon: FiUsers,
      color: "bg-teal-500",
      link: "/customers",
    },
    {
      label: "Total Sales",
      value: stats.totalSales,
      icon: FiShoppingCart,
      color: "bg-indigo-500",
      link: "/sales",
    },
    {
      label: "Total Revenue",
      value: `Rs ${stats.totalRevenue?.toLocaleString() || 0}`,
      icon: FiDollarSign,
      color: "bg-emerald-500",
      link: "/reports",
    },
    {
      label: "Overdue Installments",
      value: stats.overdueInstallments,
      icon: FiAlertTriangle,
      color: "bg-red-500",
      link: "/installments",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Dashboard
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Welcome back! Here's your dealership overview.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          to="/vehicles/new"
          className="card border-l-4 border-l-blue-500 hover:shadow-md transition-shadow"
        >
          <p className="text-sm text-gray-500 dark:text-gray-400">Primary Action</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">
            Buy Vehicle
          </p>
        </Link>
        <Link
          to="/sales/new"
          className="card border-l-4 border-l-green-500 hover:shadow-md transition-shadow"
        >
          <p className="text-sm text-gray-500 dark:text-gray-400">Primary Action</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">
            Sell Vehicle
          </p>
        </Link>
      </div>

      {stats.overdueAlerts?.length > 0 && (
        <div className="card border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/10">
          <h2 className="text-lg font-semibold text-red-700 dark:text-red-400 mb-3">
            Overdue Installment Alerts
          </h2>
          <div className="space-y-2">
            {stats.overdueAlerts.map((alert) => (
              <Link
                key={alert.installment_id}
                to={`/sales/${alert.sale_id}`}
                className="block rounded-lg bg-white/80 dark:bg-gray-800/60 p-3 hover:bg-white dark:hover:bg-gray-800"
              >
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Alert: Customer {alert.customer_name}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-300">
                  Installment overdue • Amount: Rs {alert.amount.toLocaleString()} • Due:{" "}
                  {new Date(alert.due_date).toLocaleDateString()}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => (
          <Link
            key={i}
            to={card.link}
            className="stat-card hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {card.label}
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {card.value}
                </p>
              </div>
              <div
                className={`w-12 h-12 rounded-xl ${card.color} flex items-center justify-center`}
              >
                <card.icon className="text-white text-xl" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Recent Sales
        </h2>
          {stats.recentSales?.length > 0 ? (
            <div className="space-y-3">
              {stats.recentSales.map((sale: any) => (
                <Link
                  key={sale.id}
                  to={`/sales/${sale.id}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {sale.make} {sale.model} {sale.year}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {sale.customer_name} &bull; {sale.invoice_number}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      Rs {sale.vehicle_price?.toLocaleString()}
                    </p>
                    <span
                      className={`text-xs ${sale.payment_type === "cash" ? "text-green-600" : "text-orange-600"}`}
                    >
                      {sale.payment_type === "cash" ? "Cash" : "Installment"}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No sales recorded yet.
            </p>
          )}
        </div>
    </div>
  );
}

