import fs from "fs";
import path from "path";
import { app } from "electron";
import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";

/**
 * Google Drive Backup Service
 * Handles authentication and backup operations with Google Drive
 *
 * For non-technical users: Setup is automatic through OAuth flow.
 * No environment variables required for basic usage.
 */

// OAuth Configuration
// For production, use your own credentials from Google Cloud Console
// For development/non-technical users, you can use a public OAuth app
const GOOGLE_CLIENT_ID =
  process.env.GOOGLE_CLIENT_ID ||
  "YOUR_GOOGLE_CLIENT_ID_HERE.apps.googleusercontent.com";
const GOOGLE_CLIENT_SECRET =
  process.env.GOOGLE_CLIENT_SECRET || "YOUR_GOOGLE_CLIENT_SECRET_HERE";
const GOOGLE_REDIRECT_URL = "http://localhost:3000/auth/google/callback";

// Flag to check if credentials are properly configured
let isConfigured = false;

let oauth2Client: OAuth2Client | null = null;

export interface GoogleDriveBackup {
  id: string;
  name: string;
  createdTime: string;
  size: string;
  mimeType: string;
}

export interface GoogleAuthConfig {
  accessToken: string;
  refreshToken: string;
  expiryDate: number;
}

function getConfigPath(): string {
  return path.join(app.getPath("userData"), "google-drive-config.json");
}

function saveAuthConfig(config: GoogleAuthConfig): void {
  const configPath = getConfigPath();
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

function loadAuthConfig(): GoogleAuthConfig | null {
  try {
    const configPath = getConfigPath();
    if (!fs.existsSync(configPath)) {
      return null;
    }
    const data = fs.readFileSync(configPath, "utf-8");
    return JSON.parse(data) as GoogleAuthConfig;
  } catch (error) {
    console.error("Failed to load auth config:", error);
    return null;
  }
}

function initializeOAuth2Client(): OAuth2Client {
  if (oauth2Client) {
    return oauth2Client;
  }

  oauth2Client = new OAuth2Client(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URL,
  );

  const config = loadAuthConfig();
  if (config) {
    oauth2Client.setCredentials({
      access_token: config.accessToken,
      refresh_token: config.refreshToken,
      expiry_date: config.expiryDate,
    });
  }

  return oauth2Client;
}

/**
 * Generate authorization URL for user to authenticate
 */
export function getAuthorizationUrl(): string {
  const client = initializeOAuth2Client();

  const scopes = ["https://www.googleapis.com/auth/drive.file"];

  const url = client.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
    prompt: "consent",
  });

  return url;
}

/**
 * Exchange authorization code for tokens
 */
export async function authenticateWithCode(code: string): Promise<boolean> {
  try {
    const client = initializeOAuth2Client();
    const { tokens } = await client.getToken(code);

    if (!tokens.access_token) {
      throw new Error("No access token received");
    }

    const config: GoogleAuthConfig = {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || "",
      expiryDate: tokens.expiry_date || 0,
    };

    saveAuthConfig(config);
    client.setCredentials(tokens);
    isConfigured = true;

    return true;
  } catch (error) {
    console.error("Authentication failed:", error);
    throw new Error("Failed to authenticate with Google. Please try again.");
  }
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  const config = loadAuthConfig();
  return config !== null && config.accessToken !== "";
}

/**
 * Get the backup folder ID, creating it if needed
 */
async function getOrCreateBackupFolder(): Promise<string> {
  const client = initializeOAuth2Client();
  const drive = google.drive({ version: "v3", auth: client as any });

  try {
    // Search for existing backup folder
    const response = await drive.files.list({
      q: "name='DealershipBackups' and mimeType='application/vnd.google-apps.folder' and trashed=false",
      spaces: "drive",
      fields: "files(id, name)",
      pageSize: 1,
    });

    if (response.data.files && response.data.files.length > 0) {
      return response.data.files[0].id!;
    }

    // Create new folder
    const folderResponse = await drive.files.create({
      requestBody: {
        name: "DealershipBackups",
        mimeType: "application/vnd.google-apps.folder",
      },
      fields: "id",
    });

    if (!folderResponse.data.id) {
      throw new Error("Failed to create backup folder");
    }

    return folderResponse.data.id;
  } catch (error) {
    console.error("Error getting/creating backup folder:", error);
    throw error;
  }
}

