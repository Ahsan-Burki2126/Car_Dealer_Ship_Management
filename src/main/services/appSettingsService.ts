import { app } from "electron";
import fs from "fs";
import path from "path";

function getSettingsPath(): string {
  return path.join(app.getPath("userData"), "app-settings.json");
}

function readSettings(): Record<string, any> {
  try {
    return JSON.parse(fs.readFileSync(getSettingsPath(), "utf-8"));
  } catch {
    return {};
  }
}

function writeSettings(data: Record<string, any>): void {
  fs.writeFileSync(getSettingsPath(), JSON.stringify(data, null, 2), "utf-8");
}

export function getLowStockThreshold(): number {
  return readSettings().lowStockThreshold ?? 5;
}

export function setLowStockThreshold(threshold: number): void {
  const settings = readSettings();
  settings.lowStockThreshold = Math.max(1, Math.round(threshold));
  writeSettings(settings);
}
