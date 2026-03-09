import React from "react";
import {
  CAR_PANELS,
  PANEL_LABELS,
  DAMAGE_STATUSES,
} from "../../../shared/constants";

interface DamageEntry {
  panel_id: string;
  status: string;
  notes: string;
}

interface Props {
  damages: DamageEntry[];
  onPanelClick?: (panelId: string) => void;
  readonly?: boolean;
}

const panelPaths: Record<string, { d: string; transform?: string }> = {
  front_bumper: {
    d: "M 120,20 L 280,20 Q 300,20 300,40 L 300,60 L 100,60 L 100,40 Q 100,20 120,20 Z",
  },
  hood: { d: "M 105,65 L 295,65 L 290,140 L 110,140 Z" },
  roof: { d: "M 115,145 L 285,145 L 285,280 L 115,280 Z" },
  trunk: { d: "M 110,285 L 290,285 L 295,360 L 105,360 Z" },
  rear_bumper: {
    d: "M 100,365 L 300,365 L 300,385 Q 300,405 280,405 L 120,405 Q 100,405 100,385 Z",
  },
  left_fender: { d: "M 50,65 L 100,65 L 100,140 L 60,140 Z" },
  right_fender: { d: "M 300,65 L 350,65 L 340,140 L 300,140 Z" },
  left_front_door: { d: "M 55,145 L 110,145 L 110,215 L 60,215 Z" },
  right_front_door: { d: "M 290,145 L 345,145 L 340,215 L 290,215 Z" },
  left_rear_door: { d: "M 60,220 L 110,220 L 110,280 L 65,280 Z" },
  right_rear_door: { d: "M 290,220 L 340,220 L 335,280 L 290,280 Z" },
  left_quarter: { d: "M 65,285 L 110,285 L 105,360 L 70,360 Z" },
  right_quarter: { d: "M 290,285 L 335,285 L 330,360 L 295,360 Z" },
};

const statusColors: Record<string, string> = {
  original: "#22c55e",
  repainted: "#eab308",
  damaged: "#ef4444",
  replaced: "#f97316",
  rusty: "#92400e",
};

export default function CarDamageMap({
  damages,
  onPanelClick,
  readonly = false,
}: Props) {
  const getColor = (panelId: string) => {
    const d = damages.find((x) => x.panel_id === panelId);
    return statusColors[d?.status || "original"] || "#22c55e";
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-center">
        <svg
          viewBox="0 0 400 430"
          className="w-full max-w-md"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Car body outline */}
          <rect
            x="90"
            y="10"
            width="220"
            height="410"
            rx="20"
            fill="none"
            stroke="#6b7280"
            strokeWidth="1"
            strokeDasharray="4,4"
          />

          {/* Panels */}
          {Object.entries(panelPaths).map(([panelId, { d }]) => (
            <g key={panelId}>
              <path
                d={d}
                fill={getColor(panelId)}
                fillOpacity={0.6}
                stroke="#374151"
                strokeWidth={1.5}
                className={
                  !readonly
                    ? "cursor-pointer hover:opacity-80 transition-opacity"
                    : ""
                }
                onClick={() => !readonly && onPanelClick?.(panelId)}
              />
              <title>
                {PANEL_LABELS[panelId] || panelId}:{" "}
                {damages.find((x) => x.panel_id === panelId)?.status ||
                  "original"}
              </title>
            </g>
          ))}

          {/* Labels for key areas */}
          <text
            x="200"
            y="45"
            textAnchor="middle"
            className="text-[9px] fill-gray-700 dark:fill-gray-300 font-medium select-none pointer-events-none"
          >
            Front Bumper
          </text>
          <text
            x="200"
            y="108"
            textAnchor="middle"
            className="text-[9px] fill-gray-700 dark:fill-gray-300 font-medium select-none pointer-events-none"
          >
            Hood
          </text>
          <text
            x="200"
            y="218"
            textAnchor="middle"
            className="text-[9px] fill-gray-700 dark:fill-gray-300 font-medium select-none pointer-events-none"
          >
            Roof
          </text>
          <text
            x="200"
            y="328"
            textAnchor="middle"
            className="text-[9px] fill-gray-700 dark:fill-gray-300 font-medium select-none pointer-events-none"
          >
            Trunk
          </text>
          <text
            x="200"
            y="390"
            textAnchor="middle"
            className="text-[9px] fill-gray-700 dark:fill-gray-300 font-medium select-none pointer-events-none"
          >
            Rear Bumper
          </text>
          <text
            x="75"
            y="108"
            textAnchor="middle"
            className="text-[7px] fill-gray-600 dark:fill-gray-400 select-none pointer-events-none"
          >
            L-Fender
          </text>
          <text
            x="325"
            y="108"
            textAnchor="middle"
            className="text-[7px] fill-gray-600 dark:fill-gray-400 select-none pointer-events-none"
          >
            R-Fender
          </text>
          <text
            x="75"
            y="185"
            textAnchor="middle"
            className="text-[7px] fill-gray-600 dark:fill-gray-400 select-none pointer-events-none"
          >
            L-Front
          </text>
          <text
            x="325"
            y="185"
            textAnchor="middle"
            className="text-[7px] fill-gray-600 dark:fill-gray-400 select-none pointer-events-none"
          >
            R-Front
          </text>
          <text
            x="75"
            y="255"
            textAnchor="middle"
            className="text-[7px] fill-gray-600 dark:fill-gray-400 select-none pointer-events-none"
          >
            L-Rear
          </text>
          <text
            x="325"
            y="255"
            textAnchor="middle"
            className="text-[7px] fill-gray-600 dark:fill-gray-400 select-none pointer-events-none"
          >
            R-Rear
          </text>
          <text
            x="80"
            y="328"
            textAnchor="middle"
            className="text-[7px] fill-gray-600 dark:fill-gray-400 select-none pointer-events-none"
          >
            L-Qtr
          </text>
          <text
            x="320"
            y="328"
            textAnchor="middle"
            className="text-[7px] fill-gray-600 dark:fill-gray-400 select-none pointer-events-none"
          >
            R-Qtr
          </text>

          {/* Direction indicator */}
          <text
            x="200"
            y="8"
            textAnchor="middle"
            className="text-[8px] fill-gray-500 font-bold select-none pointer-events-none"
          >
            FRONT
          </text>
          <text
            x="200"
            y="425"
            textAnchor="middle"
            className="text-[8px] fill-gray-500 font-bold select-none pointer-events-none"
          >
            REAR
          </text>
        </svg>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-4">
        {DAMAGE_STATUSES.map((s) => (
          <div key={s.value} className="flex items-center gap-2 text-sm">
            <div
              className="w-4 h-4 rounded"
              style={{ backgroundColor: s.color, opacity: 0.7 }}
            ></div>
            <span className="text-gray-600 dark:text-gray-400">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
