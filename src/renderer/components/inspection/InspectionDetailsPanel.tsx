import React, { useState, useEffect } from "react";
import type {
  InspectionMarker,
  DamageSeverity,
} from "../../../shared/types";
import { FiTrash2, FiSave, FiX } from "react-icons/fi";
import { PANEL_REGIONS } from "./VehicleInspectionSVG";
import { SEVERITY_TO_DAMAGE } from "./InspectionPanel";

interface Props {
  marker: InspectionMarker;
  onUpdate: (marker: InspectionMarker) => void;
  onRemove: (markerId: string) => void;
  onClose?: () => void;
  readonly?: boolean;
}

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

const SEVERITY_COLORS: Record<string, string> = {
  P:  "#10b981",
  A1: "#fbbf24", A2: "#f97316", A3: "#ef4444",
  B1: "#fbbf24", B2: "#f97316", B3: "#ef4444",
  U1: "#f59e0b", U2: "#f97316", U3: "#ef4444",
};

export default function InspectionDetailsPanel({
  marker,
  onUpdate,
  onRemove,
  onClose,
  readonly = false,
}: Props) {
  const [severity, setSeverity] = useState(marker.severity);
  const [notes,    setNotes]    = useState(marker.notes ?? "");
  const [isDirty,  setIsDirty]  = useState(false);

  useEffect(() => {
    setSeverity(marker.severity);
    setNotes(marker.notes ?? "");
    setIsDirty(false);
  }, [marker]);

  const mark = () => setIsDirty(true);

  const handleSave = () => {
    onUpdate({
      ...marker,
      severity,
      damageType: SEVERITY_TO_DAMAGE[severity],
      notes,
    });
    setIsDirty(false);
  };

  const panelLabel =
    PANEL_REGIONS.find((p) => p.id === marker.panelId)?.label ?? marker.panelId;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-semibold text-gray-900 dark:text-gray-100">
          Marker Details
        </h4>
        <div className="flex items-center gap-2">
          <span
            className="inline-block rounded-full px-2 py-0.5 text-xs font-bold text-white"
            style={{ backgroundColor: SEVERITY_COLORS[severity] ?? "#6b7280" }}
          >
            {severity}
          </span>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
              title="Close"
            >
              <FiX size={15} />
            </button>
          )}
        </div>
      </div>

      <div className="space-y-3 text-sm">
        {/* Panel */}
        <div>
          <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">
            Panel
          </label>
          <p className="px-2 py-1 text-gray-900 dark:text-white">{panelLabel}</p>
        </div>

        {/* Severity / damage code */}
        <div>
          <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">
            Damage Code
          </label>
          <select
            value={severity}
            onChange={(e) => { setSeverity(e.target.value as DamageSeverity); mark(); }}
            disabled={readonly}
            className="w-full rounded-md border border-gray-300 px-2 py-1.5 dark:border-gray-600 dark:bg-gray-700 dark:text-white disabled:cursor-not-allowed disabled:opacity-50"
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
            Type: <span className="capitalize font-medium text-gray-600 dark:text-gray-300">
              {SEVERITY_TO_DAMAGE[severity]}
            </span>
          </p>
        </div>

        {/* Notes */}
        <div>
          <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => { setNotes(e.target.value); mark(); }}
            disabled={readonly}
            rows={3}
            className="w-full resize-none rounded-md border border-gray-300 px-2 py-1.5 text-xs dark:border-gray-600 dark:bg-gray-700 dark:text-white disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        {/* Position (read-only info) */}
        <div className="rounded bg-gray-100 px-2 py-1.5 text-xs text-gray-500 dark:bg-gray-900 dark:text-gray-400">
          Position — X: {Math.round(marker.x)}, Y: {Math.round(marker.y)}
        </div>
      </div>

      {!readonly && (
        <div className="mt-4 flex gap-2">
          <button
            onClick={handleSave}
            disabled={!isDirty}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-blue-600 px-3 py-2 font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            <FiSave size={15} /> Save
          </button>
          <button
            onClick={() => onRemove(marker.id)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-red-600 px-3 py-2 font-medium text-white transition-colors hover:bg-red-700"
          >
            <FiTrash2 size={15} /> Delete
          </button>
        </div>
      )}
    </div>
  );
}
