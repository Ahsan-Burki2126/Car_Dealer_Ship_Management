import React from "react";
import { Outlet } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "../../store";
import Sidebar from "./Sidebar";
import Header from "./Header";

export default function MainLayout() {
  const { sidebarOpen } = useSelector((state: RootState) => state.ui);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <div
        className={`flex flex-col flex-1 overflow-hidden transition-all duration-300 ${sidebarOpen ? "ml-64" : "ml-20"}`}
      >
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
