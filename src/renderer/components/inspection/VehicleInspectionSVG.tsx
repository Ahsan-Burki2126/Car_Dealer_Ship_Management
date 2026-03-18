import React, { useState, useRef, useEffect, useCallback } from "react";
import type {
  VehicleInspection,
  InspectionMarker,
  DamageSeverity,
  DamageType,
} from "../../../shared/types";
import DamageMarker from "./DamageMarker";
import InspectionPanel from "./InspectionPanel";
import InspectionDetailsPanel from "./InspectionDetailsPanel";
import InspectionLegend from "./InspectionLegend";

// ─── Coordinate space ────────────────────────────────────────────────────────
const SVG_W = 4096;
const SVG_H = 4096;

// Named panel regions used for coordinate→panelId mapping (click & hover).
// Panel identification uses getPanelAt(svgX, svgY) directly — NOT DOM element
// tagging — so the correct panel is always reported regardless of SVG z-order.
// Doors are listed BEFORE roof so they win when regions overlap on the x-axis.
export const PANEL_REGIONS = [
  // ── Front end ──────────────────────────────────────────────────────────────
  { id: "front-bumper",        label: "Front Bumper",        x:  850, y:  210, w: 2400, h:  500 },
  { id: "front-left-fender",   label: "Front Left Fender",   x:  700, y:  650, w:  700, h: 1100 },
  { id: "front-right-fender",  label: "Front Right Fender",  x: 2700, y:  650, w:  700, h: 1100 },
  { id: "hood",                label: "Hood / Bonnet",       x: 1200, y:  650, w: 1700, h:  760 },
  { id: "windscreen-front",    label: "Front Windscreen",    x: 1200, y: 1380, w: 1700, h:  300 },
  // ── Doors — listed before roof so they win priority ────────────────────────
  { id: "front-left-door",     label: "Front Left Door",     x:  700, y: 1650, w: 1000, h:  700 },
  { id: "front-right-door",    label: "Front Right Door",    x: 2400, y: 1650, w:  950, h:  700 },
  { id: "rear-left-door",      label: "Rear Left Door",      x:  700, y: 2350, w: 1000, h:  650 },
  { id: "rear-right-door",     label: "Rear Right Door",     x: 2400, y: 2350, w:  950, h:  650 },
  // ── Rear quarter panels ────────────────────────────────────────────────────
  { id: "rear-left-fender",    label: "Rear Left Fender",    x:  700, y: 2950, w:  700, h:  550 },
  { id: "rear-right-fender",   label: "Rear Right Fender",   x: 2700, y: 2950, w:  700, h:  550 },
  // ── Centre cabin (roof) — checked after doors ──────────────────────────────
  { id: "roof",                label: "Roof",                x: 1400, y: 1650, w: 1300, h: 1750 },
  // ── Rear end ───────────────────────────────────────────────────────────────
  { id: "windscreen-rear",     label: "Rear Windscreen",     x: 1200, y: 3100, w: 1700, h:  280 },
  { id: "trunk",               label: "Trunk / Boot",        x:  900, y: 3380, w: 2300, h:  380 },
  { id: "rear-bumper",         label: "Rear Bumper",         x:  900, y: 3760, w: 2300, h:  230 },
];

function getPanelAt(x: number, y: number): string {
  for (const p of PANEL_REGIONS) {
    if (x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h) return p.id;
  }
  return "unknown";
}

function getPanelLabel(id: string): string {
  return PANEL_REGIONS.find((p) => p.id === id)?.label ?? id;
}

// ─── Fill colours ─────────────────────────────────────────────────────────────
const FILL_HOVER   = "rgba(59,130,246,0.35)";
const FILL_PENDING = "rgba(59,130,246,0.55)";
const FILL_MARKED  = "rgba(251,146,60,0.22)";

const SVG_URL = "/assets/Ahsan's Car Blueprint Black & White.svg";

// ─── Types ────────────────────────────────────────────────────────────────────
interface PendingClick { x: number; y: number; panelId: string }

