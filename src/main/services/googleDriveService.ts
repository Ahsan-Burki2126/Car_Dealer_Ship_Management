import fs from "fs";
import path from "path";
import http from "http";
import { app, shell } from "electron";
import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";

/**
 * Google Drive Backup Service
 *
 * OAuth flow:  startAuthFlow() spins up a temporary local HTTP server on
 * port 3000 to capture the Google OAuth callback, opens the consent screen
 * in the user's default browser, exchanges the code for tokens, and tears
 * the server down.  No manual copy-paste of codes required.
 */

// ── OAuth credentials ────────────────────────────────────────────────────
// Replace the placeholders below with your own Google Cloud Console
// "Desktop app" OAuth 2.0 Client credentials before building for production.
const GOOGLE_CLIENT_ID =
  process.env.GOOGLE_CLIENT_ID ||
  "";
const GOOGLE_CLIENT_SECRET =
  process.env.GOOGLE_CLIENT_SECRET || "";
const REDIRECT_PORT = 3000;
const GOOGLE_REDIRECT_URL = `http://localhost:${REDIRECT_PORT}/auth/google/callback`;

let oauth2Client: OAuth2Client | null = null;
let callbackServer: http.Server | null = null;

// ── Types ────────────────────────────────────────────────────────────────

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

// ── Config persistence ───────────────────────────────────────────────────

function getConfigPath(): string {
  return path.join(app.getPath("userData"), "google-drive-config.json");
}

function saveAuthConfig(config: GoogleAuthConfig): void {
  fs.writeFileSync(getConfigPath(), JSON.stringify(config, null, 2));
}

function loadAuthConfig(): GoogleAuthConfig | null {
  try {
    const configPath = getConfigPath();
    if (!fs.existsSync(configPath)) return null;
    return JSON.parse(fs.readFileSync(configPath, "utf-8")) as GoogleAuthConfig;
  } catch {
    return null;
  }
}

// ── OAuth2 client ────────────────────────────────────────────────────────

function initializeOAuth2Client(): OAuth2Client {
  if (oauth2Client) return oauth2Client;

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

// ── Check credentials ────────────────────────────────────────────────────

export function areCredentialsConfigured(): boolean {
  return (
    !GOOGLE_CLIENT_ID.includes("YOUR_GOOGLE_CLIENT_ID_HERE") &&
    !GOOGLE_CLIENT_SECRET.includes("YOUR_GOOGLE_CLIENT_SECRET_HERE")
  );
}

// ── Auth flow with local callback server ─────────────────────────────────

/**
 * Starts the full OAuth flow:
 * 1. Spins up a temporary HTTP server on localhost:3000
 * 2. Opens the Google consent screen in the default browser
 * 3. Waits for the callback with the auth code
 * 4. Exchanges the code for tokens and saves them
 * 5. Shuts down the server
 *
 * Returns true on success, throws on failure.
 */
export function startAuthFlow(): Promise<boolean> {
  return new Promise((resolve, reject) => {
    if (!areCredentialsConfigured()) {
      reject(
        new Error(
          "Google Drive credentials are not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.",
        ),
      );
      return;
    }

    // Kill any existing callback server
    if (callbackServer) {
      try {
        callbackServer.close();
      } catch {
        /* ignore */
      }
      callbackServer = null;
    }

    const client = initializeOAuth2Client();
    const authUrl = client.generateAuthUrl({
      access_type: "offline",
      scope: ["https://www.googleapis.com/auth/drive.file"],
      prompt: "consent",
    });

    // 5-minute timeout
    const timeout = setTimeout(
      () => {
        cleanup();
        reject(new Error("Authentication timed out. Please try again."));
      },
      5 * 60 * 1000,
    );

    function cleanup() {
      clearTimeout(timeout);
      if (callbackServer) {
        try {
          callbackServer.close();
        } catch {
          /* ignore */
        }
        callbackServer = null;
      }
    }

    const successHtml = `
      <html><body style="font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f0fdf4">
        <div style="text-align:center;padding:40px;background:white;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,.08)">
          <div style="font-size:48px;margin-bottom:16px">&#10004;</div>
          <h1 style="color:#16a34a;margin:0 0 8px">Connected!</h1>
          <p style="color:#64748b;margin:0">Google Drive backup is ready. You can close this tab.</p>
        </div>
      </body></html>`;

    const errorHtml = (msg: string) => `
      <html><body style="font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#fef2f2">
        <div style="text-align:center;padding:40px;background:white;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,.08)">
          <div style="font-size:48px;margin-bottom:16px">&#10060;</div>
          <h1 style="color:#dc2626;margin:0 0 8px">Error</h1>
          <p style="color:#64748b;margin:0">${msg}</p>
        </div>
      </body></html>`;

    callbackServer = http.createServer(async (req, res) => {
      if (!req.url?.startsWith("/auth/google/callback")) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }

      const url = new URL(req.url, `http://localhost:${REDIRECT_PORT}`);
      const code = url.searchParams.get("code");
      const error = url.searchParams.get("error");

      if (error || !code) {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(errorHtml(error || "No authorization code received."));
        cleanup();
        reject(new Error(error || "No authorization code received."));
        return;
      }

      try {
        const { tokens } = await client.getToken(code);
        if (!tokens.access_token) throw new Error("No access token received");

        saveAuthConfig({
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token || "",
          expiryDate: tokens.expiry_date || 0,
        });
        client.setCredentials(tokens);

        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(successHtml);
        cleanup();
        resolve(true);
      } catch (err: any) {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(errorHtml("Failed to exchange authorization code."));
        cleanup();
        reject(new Error(err?.message || "Authentication failed."));
      }
    });

    callbackServer.listen(REDIRECT_PORT, () => {
      shell.openExternal(authUrl);
    });

    callbackServer.on("error", (err: any) => {
      cleanup();
      if (err.code === "EADDRINUSE") {
        reject(
          new Error(
            `Port ${REDIRECT_PORT} is in use. Close other apps using that port and try again.`,
          ),
        );
      } else {
        reject(new Error(`Could not start auth server: ${err.message}`));
      }
    });
  });
}

