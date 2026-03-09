import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { INSPECTION_CATEGORIES, PANEL_LABELS } from "../../shared/constants";
import CarDamageMap from "../components/inspection/CarDamageMap";
import { FiArrowLeft, FiPrinter } from "react-icons/fi";

interface InspectionDetail {
  id: string;
  vehicle_id: string;
  vehicle_name: string;
  registration_number: string;
  inspector_name: string;
  overall_score: number;
  status: string;
  created_at: string;
  completed_at: string;
  items: {
    id: string;
    point_name: string;
    category: string;
    status: string;
    notes: string;
    deduction: number;
  }[];
  damage_map: { panel_id: string; status: string; notes: string }[];
}

const scoreBg = (score: number) =>
  score >= 8 ? "bg-green-500" : score >= 5 ? "bg-yellow-500" : "bg-red-500";

export default function InspectionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [inspection, setInspection] = useState<InspectionDetail | null>(null);
  const [activeCategory, setActiveCategory] = useState("summary");

  useEffect(() => {
    if (id) loadInspection();
  }, [id]);

  const loadInspection = async () => {
    const result = await window.api.getInspectionById(id!);
    if (result.success) setInspection(result.data);
  };

  if (!inspection)
    return <div className="text-center py-12 text-gray-500">Loading...</div>;

  const getCategoryScore = (cat: string) => {
    const catItems = inspection.items.filter((i) => i.category === cat);
    if (catItems.length === 0) return 10;
    const totalDeduction = catItems.reduce(
      (sum, i) => sum + (i.deduction || 0),
      0,
    );
    return Math.max(0, 10 - totalDeduction);
  };

  const getCategoryCounts = (cat: string) => {
    const catItems = inspection.items.filter((i) => i.category === cat);
    return {
      total: catItems.length,
      good: catItems.filter((i) => i.status === "good").length,
      fair: catItems.filter((i) => i.status === "fair").length,
      poor: catItems.filter((i) => i.status === "poor").length,
    };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <FiArrowLeft />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Inspection Report
            </h1>
            <p className="text-sm text-gray-500">
              {inspection.vehicle_name}{" "}
              {inspection.registration_number
                ? `(${inspection.registration_number})`
                : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div
            className={`${scoreBg(inspection.overall_score)} text-white text-2xl font-bold px-6 py-3 rounded-xl`}
          >
            {inspection.overall_score?.toFixed(1)}/10
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card text-center">
          <p className="text-sm text-gray-500">Inspector</p>
          <p className="font-semibold text-gray-900 dark:text-white">
            {inspection.inspector_name}
          </p>
        </div>
        <div className="card text-center">
          <p className="text-sm text-gray-500">Date</p>
          <p className="font-semibold text-gray-900 dark:text-white">
            {new Date(inspection.created_at).toLocaleDateString()}
          </p>
        </div>
        <div className="card text-center">
          <p className="text-sm text-gray-500">Status</p>
          <p
            className={`font-semibold capitalize ${inspection.status === "completed" ? "text-green-600" : "text-yellow-600"}`}
          >
            {inspection.status}
          </p>
        </div>
        <div className="card text-center">
          <p className="text-sm text-gray-500">Total Points</p>
          <p className="font-semibold text-gray-900 dark:text-white">
            {inspection.items.length}
          </p>
        </div>
      </div>

      {/* Category Scores */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Category Scores
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {INSPECTION_CATEGORIES.map((cat) => {
            const score = getCategoryScore(cat.value);
            const counts = getCategoryCounts(cat.value);
            return (
              <div
                key={cat.value}
                className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
              >
                <div
                  className={`w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold ${scoreBg(score)}`}
                >
                  {score.toFixed(1)}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-white">
                    {cat.label}
                  </p>
                  <div className="flex gap-3 text-xs text-gray-500">
                    <span className="text-green-600">{counts.good} Good</span>
                    <span className="text-yellow-600">{counts.fair} Fair</span>
                    <span className="text-red-600">{counts.poor} Poor</span>
                  </div>
                </div>
                <div className="w-24 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${scoreBg(score)}`}
                    style={{ width: `${score * 10}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveCategory("summary")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeCategory === "summary" ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"}`}
        >
          Damage Map
        </button>
        {INSPECTION_CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setActiveCategory(cat.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeCategory === cat.value ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"}`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Damage Map View */}
      {activeCategory === "summary" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <CarDamageMap damages={inspection.damage_map} readonly />
          </div>
          <div className="card">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
              Panel Details
            </h3>
            <div className="space-y-2">
              {inspection.damage_map.map((d) => (
                <div
                  key={d.panel_id}
                  className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded"
                >
                  <span className="text-sm font-medium">
                    {PANEL_LABELS[d.panel_id] || d.panel_id}
                  </span>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs capitalize px-2 py-0.5 rounded ${d.status === "original" ? "bg-green-100 text-green-700" : d.status === "repainted" ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}`}
                    >
                      {d.status}
                    </span>
                    {d.notes && (
                      <span className="text-xs text-gray-500" title={d.notes}>
                        📝
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Category Items Detail */}
      {activeCategory !== "summary" && (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr>
                  <th className="table-header">#</th>
                  <th className="table-header">Inspection Point</th>
                  <th className="table-header text-center">Status</th>
                  <th className="table-header text-right">Deduction</th>
                  <th className="table-header">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {inspection.items
                  .filter((i) => i.category === activeCategory)
                  .map((item, idx) => (
                    <tr
                      key={item.id}
                      className={`${item.status === "poor" ? "bg-red-50 dark:bg-red-900/10" : item.status === "fair" ? "bg-yellow-50 dark:bg-yellow-900/10" : ""}`}
                    >
                      <td className="table-cell text-gray-500">{idx + 1}</td>
                      <td className="table-cell font-medium">
                        {item.point_name}
                      </td>
                      <td className="table-cell text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-medium ${item.status === "good" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : item.status === "fair" ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" : item.status === "poor" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" : "bg-gray-100 text-gray-700"}`}
                        >
                          {item.status === "na"
                            ? "N/A"
                            : item.status.charAt(0).toUpperCase() +
                              item.status.slice(1)}
                        </span>
                      </td>
                      <td className="table-cell text-right text-red-600">
                        {item.deduction ? `-${item.deduction.toFixed(2)}` : "-"}
                      </td>
                      <td className="table-cell text-gray-500 text-sm">
                        {item.notes || "-"}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
