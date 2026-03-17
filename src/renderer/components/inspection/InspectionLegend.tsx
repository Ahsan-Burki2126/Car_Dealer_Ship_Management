import React from "react";

const LEGEND_ITEMS = [
  {
    code: "P",
    label: "Painted",
    color: "#10b981",
  },
  {
    code: "A1",
    label: "Minor Scratch",
    color: "#fbbf24",
  },
  {
    code: "A2",
    label: "Medium Scratch",
    color: "#f97316",
  },
  {
    code: "A3",
    label: "Major Scratch",
    color: "#ef4444",
  },
  {
    code: "B1",
    label: "Minor Dent",
    color: "#fbbf24",
  },
  {
    code: "B2",
    label: "Medium Dent",
    color: "#f97316",
  },
  {
    code: "B3",
    label: "Major Dent",
    color: "#ef4444",
  },
  {
    code: "U1",
    label: "Minor Uneven Paint",
    color: "#f59e0b",
  },
  {
    code: "U2",
    label: "Repair Mark",
    color: "#f97316",
  },
  {
    code: "U3",
    label: "Major Repaint",
    color: "#ef4444",
  },
];

export default function InspectionLegend() {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
        Damage Key
      </h4>

      <div className="space-y-2 text-xs">
        {LEGEND_ITEMS.map((item) => (
          <div key={item.code} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full border-2 border-white flex-shrink-0"
              style={{ backgroundColor: item.color }}
            />
            <span className="font-semibold text-gray-700 dark:text-gray-300 min-w-12">
              {item.code}
            </span>
            <span className="text-gray-600 dark:text-gray-400">
              {item.label}
            </span>
          </div>
        ))}
      </div>

      {/* Quick Reference */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2 text-xs text-gray-600 dark:text-gray-400">
        <div>
          <strong>Scratches:</strong> A1, A2, A3
        </div>
        <div>
          <strong>Dents:</strong> B1, B2, B3
        </div>
        <div>
          <strong>Paint:</strong> P, U1, U2, U3
        </div>
      </div>
    </div>
  );
}
