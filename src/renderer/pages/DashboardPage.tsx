import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { fmtDate } from "../utils/dateUtils";
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
import type { DashboardStats, Vehicle } from "../../shared/types";
import { toFileUrl } from "../utils/filePaths";

export default function DashboardPage() {
  const { user } = useSelector((state: RootState) => state.auth);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showcaseVehicles, setShowcaseVehicles] = useState<Vehicle[]>([]);
  const [lowStockThreshold, setLowStockThreshold] = useState(5);

  useEffect(() => {
    if (user?.id) {
      loadDashboard();
      loadShowcase();
      loadThreshold();
    }
  }, [user?.id]);

  const loadThreshold = async () => {
    const result = await (window.api as any).getLowStockThreshold();
    if (result?.success) setLowStockThreshold(result.data);
  };

  const loadDashboard = async () => {
    if (!user) return;
    const result = await window.api.getDashboardStats(user.id);
    if (result.success) setStats(result.data);
    setLoading(false);
  };

  const loadShowcase = async () => {
    const result = await window.api.getVehicles({
      status: "in_stock",
      limit: 12,
    });
    if (result.success) setShowcaseVehicles(result.data?.data || []);
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
      {/* Branding Header */}
      <div className="bg-gradient-to-r from-blue-700 to-indigo-800 rounded-xl p-6 text-white shadow-lg">
        <h1 className="text-3xl font-bold tracking-wide brand-title">
          Pak Japan Motors, Layyah
        </h1>
        <p className="text-blue-100 mt-1">
          Automobile Sales & Services ,Dashboard
        </p>
      </div>

      {/* Persistent Overdue Popup */}
      {stats.overdueAlerts?.length > 0 && (
        <div className="fixed top-4 right-4 z-50 max-w-sm w-full animate-pulse">
          <div className="bg-red-600 text-white rounded-xl shadow-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <FiAlertTriangle className="text-xl" />
              <h3 className="font-bold text-lg">Overdue Payments!</h3>
            </div>
            <p className="text-sm text-red-100 mb-3">
              {stats.overdueAlerts.length} installment(s) are overdue. This
              alert will remain until all payments are cleared.
            </p>
            {stats.overdueAlerts.slice(0, 3).map((alert) => (
              <Link
                key={alert.installment_id}
                to={`/sales/${alert.sale_id}`}
                className="block text-sm bg-red-700/50 rounded-lg p-2 mb-1 hover:bg-red-700"
              >
                {alert.customer_name} — Rs {alert.amount.toLocaleString()} (Due:{" "}
                {fmtDate(alert.due_date)})
              </Link>
            ))}
            {stats.overdueAlerts.length > 3 && (
              <Link
                to="/installments"
                className="text-xs text-red-200 hover:underline mt-1 block"
              >
                +{stats.overdueAlerts.length - 3} more...
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Low Stock Alert */}
      {stats.vehiclesInStock <= lowStockThreshold && (
        <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 rounded-xl px-4 py-3">
          <FiAlertTriangle className="flex-shrink-0 text-amber-500" size={18} />
          <p className="text-sm font-medium">
            Low stock warning — only <span className="font-bold">{stats.vehiclesInStock}</span> vehicle{stats.vehiclesInStock !== 1 ? "s" : ""} in stock (threshold: {lowStockThreshold}).{" "}
            <Link to="/vehicles" className="underline hover:no-underline">View inventory</Link>
          </p>
        </div>
      )}

      <div>
        <p className="text-gray-500 dark:text-gray-400">
          Welcome back! Here's your overview.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          to="/vehicles/new"
          className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white p-5 shadow-md hover:shadow-xl transition-all duration-300 active:scale-95"
        >
          <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition"></div>
          <p className="text-xl font-bold mt-1">Buy Vehicle</p>
        </Link>

        <Link
          to="/sales/new"
          className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-green-600 to-green-700 text-white p-5 shadow-md hover:shadow-xl transition-all duration-300 active:scale-95"
        >
          <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition"></div>
          <p className="text-xl font-bold mt-1">Sell Vehicle</p>
        </Link>
      </div>
      {/* Vehicle Showcase */}
      {showcaseVehicles.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Available in Showroom
            </h2>
            <Link
              to="/vehicles"
              className="text-sm text-blue-600 hover:underline"
            >
              View all →
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {showcaseVehicles.map((v) => (
              <Link
                key={v.id}
                to={`/vehicles/${v.id}`}
                className="group rounded-xl overflow-hidden bg-white dark:bg-gray-800 shadow-sm hover:shadow-lg transition-all duration-200 border border-gray-100 dark:border-gray-700"
              >
                <div className="aspect-[4/3] bg-gray-100 dark:bg-gray-700 overflow-hidden">
                  {v.photo_path ? (
                    <img
                      src={toFileUrl(v.photo_path)}
                      alt={`${v.make} ${v.model}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <FiTruck className="text-2xl text-gray-300 dark:text-gray-500" />
                    </div>
                  )}
                </div>
                <div className="p-2.5">
                  <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                    {v.make} {v.model}
                  </p>
                  <p className="text-[11px] text-gray-400 truncate">
                    {v.year_of_manufacture} • {v.color || "—"}
                  </p>
                  <p className="text-xs font-bold text-blue-600 dark:text-blue-400 mt-1">
                    Rs{" "}
                    {v.selling_price?.toLocaleString() ||
                      v.total_cost?.toLocaleString() ||
                      "—"}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Quick Access Section */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Quick Access
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Link
            to="/vehicles?status=in_stock"
            className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors text-center"
          >
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {stats.vehiclesInStock}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
              In Stock
            </p>
          </Link>

          <Link
            to="/sales"
            className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors text-center"
          >
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {stats.totalSales}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
              Total Sales
            </p>
          </Link>

          <Link
            to="/customers"
            className="p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors text-center"
          >
            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {stats.totalCustomers}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
              Customers
            </p>
          </Link>

          <Link
            to="/installments"
            className="p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 hover:bg-orange-100 dark:hover:bg-orange-900/40 transition-colors text-center"
          >
            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {stats.vehiclesOnInstallment}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
              On Installments
            </p>
          </Link>
        </div>
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
                  Installment overdue • Amount: Rs{" "}
                  {alert.amount.toLocaleString()} • Due:{" "}
                  {fmtDate(alert.due_date)}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}
      <hr />
      {/* <h1 className="text-white text-4xl font-bold">Overview</h1> */}
      {/* <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
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
      </div> */}

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