interface Props {
  inspection?: VehicleInspection;
  onInspectionChange?: (inspection: VehicleInspection) => void;
  readonly?: boolean;
  inspectorName?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function VehicleInspectionSVG({
  inspection = { markers: [], completedPanels: [] },
  onInspectionChange,
  readonly = false,
  inspectorName = "Unknown",
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);

  // The raw inner HTML of the loaded SVG blueprint
  const [svgInner,  setSvgInner]  = useState<string | null>(null);
  const [svgError,  setSvgError]  = useState<string | null>(null);

  const [hoveredPanel,   setHoveredPanel]   = useState<string | null>(null);
  const [pendingClick,   setPendingClick]   = useState<PendingClick | null>(null);
  const [selectedMarker, setSelectedMarker] = useState<InspectionMarker | null>(null);
  const [tooltip, setTooltip] = useState<{
    marker: InspectionMarker; sx: number; sy: number;
  } | null>(null);

  // panelId → the actual SVG DOM elements that belong to it
  const panelEls = useRef<Map<string, SVGGraphicsElement[]>>(new Map());

  // ── 1. Load SVG blueprint ──────────────────────────────────────────────────
  useEffect(() => {
    fetch(encodeURI(SVG_URL))
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.text();
      })
      .then((text) => {
        const match = text.match(/<svg[^>]*>([\s\S]*)<\/svg>/i);
        setSvgInner(match ? match[1] : text);
        setSvgError(null);
      })
      .catch((err) => setSvgError("Could not load vehicle blueprint: " + err.message));
  }, []);

  // ── 2. After SVG renders: tag elements with data-panel via getBBox() ────────
  useEffect(() => {
    if (!svgRef.current || !svgInner) return;

    const svg = svgRef.current;
    const map = new Map<string, SVGGraphicsElement[]>();

    // Include ALL paths/polygons/circles (cls-1 and cls-2 too — right door
    // panels are cls-2 stroke-only outlines and must not be excluded).
    const candidates = Array.from(
      svg.querySelectorAll<SVGGraphicsElement>("path, polygon, circle"),
    );

    candidates.forEach((el) => {
      try {
        const bbox = el.getBBox();
        // Skip degenerate or tiny detail elements (small dots, thin lines).
        // Right door polygon bbox ≈ 241×485 = 116 k — well above threshold.
        if (bbox.width <= 0 || bbox.height <= 0) return;
        if (bbox.width * bbox.height < 5000) return;

        const cx = bbox.x + bbox.width  / 2;
        const cy = bbox.y + bbox.height / 2;
        const panelId = getPanelAt(cx, cy);
        if (panelId === "unknown") return;

        el.setAttribute("data-panel", panelId);
        // Make stroke-only (fill:none) elements respond to pointer events too.
        el.style.pointerEvents = "all";
        el.style.transition = "fill 0.12s ease, stroke 0.12s ease";
        if (!readonly) el.style.cursor = "pointer";

        if (!map.has(panelId)) map.set(panelId, []);
        map.get(panelId)!.push(el);
      } catch {
        // getBBox() throws for detached/hidden elements
      }
    });

    panelEls.current = map;
  }, [svgInner, readonly]);

  // ── 3. Sync fill colours whenever hover / markers / pending changes ─────────
  useEffect(() => {
    const markedPanels = new Set(inspection.markers.map((m) => m.panelId));

    panelEls.current.forEach((elements, panelId) => {
      const fill =
        panelId === pendingClick?.panelId ? FILL_PENDING :
        panelId === hoveredPanel          ? FILL_HOVER   :
        markedPanels.has(panelId)         ? FILL_MARKED  :
        "";

      elements.forEach((el) => { el.style.fill = fill; });
    });
  }, [hoveredPanel, pendingClick, inspection.markers]);

  // ── 4. Convert screen → SVG coordinate space ───────────────────────────────
  // Uses getScreenCTM() which correctly accounts for viewBox, preserveAspectRatio,
  // and any CSS transforms — unlike a naive getBoundingClientRect() linear mapping
  // which breaks when the SVG has letterboxing (square viewBox in a wide container).
  const toSVGCoords = useCallback((e: React.MouseEvent): { x: number; y: number } => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
    return { x: pt.x, y: pt.y };
  }, []);

  // ── 5. Event handlers ───────────────────────────────────────────────────────
  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (readonly) return;
    // Use coordinate-space hit-test so the correct panel is always reported
    // regardless of which SVG element the pointer is over (avoids DOM-tagging
    // mismatches where e.g. the car-body shape is on top of a door outline).
    const { x, y } = toSVGCoords(e);
    const panelId = getPanelAt(x, y);
    setHoveredPanel(panelId === "unknown" ? null : panelId);
  }, [readonly, toSVGCoords]);

  const handleMouseLeave = useCallback(() => {
    setHoveredPanel(null);
  }, []);

  const handleSVGClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (readonly) return;
    if ((e.target as Element).closest(".damage-marker")) return;

    const { x, y } = toSVGCoords(e);
    // Use coordinate-space hit-test for accurate panel identification.
    const panelId = getPanelAt(x, y);

    // Only allow placing markers on recognised panels
    if (panelId === "unknown") return;

    setPendingClick({ x, y, panelId });
    setSelectedMarker(null);
  }, [readonly, toSVGCoords]);

  // ── 6. Marker CRUD ──────────────────────────────────────────────────────────
  const handleAddMarker = (
    panelId: string,
    damageType: DamageType,
    severity: DamageSeverity,
    notes?: string,
  ) => {
    if (!pendingClick) return;
    const newMarker: InspectionMarker = {
      id: `marker_${Date.now()}`,
      panelId,
      x: Math.round(pendingClick.x),
      y: Math.round(pendingClick.y),
      damageType,
      severity,
      notes,
    };
    onInspectionChange?.({
      ...inspection,
      markers: [...inspection.markers, newMarker],
      inspectionDate: inspection.inspectionDate || new Date().toISOString(),
      inspectorName:  inspection.inspectorName  || inspectorName,
    });
    setPendingClick(null);
  };

  const handleRemoveMarker = (id: string) => {
    onInspectionChange?.({
      ...inspection,
      markers: inspection.markers.filter((m) => m.id !== id),
    });
    setSelectedMarker(null);
  };

  const handleUpdateMarker = (marker: InspectionMarker) => {
    onInspectionChange?.({
      ...inspection,
      markers: inspection.markers.map((m) => (m.id === marker.id ? marker : m)),
    });
    setSelectedMarker(marker);
  };

  // ── 7. Render ───────────────────────────────────────────────────────────────
  const markerCount = inspection.markers.length;

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            Vehicle Inspection Blueprint
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {readonly
              ? "Inspection marks recorded during vehicle creation"
              : "Click any highlighted panel to add a damage marker"}
          </p>
        </div>
        <div className="text-right text-xs text-gray-500 dark:text-gray-400 space-y-0.5">
          <div className="font-medium">
            {markerCount} marker{markerCount !== 1 ? "s" : ""}
          </div>
          {inspection.inspectionDate && (
            <div>{new Date(inspection.inspectionDate).toLocaleDateString()}</div>
          )}
          {inspection.inspectorName && (
            <div>By {inspection.inspectorName}</div>
          )}
        </div>
      </div>

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr),300px]">

        {/* ── SVG diagram ── */}
        <div className="inspection-diagram-card">
          {svgError ? (
            <div className="flex h-80 items-center justify-center rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/10 p-6">
              <div className="text-center space-y-1">
                <p className="font-semibold text-red-600 dark:text-red-400">
                  Blueprint could not be loaded
                </p>
                <p className="text-xs text-red-500 dark:text-red-300">
                  {svgError}
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  Expected at: <code className="font-mono">public/assets/Ahsan's Car Blueprint Black &amp; White.svg</code>
                </p>
              </div>
            </div>
          ) : svgInner ? (
            <div className="relative select-none">
              <svg
                ref={svgRef}
                viewBox={`0 0 ${SVG_W} ${SVG_H}`}
                className="inspection-svg w-full h-auto dark:invert dark:brightness-90"
                style={{ maxHeight: 580, cursor: readonly ? "default" : "crosshair" }}
                onClick={handleSVGClick}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
              >
                {/* Car blueprint */}
                <g dangerouslySetInnerHTML={{ __html: svgInner }} />

                {/* Pending placement ring */}
                {pendingClick && (
                  <g pointerEvents="none">
                    <circle
                      cx={pendingClick.x} cy={pendingClick.y} r={70}
                      fill="rgba(59,130,246,0.15)"
                      stroke="#3b82f6" strokeWidth={12}
                      strokeDasharray="25 10"
                    />
                    <circle
                      cx={pendingClick.x} cy={pendingClick.y} r={12}
                      fill="#3b82f6"
                    />
                  </g>
                )}

                {/* Damage markers */}
                {inspection.markers.map((marker) => (
                  <DamageMarker
                    key={marker.id}
                    marker={marker}
                    isSelected={selectedMarker?.id === marker.id}
                    onClick={() => { setSelectedMarker(marker); setPendingClick(null); }}
                    onHover={(sx, sy) => setTooltip({ marker, sx, sy })}
                    onHoverEnd={() => setTooltip(null)}
                    readonly={readonly}
                  />
                ))}
              </svg>

              {/* Panel name badge */}
              {hoveredPanel && !readonly && (
                <div className="pointer-events-none absolute bottom-3 left-3
                                rounded-md bg-blue-600 px-2.5 py-1 text-xs
                                font-medium text-white shadow-lg">
                  {getPanelLabel(hoveredPanel)} — click to add marker
                </div>
              )}

              {pendingClick && !readonly && (
                <div className="pointer-events-none absolute bottom-3 left-3
                                rounded-md bg-blue-700 px-2.5 py-1 text-xs
                                font-medium text-white shadow-lg">
                  Placing on: {getPanelLabel(pendingClick.panelId)} →
                  fill in details on the right
                </div>
              )}
            </div>
          ) : (
            <div className="flex h-80 items-center justify-center rounded-lg
                            bg-gray-50 dark:bg-gray-900/50">
              <div className="text-center space-y-2">
                <div className="h-8 w-8 mx-auto border-2 border-blue-500
                                border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Loading blueprint…
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ── Side panel ── */}
        <div className="space-y-3">
          <InspectionLegend />

          {selectedMarker ? (
            <InspectionDetailsPanel
              marker={selectedMarker}
              onUpdate={handleUpdateMarker}
              onRemove={handleRemoveMarker}
              onClose={() => setSelectedMarker(null)}
              readonly={readonly}
            />
          ) : pendingClick && !readonly ? (
            <InspectionPanel
              initialPanelId={pendingClick.panelId}
              onAddMarker={handleAddMarker}
              onCancel={() => setPendingClick(null)}
            />
          ) : (
            !readonly && (
              <div className="rounded-lg border-2 border-dashed border-gray-200
                              dark:border-gray-700 p-5 text-center">
                <div className="text-3xl mb-2">🚗</div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  Click a panel on the car
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Blue highlight = clickable area
                </p>
                {markerCount > 0 && (
                  <p className="text-xs text-orange-500 dark:text-orange-400 mt-2">
                    {markerCount} marker{markerCount !== 1 ? "s" : ""} recorded
                  </p>
                )}
              </div>
            )
          )}

          {/* Marker list (readonly view) */}
          {readonly && markerCount > 0 && (
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700/50 text-xs font-semibold
                              text-gray-600 dark:text-gray-300 uppercase tracking-wide">
                Recorded Damage ({markerCount})
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-64 overflow-y-auto">
                {inspection.markers.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSelectedMarker(m)}
                    className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50
                                dark:hover:bg-gray-700/40 transition-colors
                                ${selectedMarker?.id === m.id
                                  ? "bg-blue-50 dark:bg-blue-900/20"
                                  : ""}`}
                  >
                    <span className="font-bold text-gray-800 dark:text-gray-200">
                      {m.severity}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400 ml-1.5 capitalize">
                      {m.damageType}
                    </span>
                    <span className="block text-gray-400 dark:text-gray-500 mt-0.5">
                      {getPanelLabel(m.panelId)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Floating tooltip ── */}
      {tooltip && (
        <div
          className="fixed z-[9999] pointer-events-none"
          style={{ left: tooltip.sx + 14, top: tooltip.sy - 8 }}
        >
          <div className="min-w-[160px] rounded-xl border border-gray-700 bg-gray-900
                          px-3 py-2.5 text-xs text-white shadow-2xl">
            <div className="flex items-center gap-2 mb-1">
              <span
                className="inline-block w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: getSeverityColor(tooltip.marker.severity) }}
              />
              <span className="font-bold text-sm">{tooltip.marker.severity}</span>
              <span className="capitalize text-gray-300">{tooltip.marker.damageType}</span>
            </div>
            <div className="text-gray-400">{getPanelLabel(tooltip.marker.panelId)}</div>
            {tooltip.marker.notes && (
              <div className="mt-1 text-gray-300 italic border-t border-gray-700 pt-1">
                {tooltip.marker.notes}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function getSeverityColor(severity: string): string {
  const map: Record<string, string> = {
    P:  "#10b981",
    A1: "#fbbf24", A2: "#f97316", A3: "#ef4444",
    B1: "#fbbf24", B2: "#f97316", B3: "#ef4444",
    U1: "#f59e0b", U2: "#f97316", U3: "#ef4444",
  };
  return map[severity] ?? "#6b7280";
}
