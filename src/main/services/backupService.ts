import fs from "fs";
import path from "path";
import { app } from "electron";
import { v4 as uuidv4 } from "uuid";
import {
  closeDatabase,
  getDatabase,
  getDatabasePath,
  initializeDatabase,
} from "../database/init";
import * as googleDriveService from "./googleDriveService";
import type { BackupRecord } from "../../shared/types";

const AUTO_BACKUP_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
let autoBackupTimer: NodeJS.Timeout | null = null;
let autoGoogleDriveBackupTimer: NodeJS.Timeout | null = null;

interface BackupSettings {
  enableGoogleDriveBackup: boolean;
  autoUploadToGoogleDrive: boolean;
}

function getBackupSettingsPath(): string {
  return path.join(app.getPath("userData"), "backup-settings.json");
}

function loadBackupSettings(): BackupSettings {
  try {
    const settingsPath = getBackupSettingsPath();
    if (fs.existsSync(settingsPath)) {
      const data = fs.readFileSync(settingsPath, "utf-8");
      return JSON.parse(data) as BackupSettings;
    }
  } catch (error) {
    console.error("Failed to load backup settings:", error);
  }
  return {
    enableGoogleDriveBackup: false,
    autoUploadToGoogleDrive: false,
  };
}

function saveBackupSettings(settings: BackupSettings): void {
  try {
    const settingsPath = getBackupSettingsPath();
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
  } catch (error) {
    console.error("Failed to save backup settings:", error);
  }
}

function getBackupsDirectory(): string {
  return path.join(app.getPath("userData"), "Backups");
}

function ensureBackupsDirectory(): string {
  const backupsDir = getBackupsDirectory();
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }
  return backupsDir;
}

