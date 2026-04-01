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

export function getWhatsAppSettings(): {
  remindersEnabled: boolean;
  reminderDaysBefore: number;
} {
  const s = readSettings();
  return {
    remindersEnabled: s.whatsappRemindersEnabled ?? true,
    reminderDaysBefore: s.whatsappReminderDaysBefore ?? 3,
  };
}

export function setWhatsAppSettings(data: {
  remindersEnabled?: boolean;
  reminderDaysBefore?: number;
}): void {
  const settings = readSettings();
  if (data.remindersEnabled !== undefined)
    settings.whatsappRemindersEnabled = data.remindersEnabled;
  if (data.reminderDaysBefore !== undefined)
    settings.whatsappReminderDaysBefore = Math.max(
      1,
      Math.round(data.reminderDaysBefore),
    );
  writeSettings(settings);
}
