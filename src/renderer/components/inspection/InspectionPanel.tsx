import React, { useState, useEffect } from "react";
import type { DamageType, DamageSeverity } from "../../../shared/types";
import { FiPlus, FiX } from "react-icons/fi";
import { PANEL_REGIONS } from "./VehicleInspectionSVG";

interface Props {
  initialPanelId?: string;
  onAddMarker: (
    panelId: string,
    damageType: DamageType,
    severity: DamageSeverity,
    notes?: string,
  ) => void;
  onCancel?: () => void;
}

// Severity code → damage type is fully deterministic — no separate dropdown needed
export const SEVERITY_TO_DAMAGE: Record<DamageSeverity, DamageType> = {
  P:  "repaint",
  A1: "scratch",
  A2: "scratch",
  A3: "scratch",
  B1: "dent",
  B2: "dent",
  B3: "dent",
  U1: "repaint",
  U2: "repaint",
  U3: "repaint",
};

const SEVERITIES: Array<{ value: DamageSeverity; label: string; group: string }> = [
  { value: "A1", label: "A1 — Minor Scratch",      group: "Scratches" },
  { value: "A2", label: "A2 — Medium Scratch",     group: "Scratches" },
  { value: "A3", label: "A3 — Major Scratch",      group: "Scratches" },
  { value: "B1", label: "B1 — Minor Dent",         group: "Dents" },
  { value: "B2", label: "B2 — Medium Dent",        group: "Dents" },
  { value: "B3", label: "B3 — Major Dent",         group: "Dents" },
  { value: "P",  label: "P  — Painted",            group: "Paint" },
  { value: "U1", label: "U1 — Minor Uneven Paint", group: "Paint" },
  { value: "U2", label: "U2 — Repair Mark",        group: "Paint" },
  { value: "U3", label: "U3 — Major Repaint",      group: "Paint" },
];

export default function InspectionPanel({
  initialPanelId,
  onAddMarker,
  onCancel,
}: Props) {
  const defaultPanel =
    PANEL_REGIONS.find((p) => p.id === initialPanelId)?.id ??
    PANEL_REGIONS[0].id;

  const [panelId,  setPanelId]  = useState<string>(defaultPanel);
  const [severity, setSeverity] = useState<DamageSeverity>("A1");
  const [notes,    setNotes]    = useState<string>("");

  useEffect(() => {
    if (initialPanelId) {
      const found = PANEL_REGIONS.find((p) => p.id === initialPanelId);
      setPanelId(found ? found.id : PANEL_REGIONS[0].id);
    }
  }, [initialPanelId]);

  const handleSubmit = () => {
    onAddMarker(
      panelId,
      SEVERITY_TO_DAMAGE[severity],
      severity,
      notes.trim() || undefined,
    );
    setSeverity("A1");
    setNotes("");
  };

  return (
    <div className="rounded-lg border border-blue-200 bg-white p-4 dark:border-blue-800 dark:bg-gray-800">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-semibold text-gray-900 dark:text-gray-100">
          Add Damage Marker
        </h4>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
            title="Cancel"
          >
            <FiX size={16} />
          </button>
        )}
      </div>

      <div className="space-y-3 text-sm">
        {/* Panel */}
        <div>
          <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">
            Panel
          </label>
          <select
            value={panelId}
            onChange={(e) => setPanelId(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-2 py-1.5 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            {PANEL_REGIONS.map((p) => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
            <option value="unknown">Other / Unknown</option>
          </select>
        </div>

        {/* Severity code — damage type is derived automatically */}
        <div>
          <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">
            Damage Code
          </label>
          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value as DamageSeverity)}
            className="w-full rounded-md border border-gray-300 px-2 py-1.5 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            {["Scratches", "Dents", "Paint"].map((group) => (
              <optgroup key={group} label={group}>
                {SEVERITIES.filter((s) => s.group === group).map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </optgroup>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
            Type: <span className="capitalize font-medium text-gray-600 dark:text-gray-300">{SEVERITY_TO_DAMAGE[severity]}</span>
          </p>
        </div>

        {/* Notes */}
        <div>
          <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">
            Notes <span className="font-normal text-gray-400">(optional)</span>
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Additional notes…"
            className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-xs dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-3 py-2 font-medium text-white transition-colors hover:bg-blue-700"
        >
          <FiPlus size={16} />
          Add Marker
        </button>
      </div>
    </div>
  );
}
