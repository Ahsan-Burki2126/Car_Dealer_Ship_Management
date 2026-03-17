import React, { useState, useEffect, useCallback } from "react";
import ReactDOM from "react-dom";
import { FiPrinter, FiX } from "react-icons/fi";
import type { Vehicle, VehicleInspection, InspectionMarker } from "../../../shared/types";
import { PANEL_REGIONS } from "./VehicleInspectionSVG";
import { APP_NAME } from "../../../shared/constants";

// ─── Config ───────────────────────────────────────────────────────────────────
const SVG_URL = "/assets/Ahsan's Car Blueprint Black & White.svg";
const SVG_W   = 4096;
const SVG_H   = 4096;

// Marker radii in SVG coordinate space (0-4096).
// Slightly larger than the interactive markers for print clarity.
const PR       = 90;   // outer circle radius
const PR_INNER = 36;   // inner white dot radius
const PFONT    = 72;   // label font-size

// ─── Severity metadata ────────────────────────────────────────────────────────
const SEVERITY_LABELS: Record<string, string> = {
  P:  "Polish / Touch-Up",
  A1: "Minor Scratch",  A2: "Medium Scratch",  A3: "Major Scratch",
  B1: "Minor Dent",     B2: "Medium Dent",     B3: "Major Dent",
  U1: "Minor Repaint",  U2: "Repair Mark",     U3: "Full Repaint",
};

const SEVERITY_COLORS: Record<string, string> = {
  P:  "#10b981",
  A1: "#fbbf24", A2: "#f97316", A3: "#ef4444",
  B1: "#fbbf24", B2: "#f97316", B3: "#ef4444",
  U1: "#f59e0b", U2: "#f97316", U3: "#ef4444",
};