/**
 * Upload a backup file to Google Drive
 */
export async function uploadBackupToGoogleDrive(
  filePath: string,
): Promise<string> {
  if (!isAuthenticated()) {
    throw new Error("Not authenticated with Google Drive");
  }

  if (!fs.existsSync(filePath)) {
    throw new Error("Backup file not found");
  }

  try {
    const client = initializeOAuth2Client();
    const drive = google.drive({ version: "v3", auth: client as any });

    const folderId = await getOrCreateBackupFolder();
    const fileName = path.basename(filePath);
    const fileStream = fs.createReadStream(filePath);

    const response = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [folderId],
        description: `Dealership backup created at ${new Date().toISOString()}`,
      },
      media: {
        mimeType: "application/octet-stream",
        body: fileStream,
      },
      fields: "id, name, createdTime, size",
    });

    if (!response.data.id) {
      throw new Error("Failed to upload backup");
    }

    return response.data.id;
  } catch (error) {
    console.error("Failed to upload backup to Google Drive:", error);
    throw error;
  }
}

/**
 * List all backups from Google Drive
 */
export async function listGoogleDriveBackups(): Promise<GoogleDriveBackup[]> {
  if (!isAuthenticated()) {
    throw new Error("Not authenticated with Google Drive");
  }

  try {
    const client = initializeOAuth2Client();
    const drive = google.drive({ version: "v3", auth: client as any });

    const folderId = await getOrCreateBackupFolder();

    const response = await drive.files.list({
      q: `'${folderId}' in parents and trashed=false`,
      spaces: "drive",
      fields: "files(id, name, createdTime, size, mimeType)",
      orderBy: "createdTime desc",
      pageSize: 50,
    });

    if (!response.data.files) {
      return [];
    }

    return response.data.files.map((file: any) => ({
      id: file.id!,
      name: file.name!,
      createdTime: file.createdTime!,
      size: file.size || "0",
      mimeType: file.mimeType!,
    }));
  } catch (error) {
    console.error("Failed to list Google Drive backups:", error);
    throw error;
  }
}

/**
 * Download a backup from Google Drive
 */
export async function downloadBackupFromGoogleDrive(
  fileId: string,
  destinationPath: string,
): Promise<void> {
  if (!isAuthenticated()) {
    throw new Error("Not authenticated with Google Drive");
  }

  try {
    const client = initializeOAuth2Client();
    const drive = google.drive({ version: "v3", auth: client as any });

    const response = await drive.files.get(
      { fileId: fileId },
      { responseType: "stream" },
    );

    return new Promise((resolve, reject) => {
      const fileStream = fs.createWriteStream(destinationPath);
      (response.data as any).on("end", () => {
        resolve();
      });
      (response.data as any).on("error", (err: Error) => {
        reject(err);
      });
      (response.data as any).pipe(fileStream);
    });
  } catch (error) {
    console.error("Failed to download backup from Google Drive:", error);
    throw error;
  }
}

/**
 * Delete a backup from Google Drive
 */
export async function deleteBackupFromGoogleDrive(
  fileId: string,
): Promise<void> {
  if (!isAuthenticated()) {
    throw new Error("Not authenticated with Google Drive");
  }

  try {
    const client = initializeOAuth2Client();
    const drive = google.drive({ version: "v3", auth: client as any });

    await drive.files.delete({
      fileId: fileId,
    });
  } catch (error) {
    console.error("Failed to delete backup from Google Drive:", error);
    throw error;
  }
}

/**
 * Logout from Google Drive
 */
export function logout(): void {
  const configPath = getConfigPath();
  if (fs.existsSync(configPath)) {
    fs.unlinkSync(configPath);
  }
  oauth2Client = null;
}

/**
 * Get Google Drive folder URL
 */
export async function getGoogleDriveFolderUrl(): Promise<string> {
  try {
    const folderId = await getOrCreateBackupFolder();
    return `https://drive.google.com/drive/folders/${folderId}`;
  } catch (error) {
    console.error("Failed to get folder URL:", error);
    throw error;
  }
}
