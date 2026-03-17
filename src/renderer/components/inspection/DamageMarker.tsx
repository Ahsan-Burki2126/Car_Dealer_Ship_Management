import React from "react";
import type { InspectionMarker } from "../../../shared/types";

interface Props {
  marker: InspectionMarker;
  isSelected: boolean;
  onClick: () => void;
  onHover?: (screenX: number, screenY: number) => void;
  onHoverEnd?: () => void;
  readonly?: boolean;
}

const SEVERITY_COLORS: Record<string, string> = {
  P:  "#10b981",
  A1: "#fbbf24",
  A2: "#f97316",
  A3: "#ef4444",
  B1: "#fbbf24",
  B2: "#f97316",
  B3: "#ef4444",
  U1: "#f59e0b",
  U2: "#f97316",
  U3: "#ef4444",
};

// All sizes are in SVG coordinate units (0 – 4096 space)
const R = 52;      // outer circle radius
const R_INNER = 22; // white inner dot radius
const FONT = 46;    // label font size

export default function DamageMarker({
  marker,
  isSelected,
  onClick,
  onHover,
  onHoverEnd,
  readonly = false,
}: Props) {
  const color = SEVERITY_COLORS[marker.severity] ?? "#6b7280";

  return (
    <g
      className="damage-marker"
      style={{ cursor: readonly ? "default" : "pointer" }}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onMouseEnter={(e) => onHover?.(e.clientX, e.clientY)}
      onMouseLeave={() => onHoverEnd?.()}
    >
      {/* Selection ring */}
      {isSelected && (
        <circle
          cx={marker.x}
          cy={marker.y}
          r={R + 20}
          fill="none"
          stroke="#1e40af"
          strokeWidth={10}
          strokeDasharray="20 8"
          opacity={0.8}
        />
      )}

      {/* Outer filled circle */}
      <circle
        cx={marker.x}
        cy={marker.y}
        r={R}
        fill={color}
        fillOpacity={isSelected ? 1 : 0.85}
        stroke="white"
        strokeWidth={6}
      />

      {/* Inner white dot */}
      <circle
        cx={marker.x}
        cy={marker.y}
        r={R_INNER}
        fill="white"
        fillOpacity={0.9}
        pointerEvents="none"
      />

      {/* Severity code label above the marker */}
      <text
        x={marker.x}
        y={marker.y - R - 14}
        textAnchor="middle"
        fontSize={FONT}
        fontWeight="bold"
        fill={color}
        stroke="white"
        strokeWidth={8}
        paintOrder="stroke"
        pointerEvents="none"
      >
        {marker.severity}
      </text>
    </g>
  );
}