const SEVERITY_DEDUCTIONS: Record<string, number> = {
  P:  0.3,
  A1: 0.5, A2: 1.0, A3: 1.5,
  B1: 0.5, B2: 1.0, B3: 1.5,
  U1: 0.5, U2: 1.0, U3: 1.5,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getSeverityLevel(sev: string): "Minor" | "Moderate" | "Major" {
  if (["P", "A1", "B1", "U1"].includes(sev)) return "Minor";
  if (["A2", "B2", "U2"].includes(sev))      return "Moderate";
  return "Major";
}

function getPanelLabel(id: string): string {
  return PANEL_REGIONS.find((p) => p.id === id)?.label ?? id;
}

function formatDate(iso?: string): string {
  const d = iso ? new Date(iso) : new Date();
  return d.toLocaleDateString("en-PK", {
    day: "2-digit", month: "long", year: "numeric",
  });
}

// ─── SVG marker (self-contained, no external component) ──────────────────────
function PrintMarker({ marker }: { marker: InspectionMarker }) {
  const color = SEVERITY_COLORS[marker.severity] ?? "#6b7280";
  return (
    <g>
      <circle cx={marker.x} cy={marker.y} r={PR}
        fill={color} fillOpacity={0.92} stroke="white" strokeWidth={10} />
      <circle cx={marker.x} cy={marker.y} r={PR_INNER}
        fill="white" fillOpacity={0.9} />
      <text x={marker.x} y={marker.y - PR - 18}
        textAnchor="middle" fontSize={PFONT} fontWeight="bold"
        fill={color} stroke="white" strokeWidth={12} paintOrder="stroke">
        {marker.severity}
      </text>
    </g>
  );
}

// ─── Report layout ────────────────────────────────────────────────────────────
// All styles are intentionally inline so they survive the JS-based
// print swap and don't depend on Tailwind or external CSS being loaded.

interface ReportContentProps {
  vehicle: Vehicle;
  inspection: VehicleInspection;
  svgInner: string | null;
  /** True when rendered inside the portal (slightly larger SVG for paper) */
  forPrint?: boolean;
}

function ReportContent({ vehicle, inspection, svgInner, forPrint = false }: ReportContentProps) {
  const totalDeduction = inspection.markers.reduce(
    (sum, m) => sum + (SEVERITY_DEDUCTIONS[m.severity] ?? 0), 0,
  );
  const scoreNum  = parseFloat(Math.max(0, 10 - totalDeduction).toFixed(1));
  const score     = scoreNum.toFixed(1);
  const scoreColor =
    scoreNum >= 8 ? "#16a34a" :
    scoreNum >= 6 ? "#2563eb" :
    scoreNum >= 4 ? "#d97706" : "#dc2626";
  const scoreLabel =
    scoreNum >= 8 ? "Excellent" :
    scoreNum >= 6 ? "Good"      :
    scoreNum >= 4 ? "Fair"      : "Poor";

  const majorCount    = inspection.markers.filter((m) => getSeverityLevel(m.severity) === "Major").length;
  const moderateCount = inspection.markers.filter((m) => getSeverityLevel(m.severity) === "Moderate").length;
  const minorCount    = inspection.markers.filter((m) => getSeverityLevel(m.severity) === "Minor").length;
  const uniquePanels  = new Set(inspection.markers.map((m) => m.panelId)).size;
  const reportDate    = formatDate(inspection.inspectionDate);

  const svgHeight = forPrint ? 430 : 280;

  // ─────────────────────────────────────────────────────────────────────────
  // All JSX below uses ONLY inline styles. No Tailwind classes.
  // ─────────────────────────────────────────────────────────────────────────

  const summaryCards = [
    { label: "Overall Score",   value: `${score} / 10`,          color: scoreColor },
    { label: "Condition",       value: scoreLabel,                color: scoreColor },
    { label: "Panels Affected", value: String(uniquePanels),      color: "#374151"  },
    { label: "Total Markers",   value: String(inspection.markers.length), color: "#374151" },
    { label: "Major Issues",    value: String(majorCount),        color: majorCount    > 0 ? "#dc2626" : "#16a34a" },
    { label: "Moderate Issues", value: String(moderateCount),     color: moderateCount > 0 ? "#d97706" : "#16a34a" },
    { label: "Minor Issues",    value: String(minorCount),        color: "#374151"  },
  ];

  return (
    <div style={{ fontFamily: "Arial, Helvetica, sans-serif", fontSize: 10, color: "#111", background: "#fff", lineHeight: 1.5 }}>

      {/* ── HEADER ─────────────────────────────────────────────── */}
      <div style={{ background: scoreColor, color: "#fff", padding: "14px 20px", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 9, opacity: 0.85, textTransform: "uppercase", letterSpacing: 2, marginBottom: 3 }}>{APP_NAME}</div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>VEHICLE INSPECTION REPORT</div>
          <div style={{ fontSize: 10, opacity: 0.85, marginTop: 3 }}>{reportDate}</div>
        </div>
        <div style={{ textAlign: "center", background: "rgba(255,255,255,0.2)", borderRadius: 8, padding: "8px 20px" }}>
          <div style={{ fontSize: 32, fontWeight: 800, lineHeight: 1 }}>{score}</div>
          <div style={{ fontSize: 10, opacity: 0.9 }}>/ 10</div>
          <div style={{ fontSize: 11, fontWeight: 700, marginTop: 2 }}>{scoreLabel.toUpperCase()}</div>
        </div>
      </div>

      {/* ── VEHICLE INFO + SUMMARY CARDS ───────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, paddingBottom: 16, borderBottom: "1px solid #e5e7eb", marginBottom: 16 }}>
        {/* Vehicle details */}
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2, color: "#6b7280", marginBottom: 8 }}>
            Vehicle Information
          </div>
          <table style={{ fontSize: 10, borderCollapse: "collapse", width: "100%" }}>
            <tbody>
              {[
                ["Make / Model",   `${vehicle.make} ${vehicle.model} (${vehicle.year})`],
                ["Registration #", vehicle.registration_number || "—"],
                ["Color",          vehicle.color          || "—"],
                ["Assembly",       vehicle.assembly_country || "—"],
                ["Chassis #",      vehicle.chassis_number || "—"],
                ["Engine #",       vehicle.engine_number  || "—"],
              ].map(([label, val]) => (
                <tr key={label}>
                  <td style={{ color: "#6b7280", paddingRight: 10, paddingBottom: 3, whiteSpace: "nowrap", verticalAlign: "top" }}>{label}:</td>
                  <td style={{ fontWeight: 600, paddingBottom: 3 }}>{val}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary cards */}
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2, color: "#6b7280", marginBottom: 8 }}>
            Inspection Summary
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            {summaryCards.map(({ label, value, color }) => (
              <div key={label} style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 6, padding: "6px 10px" }}>
                <div style={{ fontSize: 8, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.4 }}>{label}</div>
                <div style={{ fontSize: 15, fontWeight: 800, color, lineHeight: 1.2, marginTop: 2 }}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── DAMAGE DIAGRAM + LEGEND ─────────────────────────────── */}
      <div style={{ paddingBottom: 16, borderBottom: "1px solid #e5e7eb", marginBottom: 16 }}>
        <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2, color: "#6b7280", marginBottom: 12 }}>
          Visual Damage Diagram
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 190px", gap: 20, alignItems: "start" }}>

          {/* SVG diagram */}
          <div style={{ display: "flex", justifyContent: "center" }}>
            {svgInner ? (
              <svg
                viewBox={`0 0 ${SVG_W} ${SVG_H}`}
                style={{ height: svgHeight, width: "auto", display: "block", maxWidth: "100%" }}
              >
                <g dangerouslySetInnerHTML={{ __html: svgInner }} />
                {inspection.markers.map((m) => (
                  <PrintMarker key={m.id} marker={m} />
                ))}
              </svg>
            ) : (
              <div style={{ height: svgHeight, width: 200, background: "#f3f4f6", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af" }}>
                Loading…
              </div>
            )}
          </div>

          {/* Legend */}
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#6b7280", marginBottom: 8 }}>
              Legend
            </div>
            <div style={{ display: "grid", gap: 5 }}>
              {Object.entries(SEVERITY_LABELS).map(([code, label]) => (
                <div key={code} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: "50%",
                    background: SEVERITY_COLORS[code],
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 7, fontWeight: 800, color: "#fff", flexShrink: 0,
                    border: "1.5px solid rgba(0,0,0,0.1)",
                  }}>
                    {code}
                  </div>
                  <span style={{ fontSize: 9, color: "#374151" }}>{label}</span>
                </div>
              ))}
            </div>

            {/* Score key */}
            <div style={{ marginTop: 14, paddingTop: 10, borderTop: "1px solid #e5e7eb" }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Score Key</div>
              {[
                ["#16a34a", "8–10  Excellent"],
                ["#2563eb", "6–8   Good"],
                ["#d97706", "4–6   Fair"],
                ["#dc2626", "0–4   Poor"],
              ].map(([color, label]) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: color, flexShrink: 0 }} />
                  <span style={{ fontSize: 9, color: "#374151" }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── DAMAGE DETAILS TABLE ─────────────────────────────────── */}
      <div style={{ paddingBottom: 16, borderBottom: "1px solid #e5e7eb", marginBottom: 16 }}>
        <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2, color: "#6b7280", marginBottom: 10 }}>
          Damage Details
        </div>

        {inspection.markers.length === 0 ? (
          <div style={{ textAlign: "center", padding: "20px 0", color: "#16a34a" }}>
            <div style={{ fontSize: 20, marginBottom: 6 }}>✓</div>
            <div style={{ fontWeight: 700, fontSize: 13 }}>No damage recorded</div>
            <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>Vehicle is in excellent condition</div>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
            <thead>
              <tr>
                {["#", "Panel", "Condition", "Code & Description", "Severity", "Notes"].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "6px 8px", fontSize: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "#4b5563", borderBottom: "2px solid #d1d5db", background: "#f3f4f6" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {inspection.markers.map((m, i) => {
                const level     = getSeverityLevel(m.severity);
                const lvlColor  = level === "Major" ? "#dc2626" : level === "Moderate" ? "#d97706" : "#16a34a";
                const rowBg     = i % 2 === 0 ? "#fff" : "#f9fafb";
                const cellStyle = { padding: "5px 8px", borderBottom: "1px solid #e5e7eb", background: rowBg };
                return (
                  <tr key={m.id}>
                    <td style={{ ...cellStyle, color: "#9ca3af", width: 20 }}>{i + 1}</td>
                    <td style={{ ...cellStyle, fontWeight: 600 }}>{getPanelLabel(m.panelId)}</td>
                    <td style={{ ...cellStyle, textTransform: "capitalize" }}>{m.damageType}</td>
                    <td style={cellStyle}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                        <span style={{ width: 12, height: 12, borderRadius: "50%", background: SEVERITY_COLORS[m.severity], display: "inline-block", flexShrink: 0 }} />
                        <strong>{m.severity}</strong>
                        <span style={{ color: "#6b7280", fontSize: 9 }}>— {SEVERITY_LABELS[m.severity]}</span>
                      </span>
                    </td>
                    <td style={{ ...cellStyle, fontWeight: 700, color: lvlColor }}>{level}</td>
                    <td style={{ ...cellStyle, color: "#6b7280", fontSize: 9 }}>{m.notes || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── INSPECTOR + SIGNATURE ──────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2, color: "#6b7280", marginBottom: 8 }}>Inspector Details</div>
          <table style={{ fontSize: 10, borderCollapse: "collapse" }}>
            <tbody>
              <tr>
                <td style={{ color: "#6b7280", paddingRight: 12, paddingBottom: 5 }}>Inspector Name:</td>
                <td style={{ fontWeight: 600, paddingBottom: 5 }}>{inspection.inspectorName || "—"}</td>
              </tr>
              <tr>
                <td style={{ color: "#6b7280", paddingRight: 12 }}>Inspection Date:</td>
                <td style={{ fontWeight: 600 }}>{reportDate}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2, color: "#6b7280", marginBottom: 28 }}>Authorized Signature</div>
          <div style={{ borderBottom: "1px solid #374151", width: "80%", marginBottom: 5 }} />
          <div style={{ fontSize: 9, color: "#6b7280" }}>Inspector / Showroom Representative</div>
        </div>
      </div>

      {/* ── FOOTER ─────────────────────────────────────────────── */}
      <div style={{ paddingTop: 10, borderTop: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", fontSize: 8, color: "#9ca3af" }}>
        <span>{APP_NAME}</span>
        <span>Generated: {new Date().toLocaleString()}</span>
        <span>This report is computer generated</span>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
interface Props {
  vehicle: Vehicle;
  inspection: VehicleInspection;
  onClose: () => void;
}

export default function InspectionReportPrint({ vehicle, inspection, onClose }: Props) {
  const [svgInner, setSvgInner] = useState<string | null>(null);

  // Load the SVG blueprint once
  useEffect(() => {
    fetch(encodeURI(SVG_URL))
      .then((r) => r.text())
      .then((text) => {
        const match = text.match(/<svg[^>]*>([\s\S]*)<\/svg>/i);
        setSvgInner(match ? match[1] : text);
      })
      .catch(() => setSvgInner(""));
  }, []);

  // Off-screen portal: fixed far outside the viewport at A4 width so React
  // fully lays out the report content (SVG sizing, text wrapping, etc.)
  // before we read innerHTML for the iframe.  visibility:hidden keeps it
  // invisible without collapsing layout the way display:none would.
  const [portalEl] = useState(() => {
    const el = document.createElement("div");
    el.id = "inspection-print-portal";
    el.style.cssText =
      "position:fixed;top:-10000px;left:-10000px;" +
      "width:794px;visibility:hidden;background:#fff;padding:20px;";
    document.body.appendChild(el);
    return el;
  });

  useEffect(() => {
    return () => {
      if (document.body.contains(portalEl)) {
        document.body.removeChild(portalEl);
      }
    };
  }, [portalEl]);

  const handlePrint = useCallback(() => {
    // Capture the fully-rendered report DOM from the off-screen portal.
    // Using an iframe with srcdoc is the only reliable print path in Electron:
    // window.print() is async so DOM swaps / beforeprint tricks always race.
    const content = portalEl.innerHTML;
    if (!content) return;

    const htmlDoc =
      `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>` +
      `@page{size:A4 portrait;margin:10mm 14mm;}` +
      `html,body{font-family:Arial,Helvetica,sans-serif;font-size:10pt;` +
      `color:#111;background:#fff;margin:0;padding:14px;}` +
      `*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;` +
      `box-sizing:border-box;}` +
      `table{border-collapse:collapse;}svg{display:block;}tr{page-break-inside:avoid;}` +
      `</style></head><body>${content}</body></html>`;

    const iframe = document.createElement("iframe");
    iframe.setAttribute("title", "inspection-print-frame");
    // Fixed off-screen at A4 width (794 px ≈ 210 mm @ 96 dpi).
    // visibility:hidden keeps it invisible but fully laid out so the SVG
    // and text render at correct proportions before we call print().
    iframe.style.cssText =
      "position:fixed;top:-10000px;left:-10000px;" +
      "width:794px;height:1123px;border:none;visibility:hidden;";

    iframe.srcdoc = htmlDoc;
    document.body.appendChild(iframe);

    const cleanup = () => {
      if (document.body.contains(iframe)) document.body.removeChild(iframe);
    };

    iframe.addEventListener("load", () => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (err) {
        console.warn("Print failed:", err);
      }
      // Give the print dialog time to initialise before we remove the frame.
      setTimeout(cleanup, 3000);
    });
  }, [portalEl]);

  const reportProps: ReportContentProps = { vehicle, inspection, svgInner };

  return (
    <>
      {/* ── Screen: scrollable preview modal ───────────────────── */}
      <div
        style={{
          position: "fixed", inset: 0, zIndex: 9000,
          background: "rgba(0,0,0,0.7)",
          display: "flex", alignItems: "flex-start", justifyContent: "center",
          overflowY: "auto", padding: "24px 16px",
        }}
      >
        <div style={{
          background: "#fff", borderRadius: 12, boxShadow: "0 25px 50px rgba(0,0,0,0.4)",
          width: "100%", maxWidth: 900,
        }}>
          {/* Sticky action bar */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "14px 24px", borderBottom: "1px solid #e5e7eb",
            position: "sticky", top: 0, background: "#fff",
            borderRadius: "12px 12px 0 0", zIndex: 1,
          }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#111" }}>Inspection Report Preview</div>
              <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>
                Review the report · click Print to export as PDF or send to printer
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={handlePrint}
                disabled={!svgInner}
                style={{
                  display: "flex", alignItems: "center", gap: 7,
                  padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer",
                  background: svgInner ? "#2563eb" : "#93c5fd",
                  color: "#fff", fontWeight: 600, fontSize: 13,
                }}
              >
                <FiPrinter size={15} />
                {svgInner ? "Print / Save as PDF" : "Loading diagram…"}
              </button>
              <button
                onClick={onClose}
                style={{
                  display: "flex", alignItems: "center", gap: 7,
                  padding: "8px 16px", borderRadius: 8, border: "1px solid #d1d5db",
                  background: "#fff", cursor: "pointer", fontWeight: 600, fontSize: 13, color: "#374151",
                }}
              >
                <FiX size={15} /> Close
              </button>
            </div>
          </div>

          {/* Scrollable preview */}
          <div style={{ padding: "28px 32px", overflowY: "auto", maxHeight: "calc(100vh - 140px)" }}>
            <ReportContent {...reportProps} />
          </div>
        </div>
      </div>

      {/* ── Print portal (hidden on screen, shown via JS swap on print) ── */}
      {ReactDOM.createPortal(
        <ReportContent {...reportProps} forPrint />,
        portalEl,
      )}
    </>
  );
}
