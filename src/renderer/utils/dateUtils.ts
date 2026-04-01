/**
 * Date formatting utilities that correctly handle SQLite UTC timestamps.
 *
 * SQLite's datetime('now') stores UTC without a timezone marker, e.g.
 * "2024-01-01 10:30:00". JavaScript's Date parser treats a space-separated
 * string without offset as LOCAL time, which is wrong — it's actually UTC.
 *
 * These helpers append 'Z' (UTC marker) before parsing so the value is
 * correctly interpreted as UTC and then displayed in Pakistan Standard Time
 * (PKT, UTC+5) via the browser's Intl engine.
 */

const PKT = "Asia/Karachi";

/** Parse a SQLite UTC datetime string as UTC (handles missing 'Z'). */
function parseSQLiteDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  // Already has timezone info — parse as-is
  if (value.includes("Z") || value.includes("+") || value.includes("-", 10)) {
    return new Date(value);
  }
  // No timezone — SQLite UTC; append 'Z' so JS treats it as UTC
  return new Date(value.replace(" ", "T") + "Z");
}

/** Format as date only: e.g. "01/01/2024" in PKT */
export function fmtDate(value: string | null | undefined): string {
  const d = parseSQLiteDate(value);
  if (!d || isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-PK", { timeZone: PKT });
}

/** Format as full date + time: e.g. "01/01/2024, 10:30:00 AM" in PKT */
export function fmtDateTime(value: string | null | undefined): string {
  const d = parseSQLiteDate(value);
  if (!d || isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-PK", { timeZone: PKT });
}

/** Format as time only: e.g. "10:30 AM" in PKT */
export function fmtTime(value: string | null | undefined): string {
  const d = parseSQLiteDate(value);
  if (!d || isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("en-PK", { timeZone: PKT, hour: "2-digit", minute: "2-digit" });
}

/** Format with custom Intl options (always PKT). */
export function fmtDateOpts(
  value: string | null | undefined,
  opts: Omit<Intl.DateTimeFormatOptions, "timeZone">,
): string {
  const d = parseSQLiteDate(value);
  if (!d || isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-PK", { ...opts, timeZone: PKT });
}