/**
 * Legacy: Generate authorization URL (kept for backward compat).
 */
export function getAuthorizationUrl(): string {
  const client = initializeOAuth2Client();
  return client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/drive.file"],
    prompt: "consent",
  });
}

/**
 * Legacy: Exchange code for tokens (kept for backward compat).
 */
export async function authenticateWithCode(code: string): Promise<boolean> {
  const client = initializeOAuth2Client();
  const { tokens } = await client.getToken(code);
  if (!tokens.access_token) throw new Error("No access token received");

  saveAuthConfig({
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token || "",
    expiryDate: tokens.expiry_date || 0,
  });
  client.setCredentials(tokens);
  return true;
}

/**
 * Check if user is authenticated.
 */
export function isAuthenticated(): boolean {
  const config = loadAuthConfig();
  return config !== null && config.accessToken !== "";
}

// ── Google Drive operations ──────────────────────────────────────────────

async function getOrCreateBackupFolder(): Promise<string> {
  const client = initializeOAuth2Client();
  const drive = google.drive({ version: "v3", auth: client as any });

  const response = await drive.files.list({
    q: "name='DealershipBackups' and mimeType='application/vnd.google-apps.folder' and trashed=false",
    spaces: "drive",
    fields: "files(id, name)",
    pageSize: 1,
  });

  if (response.data.files && response.data.files.length > 0) {
    return response.data.files[0].id!;
  }

  const folderResponse = await drive.files.create({
    requestBody: {
      name: "DealershipBackups",
      mimeType: "application/vnd.google-apps.folder",
    },
    fields: "id",
  });

  if (!folderResponse.data.id)
    throw new Error("Failed to create backup folder");
  return folderResponse.data.id;
}

export async function uploadBackupToGoogleDrive(
  filePath: string,
): Promise<string> {
  if (!isAuthenticated())
    throw new Error("Not authenticated with Google Drive");
  if (!fs.existsSync(filePath)) throw new Error("Backup file not found");

  const client = initializeOAuth2Client();
  const drive = google.drive({ version: "v3", auth: client as any });

  const folderId = await getOrCreateBackupFolder();
  const response = await drive.files.create({
    requestBody: {
      name: path.basename(filePath),
      parents: [folderId],
      description: `Dealership backup created at ${new Date().toISOString()}`,
    },
    media: {
      mimeType: "application/octet-stream",
      body: fs.createReadStream(filePath),
    },
    fields: "id, name, createdTime, size",
  });

  if (!response.data.id) throw new Error("Failed to upload backup");
  return response.data.id;
}

export async function listGoogleDriveBackups(): Promise<GoogleDriveBackup[]> {
  if (!isAuthenticated())
    throw new Error("Not authenticated with Google Drive");

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

  if (!response.data.files) return [];
  return response.data.files.map((file: any) => ({
    id: file.id!,
    name: file.name!,
    createdTime: file.createdTime!,
    size: file.size || "0",
    mimeType: file.mimeType!,
  }));
}

export async function downloadBackupFromGoogleDrive(
  fileId: string,
  destinationPath: string,
): Promise<void> {
  if (!isAuthenticated())
    throw new Error("Not authenticated with Google Drive");

  const client = initializeOAuth2Client();
  const drive = google.drive({ version: "v3", auth: client as any });

  const response = await drive.files.get(
    { fileId },
    { responseType: "stream" },
  );

  return new Promise((resolve, reject) => {
    const fileStream = fs.createWriteStream(destinationPath);
    (response.data as any).on("end", () => resolve());
    (response.data as any).on("error", (err: Error) => reject(err));
    (response.data as any).pipe(fileStream);
  });
}

export async function deleteBackupFromGoogleDrive(
  fileId: string,
): Promise<void> {
  if (!isAuthenticated())
    throw new Error("Not authenticated with Google Drive");

  const client = initializeOAuth2Client();
  const drive = google.drive({ version: "v3", auth: client as any });
  await drive.files.delete({ fileId });
}

export function logout(): void {
  const configPath = getConfigPath();
  if (fs.existsSync(configPath)) fs.unlinkSync(configPath);
  oauth2Client = null;
}

export async function getGoogleDriveFolderUrl(): Promise<string> {
  const folderId = await getOrCreateBackupFolder();
  return `https://drive.google.com/drive/folders/${folderId}`;
}

export async function uploadFile(
  filePath: string,
  fileName: string,
  mimeType: string,
): Promise<string> {
  if (!isAuthenticated()) throw new Error("Not authenticated with Google Drive");
  if (!fs.existsSync(filePath)) throw new Error("File not found");

  const client = initializeOAuth2Client();
  const drive = google.drive({ version: "v3", auth: client as any });

  const folderId = await getOrCreateBackupFolder();
  const response = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
    },
    media: {
      mimeType,
      body: fs.createReadStream(filePath),
    },
    fields: "id",
  });

  if (!response.data.id) throw new Error("Failed to upload file");
  return response.data.id;
}