function buildBackupFileName(): string {
  const now = new Date();
  const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}-${String(now.getMinutes()).padStart(2, "0")}-${String(now.getSeconds()).padStart(2, "0")}`;
  return `database_backup_${stamp}.db`;
}

function normalizeSqliteDate(raw: string): Date {
  return new Date(raw.replace(" ", "T") + "Z");
}

function insertBackupRecord(
  filePath: string,
  backupType: "automatic" | "manual",
  createdBy?: string,
): BackupRecord {
  const db = getDatabase();
  const id = uuidv4();
  db.prepare(
    `
      INSERT INTO backup_records (id, file_path, backup_type, created_by)
      VALUES (?, ?, ?, ?)
    `,
  ).run(id, filePath, backupType, createdBy || null);

  const row = db
    .prepare("SELECT * FROM backup_records WHERE id = ?")
    .get(id) as {
    id: string;
    file_path: string;
    backup_type: "automatic" | "manual";
    created_by: string | null;
    created_at: string;
  };

  return {
    id: row.id,
    file_path: row.file_path,
    backup_type: row.backup_type,
    created_by: row.created_by || undefined,
    created_at: row.created_at,
  };
}

function checkpointDatabase(): void {
  const db = getDatabase();
  db.pragma("wal_checkpoint(TRUNCATE)");
}

export async function createBackup(
  backupType: "automatic" | "manual",
  createdBy?: string,
  targetPath?: string,
): Promise<BackupRecord> {
  checkpointDatabase();
  const sourceDbPath = getDatabasePath();

  const destinationPath =
    targetPath || path.join(ensureBackupsDirectory(), buildBackupFileName());

  await fs.promises.copyFile(sourceDbPath, destinationPath);
  return insertBackupRecord(destinationPath, backupType, createdBy);
}

export function listBackups(): Array<BackupRecord & { exists: boolean }> {
  const db = getDatabase();
  const rows = db
    .prepare(
      `
      SELECT * FROM backup_records
      ORDER BY created_at DESC
    `,
    )
    .all() as Array<{
    id: string;
    file_path: string;
    backup_type: "automatic" | "manual";
    created_by: string | null;
    created_at: string;
  }>;

  return rows.map((row) => ({
    id: row.id,
    file_path: row.file_path,
    backup_type: row.backup_type,
    created_by: row.created_by || undefined,
    created_at: row.created_at,
    exists: fs.existsSync(row.file_path),
  }));
}

export function restoreBackup(filePath: string, userId: string): void {
  if (!fs.existsSync(filePath)) {
    throw new Error("Backup file not found");
  }

  const destinationDbPath = getDatabasePath();
  closeDatabase();

  if (fs.existsSync(destinationDbPath)) {
    fs.unlinkSync(destinationDbPath);
  }
  if (fs.existsSync(`${destinationDbPath}-wal`)) {
    fs.unlinkSync(`${destinationDbPath}-wal`);
  }
  if (fs.existsSync(`${destinationDbPath}-shm`)) {
    fs.unlinkSync(`${destinationDbPath}-shm`);
  }

  fs.copyFileSync(filePath, destinationDbPath);
  initializeDatabase();

  const db = getDatabase();
  const actor = db
    .prepare("SELECT username, role FROM users WHERE id = ?")
    .get(userId) as { username: string; role: string } | undefined;

  db.prepare(
    `
      INSERT INTO audit_logs (id, user_id, username, role, action_type, affected_entity, entity_id, new_value, timestamp)
      VALUES (?, ?, ?, ?, 'restore', 'database', ?, ?, datetime('now'))
    `,
  ).run(
    uuidv4(),
    userId,
    actor?.username || "",
    actor?.role || "",
    "database",
    JSON.stringify({ restored_from: filePath }),
  );
}

function shouldRunAutomaticBackup(): boolean {
  const db = getDatabase();
  const row = db
    .prepare(
      `
      SELECT created_at
      FROM backup_records
      WHERE backup_type = 'automatic'
      ORDER BY created_at DESC
      LIMIT 1
    `,
    )
    .get() as { created_at: string } | undefined;

  if (!row) {
    return true;
  }

  const lastBackupTime = normalizeSqliteDate(row.created_at).getTime();
  return Number.isNaN(lastBackupTime)
    ? true
    : Date.now() - lastBackupTime >= AUTO_BACKUP_INTERVAL_MS;
}

async function runAutomaticBackupIfDue(): Promise<void> {
  if (!shouldRunAutomaticBackup()) {
    return;
  }
  await createBackup("automatic");
}

export function startAutomaticBackups(): void {
  ensureBackupsDirectory();
  // Always create a backup on startup to ensure fresh recovery point
  createBackup("automatic").catch(() => {
    // Non-fatal
  });

  if (autoBackupTimer) {
    return;
  }

  autoBackupTimer = setInterval(() => {
    createBackup("automatic").catch(() => {
      // Non-fatal by design: failed auto backup should not crash app.
    });
  }, AUTO_BACKUP_INTERVAL_MS);
}

export function stopAutomaticBackups(): void {
  if (autoBackupTimer) {
    clearInterval(autoBackupTimer);
    autoBackupTimer = null;
  }
}

export function getBackupFolderPath(): string {
  return ensureBackupsDirectory();
}

// ============================================================
// GOOGLE DRIVE BACKUP FUNCTIONS
// ============================================================

export function getBackupSettings(): BackupSettings {
  return loadBackupSettings();
}

export function updateBackupSettings(settings: BackupSettings): void {
  saveBackupSettings(settings);
}

export async function uploadBackupToGoogleDrive(
  filePath: string,
  userId: string,
): Promise<string> {
  if (!googleDriveService.isAuthenticated()) {
    throw new Error("Not authenticated with Google Drive");
  }

  const fileId = await googleDriveService.uploadBackupToGoogleDrive(filePath);

  // Log the upload action
  try {
    const db = getDatabase();
    const actor = db
      .prepare("SELECT username, role FROM users WHERE id = ?")
      .get(userId) as { username: string; role: string } | undefined;

    db.prepare(
      `
        INSERT INTO audit_logs (id, user_id, username, role, action_type, affected_entity, entity_id, new_value, timestamp)
        VALUES (?, ?, ?, ?, 'upload_backup', 'google_drive', ?, ?, datetime('now'))
      `,
    ).run(
      uuidv4(),
      userId,
      actor?.username || "",
      actor?.role || "",
      "backup",
      JSON.stringify({ file_id: fileId, file_path: filePath }),
    );
  } catch (error) {
    console.error("Failed to log backup upload:", error);
  }

  return fileId;
}

export async function getGoogleDriveBackups(): Promise<any[]> {
  if (!googleDriveService.isAuthenticated()) {
    throw new Error("Not authenticated with Google Drive");
  }
  return googleDriveService.listGoogleDriveBackups();
}

export async function downloadGoogleDriveBackup(
  fileId: string,
  destinationPath: string,
): Promise<void> {
  if (!googleDriveService.isAuthenticated()) {
    throw new Error("Not authenticated with Google Drive");
  }
  return googleDriveService.downloadBackupFromGoogleDrive(
    fileId,
    destinationPath,
  );
}

export async function deleteGoogleDriveBackup(fileId: string): Promise<void> {
  if (!googleDriveService.isAuthenticated()) {
    throw new Error("Not authenticated with Google Drive");
  }
  return googleDriveService.deleteBackupFromGoogleDrive(fileId);
}

export async function getGoogleDriveFolderUrl(): Promise<string> {
  return googleDriveService.getGoogleDriveFolderUrl();
}

export function isGoogleDriveAuthenticated(): boolean {
  return googleDriveService.isAuthenticated();
}

export async function autoUploadToGoogleDrive(): Promise<void> {
  try {
    if (
      !googleDriveService.isAuthenticated() ||
      !loadBackupSettings().autoUploadToGoogleDrive
    ) {
      return;
    }

    const backups = listBackups();
    if (backups.length === 0) {
      return;
    }

    // Upload only the most recent local backup
    const mostRecentBackup = backups[0];
    if (mostRecentBackup.exists) {
      await uploadBackupToGoogleDrive(mostRecentBackup.file_path, "");
      console.log(
        `Auto-uploaded backup to Google Drive: ${mostRecentBackup.file_path}`,
      );
    }
  } catch (error) {
    console.error("Failed to auto-upload backup to Google Drive:", error);
    // Non-fatal: failed auto-upload should not crash app
  }
}

export function startAutomaticGoogleDriveBackups(): void {
  if (autoGoogleDriveBackupTimer) {
    return;
  }

  // Check immediately on startup
  autoUploadToGoogleDrive().catch(console.error);

  // Then check every 24 hours
  autoGoogleDriveBackupTimer = setInterval(() => {
    autoUploadToGoogleDrive().catch(console.error);
  }, AUTO_BACKUP_INTERVAL_MS);
}

export function stopAutomaticGoogleDriveBackups(): void {
  if (autoGoogleDriveBackupTimer) {
    clearInterval(autoGoogleDriveBackupTimer);
    autoGoogleDriveBackupTimer = null;
  }
}
