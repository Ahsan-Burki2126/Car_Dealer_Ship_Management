import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "../store";
import {
  INSPECTION_CATEGORIES,
  DAMAGE_STATUSES,
  PANEL_LABELS,
} from "../../shared/constants";
import { INSPECTION_POINTS } from "../../shared/inspectionPoints";
import CarDamageMap from "../components/inspection/CarDamageMap";
import { toast } from "react-toastify";
import { FiArrowLeft, FiSave, FiCheck } from "react-icons/fi";

interface VehicleOption {
  id: string;
  make: string;
  model: string;
  year: number;
  registration_number: string;
}

export default function InspectionFormPage() {
  const { user } = useSelector((state: RootState) => state.auth);
  const navigate = useNavigate();

  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [vehicleId, setVehicleId] = useState("");
  const [inspectionId, setInspectionId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>(
    INSPECTION_CATEGORIES[0]?.value ?? "",
  );
  const [activeDamagePanel, setActiveDamagePanel] = useState<string | null>(
    null,
  );

  // Inspection items state
  const [items, setItems] = useState<
    Record<string, { status: string; notes: string }>
  >({});
  const [damages, setDamages] = useState<
    { panel_id: string; status: string; notes: string }[]
  >([]);

  useEffect(() => {
    loadVehicles();
  }, []);

  const loadVehicles = async () => {
    const result = await window.api.getVehicles({ page: 1, limit: 500 });
    if (result.success) setVehicles(result.data.data);
  };

  const startInspection = async () => {
    if (!vehicleId) {
      toast.error("Please select a vehicle");
      return;
    }
    const result = await window.api.createInspection(user!.id, vehicleId);
    if (result.success) {
      setInspectionId(result.data.id);
      // Initialize items with default values
      const defaults: Record<string, { status: string; notes: string }> = {};
      INSPECTION_POINTS.forEach((p) => {
        defaults[p.name] = { status: "good", notes: "" };
      });
      setItems(defaults);
      // Initialize damages
      const inspData = await window.api.getInspectionById(result.data.id);
      if (inspData.success && inspData.data?.damage_map) {
        setDamages(
          inspData.data.damage_map.map((d: any) => ({
            panel_id: d.panel_id,
            status: d.status,
            notes: d.notes || "",
          })),
        );
      }
      toast.success("Inspection started");
    } else {
      toast.error(result.error);
    }
  };

  const updateItem = (
    name: string,
    field: "status" | "notes",
    value: string,
  ) => {
    setItems((prev) => ({
      ...prev,
      [name]: { ...prev[name], [field]: value },
    }));
  };

  const updateDamage = (
    panelId: string,
    field: "status" | "notes",
    value: string,
  ) => {
    setDamages((prev) =>
      prev.map((d) => (d.panel_id === panelId ? { ...d, [field]: value } : d)),
    );
  };

  const saveAndComplete = async () => {
    if (!inspectionId) return;

    // Save all items
    for (const [name, data] of Object.entries(items)) {
      const point = INSPECTION_POINTS.find((p) => p.name === name);
      if (point) {
        await window.api.updateInspectionItem(user!.id, name, {
          status: data.status,
          notes: data.notes,
        });
      }
    }

    // Save all damages
    for (const d of damages) {
      await window.api.updateDamageMap(
        user!.id,
        inspectionId,
        d.panel_id,
        d.status,
      );
    }

    // Complete inspection
    const result = await window.api.completeInspection(user!.id, inspectionId);
    if (result.success) {
      toast.success(
        `Inspection completed! Score: ${result.data.overall_score}/10`,
      );
      navigate(`/inspections/${inspectionId}`);
    } else {
      toast.error(result.error);
    }
  };

  const categoryPoints = INSPECTION_POINTS.filter(
    (p) => p.category === activeCategory,
  );

  // Vehicle selection phase
  if (!inspectionId) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <FiArrowLeft />
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            New Inspection
          </h1>
        </div>
        <div className="card max-w-lg">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Select Vehicle to Inspect
          </h2>
          <select
            value={vehicleId}
            onChange={(e) => setVehicleId(e.target.value)}
            className="input-field mb-4"
          >
            <option value="">-- Select Vehicle --</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.year} {v.make} {v.model}{" "}
                {v.registration_number ? `(${v.registration_number})` : ""}
              </option>
            ))}
          </select>
          <button onClick={startInspection} className="btn-primary w-full">
            Start Inspection
          </button>
        </div>
      </div>
    );
  }

  // Inspection form phase
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Vehicle Inspection
          </h1>
        </div>
        <button
          onClick={saveAndComplete}
          className="btn-primary flex items-center gap-2"
        >
          <FiCheck /> Complete Inspection
        </button>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveCategory("damage_map")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeCategory === "damage_map" ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"}`}
        >
          Damage Map
        </button>
        {INSPECTION_CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setActiveCategory(cat.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeCategory === cat.value ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"}`}
          >
            {cat.label} (
            {INSPECTION_POINTS.filter((p) => p.category === cat.value).length})
          </button>
        ))}
      </div>

      {/* Damage Map Tab */}
      {activeCategory === "damage_map" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
              Click a panel to update its status
            </h3>
            <CarDamageMap
              damages={damages}
              onPanelClick={(panelId) => setActiveDamagePanel(panelId)}
            />
          </div>
          <div className="card">
            {activeDamagePanel ? (
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                  {PANEL_LABELS[activeDamagePanel] || activeDamagePanel}
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Status
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {DAMAGE_STATUSES.map((s) => {
                        const current = damages.find(
                          (d) => d.panel_id === activeDamagePanel,
                        )?.status;
                        return (
                          <button
                            key={s.value}
                            onClick={() =>
                              updateDamage(activeDamagePanel, "status", s.value)
                            }
                            className={`px-3 py-2 rounded-lg text-sm font-medium border-2 transition-colors ${current === s.value ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20" : "border-gray-200 dark:border-gray-600"}`}
                            style={{
                              borderLeftColor: s.color,
                              borderLeftWidth: "4px",
                            }}
                          >
                            {s.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Notes
                    </label>
                    <textarea
                      value={
                        damages.find((d) => d.panel_id === activeDamagePanel)
                          ?.notes || ""
                      }
                      onChange={(e) =>
                        updateDamage(activeDamagePanel, "notes", e.target.value)
                      }
                      className="input-field"
                      rows={3}
                      placeholder="Describe any damage..."
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <p>Click on a car panel to inspect it</p>
              </div>
            )}

            {/* Panel Status Summary */}
            <div className="mt-6 border-t dark:border-gray-700 pt-4">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                All Panels
              </h4>
              <div className="space-y-1">
                {damages.map((d) => (
                  <button
                    key={d.panel_id}
                    onClick={() => setActiveDamagePanel(d.panel_id)}
                    className={`w-full flex justify-between items-center px-3 py-1.5 rounded text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${activeDamagePanel === d.panel_id ? "bg-gray-100 dark:bg-gray-700" : ""}`}
                  >
                    <span>{PANEL_LABELS[d.panel_id] || d.panel_id}</span>
                    <span
                      className="capitalize text-xs px-2 py-0.5 rounded"
                      style={{
                        backgroundColor:
                          DAMAGE_STATUSES.find((s) => s.value === d.status)
                            ?.color + "33",
                        color: DAMAGE_STATUSES.find((s) => s.value === d.status)
                          ?.color,
                      }}
                    >
                      {d.status}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Inspection Points Tab */}
      {activeCategory !== "damage_map" && (
        <div className="space-y-3">
          {categoryPoints.map((point, idx) => (
            <div key={point.name} className="card">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded">
                      {idx + 1}
                    </span>
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {point.name}
                    </h4>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Deduction: Major -{point.deduction_major} | Minor -
                    {point.deduction_minor}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex gap-1">
                    {["good", "fair", "poor", "na"].map((status) => (
                      <button
                        key={status}
                        onClick={() => updateItem(point.name, "status", status)}
                        className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                          items[point.name]?.status === status
                            ? status === "good"
                              ? "bg-green-600 text-white"
                              : status === "fair"
                                ? "bg-yellow-500 text-white"
                                : status === "poor"
                                  ? "bg-red-600 text-white"
                                  : "bg-gray-600 text-white"
                            : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
                        }`}
                      >
                        {status === "na"
                          ? "N/A"
                          : status.charAt(0).toUpperCase() + status.slice(1)}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    placeholder="Notes..."
                    value={items[point.name]?.notes || ""}
                    onChange={(e) =>
                      updateItem(point.name, "notes", e.target.value)
                    }
                    className="input-field w-48 text-sm"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
