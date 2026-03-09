import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    const result = await window.api.getDashboardStats();
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

      {/* Stats Grid */}
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

      {/* Recent Activity & Sales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Sales */}
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

        {/* Recent Activity */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Recent Activity
          </h2>
          {stats.recentActivities?.length > 0 ? (
            <div className="space-y-3">
              {stats.recentActivities.map((log: any) => (
                <div
                  key={log.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/30"
                >
                  <div className="w-2 h-2 rounded-full bg-primary-500 mt-2 flex-shrink-0"></div>
                  <div className="min-w-0">
                    <p className="text-sm text-gray-900 dark:text-gray-200">
                      <span className="font-medium">{log.username}</span>{" "}
                      {log.action_type} {log.affected_entity}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(log.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No recent activity.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
