import React from "react";
import type { InspectionMarker } from "../../../shared/types";

const DAMAGE_TYPE_LABELS: Record<string, string> = {
  scratch: "Scratch",
  dent: "Dent",
  repaint: "Repaint",
  rust: "Rust",
  crack: "Crack",
  replacement: "Replacement",
};

interface Props {
  marker: InspectionMarker;
  x: number;
  y: number;
}

export default function InspectionTooltip({ marker, x, y }: Props) {
  return (
    <div
      className="absolute z-50 bg-gray-900 text-white px-3 py-2 rounded-lg shadow-lg text-xs pointer-events-none whitespace-nowrap"
      style={{
        left: `${x + 10}px`,
        top: `${y + 10}px`,
        transform: "translateX(0) translateY(0)",
      }}
    >
      <div className="font-semibold">{marker.panelId}</div>
      <div className="text-gray-300">
        {DAMAGE_TYPE_LABELS[marker.damageType] || marker.damageType}
      </div>
      <div className="text-blue-300">
        Severity: <span className="font-semibold">{marker.severity}</span>
      </div>
      {marker.notes && (
        <div className="text-gray-400 mt-1 max-w-xs">{marker.notes}</div>
      )}
    </div>
  );
}
