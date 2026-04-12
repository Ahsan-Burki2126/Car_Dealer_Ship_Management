import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "../store";
import { toast } from "react-toastify";
import { fmtDateTime } from "../utils/dateUtils";
import {
  FiDatabase,
  FiRefreshCw,
  FiUpload,
  FiRotateCcw,
  FiCloud,
  FiDownload,
  FiTrash2,
  FiLogOut,
} from "react-icons/fi";
import GoogleDriveSetupWizard from "../components/GoogleDriveSetupWizard";
import { useSuperadminAuth } from "../components/SuperadminPasswordModal";

interface BackupEntry {
  id: string;
  file_path: string;
  backup_type: "automatic" | "manual";
  created_at: string;
  exists: boolean;
}

interface GoogleDriveBackup {
  id: string;
  name: string;
  createdTime: string;
  size: string;
  mimeType: string;
}

interface BackupSettings {
  enableGoogleDriveBackup: boolean;
  autoUploadToGoogleDrive: boolean;
}

function fileNameFromPath(value: string): string {
  const segments = value.split(/[/\\]/);
  return segments[segments.length - 1] || value;
}

function formatBytes(bytes: string): string {
  const num = parseInt(bytes, 10);
  if (num === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(num) / Math.log(k));
  return Math.round((num / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

export default function BackupPage() {
  const { user } = useSelector((state: RootState) => state.auth);
  const { requestAuth, modal } = useSuperadminAuth();
  const [backups, setBackups] = useState<BackupEntry[]>([]);
  const [googleBackups, setGoogleBackups] = useState<GoogleDriveBackup[]>([]);
  const [backupFolder, setBackupFolder] = useState("");
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [isGdAuthenticated, setIsGdAuthenticated] = useState(false);
  const [settings, setSettings] = useState<BackupSettings>({
    enableGoogleDriveBackup: false,
    autoUploadToGoogleDrive: false,
  });
  const [showSetupWizard, setShowSetupWizard] = useState(false);

  useEffect(() => {
    loadData();
  }, [user?.id]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);

    const [listResult, folderResult, gdAuthResult, gdSettingsResult] =
      await Promise.all([
        window.api.listBackups(user.id),
        window.api.getBackupFolder(user.id),
        window.api.googleDriveIsAuthenticated(),
        window.api.googleDriveGetSettings(user.id),
      ]);

    if (listResult.success) {
      setBackups(listResult.data || []);
    }
    if (folderResult.success) {
      setBackupFolder(folderResult.data || "");
    }
    if (gdSettingsResult.success) {
      setSettings(
        gdSettingsResult.data || {
          enableGoogleDriveBackup: false,
          autoUploadToGoogleDrive: false,
        },
      );
    }

    const authenticated = gdAuthResult.success && gdAuthResult.data;
    setIsGdAuthenticated(authenticated);

    if (authenticated) {
      const gdResult = await window.api.googleDriveListBackups(user.id);
      if (gdResult.success) {
        setGoogleBackups(gdResult.data || []);
      } else if (gdResult.error?.includes("INVALID_GRANT")) {
        setIsGdAuthenticated(false);
        setGoogleBackups([]);
        toast.error("Google Drive session expired. Please reconnect.");
      }
    }

    setLoading(false);
  };

  const loadGoogleDriveBackups = async () => {
    if (!user || !isGdAuthenticated) return;
    setLoading(true);

    const result = await window.api.googleDriveListBackups(user.id);
    if (result.success) {
      setGoogleBackups(result.data || []);
    } else {
      if (result.error?.includes("INVALID_GRANT")) {
        setIsGdAuthenticated(false);
        setGoogleBackups([]);
        toast.error("Google Drive session expired. Please reconnect.");
      } else {
        toast.error(result.error || "Failed to load Google Drive backups");
      }
    }

    setLoading(false);
  };

  const handleCreateBackup = async () => {
    if (!user) return;
    setProcessing(true);
    const defaultName = `database_backup_${new Date().toISOString().split("T")[0]}.db`;
    const destination = await window.api.saveBackupAs(user.id, defaultName);
    if (!destination.success) {
      setProcessing(false);
      toast.error(destination.error || "Failed to open save dialog");
      return;
    }
    if (!destination.data) {
      setProcessing(false);
      return;
    }

    const result = await window.api.createBackup(user.id, destination.data);
    if (result.success) {
      toast.success("Backup created successfully");
      loadData();
    } else {
      toast.error(result.error);
    }
    setProcessing(false);
  };

  const handleDownloadFromGoogle = async (fileId: string, fileName: string) => {
    if (!user) return;

    setProcessing(true);
    const defaultName = fileName;
    const destination = await window.api.saveBackupAs(user.id, defaultName);
    if (!destination.success || !destination.data) {
      setProcessing(false);
      return;
    }

    const result = await window.api.googleDriveDownloadBackup(
      user.id,
      fileId,
      destination.data,
    );
    if (result.success) {
      toast.success("Backup downloaded successfully!");
    } else {
      toast.error(result.error || "Failed to download backup");
    }
    setProcessing(false);
  };

  const handleDeleteFromGoogle = async (fileId: string) => {
    if (!user) return;

    if (
      !confirm("Delete this backup from Google Drive? This cannot be undone.")
    ) {
      return;
    }

    setProcessing(true);
    const result = await window.api.googleDriveDeleteBackup(user.id, fileId);
    if (result.success) {
      toast.success("Backup deleted from Google Drive");
      loadGoogleDriveBackups();
    } else {
      toast.error(result.error || "Failed to delete backup");
    }
    setProcessing(false);
  };

  const handleRestore = async (filePath: string) => {
    if (!user) return;
    if (
      !confirm(
        "Restoring a backup will replace the current database. Continue?",
      )
    ) {
      return;
    }

    setProcessing(true);
    const result = await window.api.restoreBackup(user.id, filePath);
    if (result.success) {
      toast.success(
        "Backup restored. Please restart the application to refresh all screens.",
      );
      loadData();
    } else {
      toast.error(result.error);
    }
    setProcessing(false);
  };

  const handleRestoreFromFile = async () => {
    if (!user) return;
    const selected = await window.api.selectBackupFile(user.id);
    if (!selected.success || !selected.data) return;
    await handleRestore(selected.data);
  };

  const handleLogoutGoogle = async () => {
    const result = await window.api.googleDriveLogout();
    if (result.success) {
      setIsGdAuthenticated(false);
      setGoogleBackups([]);
      toast.success("Logged out from Google Drive");
      loadData();
    } else {
      toast.error(result.error || "Failed to logout");
    }
  };

  return (
    <>
      {showSetupWizard && user && (
        <GoogleDriveSetupWizard
          userId={user.id}
          onComplete={() => {
            setShowSetupWizard(false);
            loadData();
          }}
        />
      )}

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FiDatabase className="text-blue-600 dark:text-blue-400" size={24} />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Backup & Recovery
            </h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={loadData}
              className="btn-secondary flex items-center gap-2"
              disabled={loading || processing}
            >
              <FiRefreshCw /> Refresh
            </button>
            <button
              onClick={handleCreateBackup}
              className="btn-primary flex items-center gap-2"
              disabled={processing}
            >
              <FiUpload /> Backup Database
            </button>
          </div>
        </div>

        {/* Google Drive Status Banner */}
        {isGdAuthenticated ? (
          <div className="card bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-900/20 border border-blue-200 dark:border-blue-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-green-500 rounded-full p-2">
                  <FiCloud className="text-white" size={20} />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    ✅ Cloud Backup Active
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Your backups are automatically syncing to Google Drive daily
                  </p>
                </div>
              </div>
              <button
                onClick={handleLogoutGoogle}
                className="btn-secondary text-sm py-1 px-3 flex items-center gap-2"
              >
                <FiLogOut size={14} /> Disconnect
              </button>
            </div>
          </div>
        ) : (
          <div className="card bg-gradient-to-r from-amber-50 to-amber-100 dark:from-amber-900/30 dark:to-amber-900/20 border border-amber-200 dark:border-amber-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FiCloud
                  className="text-amber-600 dark:text-amber-400"
                  size={24}
                />
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    Add Cloud Backup for Extra Protection
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    One-click setup with Google Drive - your data stays in your
                    account
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSetupWizard(true)}
                className="btn-primary text-sm py-2 px-4 flex items-center gap-2 flex-shrink-0"
              >
                <FiCloud size={16} /> Enable Cloud Backup
              </button>
            </div>
          </div>
        )}

        {/* Local Backups Section */}
        <div className="card">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              📦 Local Backups
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Location:{" "}
              <span className="font-mono text-gray-800 dark:text-gray-100">
                {backupFolder || "Loading..."}
              </span>
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Automatic backups created daily.{" "}
              {isGdAuthenticated && "Cloud sync enabled."}
            </p>
          </div>

          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Available Backups
            </h3>
            {user?.role === "super_admin" && (
              <button
                onClick={handleRestoreFromFile}
                className="btn-secondary text-xs py-1 px-3 flex items-center gap-2"
                disabled={processing}
              >
                <FiRotateCcw size={12} /> Restore From File
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr>
                  <th className="table-header">File</th>
                  <th className="table-header">Type</th>
                  <th className="table-header">Created At</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="table-cell text-center py-4">
                      Loading...
                    </td>
                  </tr>
                ) : backups.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="table-cell text-center py-4 text-gray-500 dark:text-gray-400"
                    >
                      No backups found
                    </td>
                  </tr>
                ) : (
                  backups.map((backup) => (
                    <tr
                      key={backup.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    >
                      <td className="table-cell">
                        <p className="font-medium text-sm">
                          {fileNameFromPath(backup.file_path)}
                        </p>
                      </td>
                      <td className="table-cell capitalize text-sm">
                        {backup.backup_type}
                      </td>
                      <td className="table-cell text-sm">
                        {fmtDateTime(backup.created_at)}
                      </td>
                      <td className="table-cell">
                        <span
                          className={
                            backup.exists ? "badge-green" : "badge-red"
                          }
                        >
                          {backup.exists ? "Available" : "Missing"}
                        </span>
                      </td>
                      <td className="table-cell space-x-2">
                        {user?.role === "super_admin" && backup.exists && (
                          <button
                            onClick={() => handleRestore(backup.file_path)}
                            className="btn-secondary text-xs py-1 px-2"
                            disabled={processing}
                          >
                            Restore
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Google Drive Backups Section (only show if authenticated) */}
        {isGdAuthenticated && (
          <div className="card">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <FiCloud className="text-blue-600 dark:text-blue-400" /> Cloud Backups (Google
                Drive)
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                Secure backups stored in your Google account
              </p>
            </div>

            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {googleBackups.length} backup
                {googleBackups.length !== 1 ? "s" : ""} in Google Drive
              </span>
              <button
                onClick={() => {
                  loadGoogleDriveBackups();
                }}
                className="btn-secondary text-xs py-1 px-3 flex items-center gap-2"
                disabled={loading || processing}
              >
                <FiRefreshCw size={12} /> Refresh
              </button>
            </div>

            {googleBackups.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr>
                      <th className="table-header">File Name</th>
                      <th className="table-header">Size</th>
                      <th className="table-header">Created At</th>
                      <th className="table-header">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {googleBackups.map((backup) => (
                      <tr
                        key={backup.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                      >
                        <td className="table-cell text-sm">{backup.name}</td>
                        <td className="table-cell text-sm">
                          {formatBytes(backup.size)}
                        </td>
                        <td className="table-cell text-sm">
                          {fmtDateTime(backup.createdTime)}
                        </td>
                        <td className="table-cell space-x-2">
                          <button
                            onClick={() =>
                              handleDownloadFromGoogle(backup.id, backup.name)
                            }
                            className="btn-secondary text-xs py-1 px-2 inline-flex items-center gap-1"
                            disabled={processing}
                          >
                            <FiDownload size={12} /> Download
                          </button>
                          <button
                            onClick={() => requestAuth(() => handleDeleteFromGoogle(backup.id))}
                            className="btn-secondary text-xs py-1 px-2 inline-flex items-center gap-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                            disabled={processing}
                          >
                            <FiTrash2 size={12} /> Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                No backups in Google Drive yet. New backups will sync
                automatically.
              </div>
            )}
          </div>
        )}
      </div>
      {modal}
    </>
  );
}
