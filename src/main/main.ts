import {
  app,
  BrowserWindow,
  ipcMain,
  globalShortcut,
  protocol,
  net,
} from "electron";
import path from "path";
import http from "http";
import fs from "fs";
import { pathToFileURL } from "url";
import { initializeDatabase, closeDatabase } from "./database/init";
import { registerIpcHandlers } from "./ipc/handlers";
import {
  startAutomaticBackups,
  stopAutomaticBackups,
  startAutomaticGoogleDriveBackups,
  stopAutomaticGoogleDriveBackups,
} from "./services/backupService";

let mainWindow: BrowserWindow | null = null;

// bypassCSP: true lets images from this protocol load regardless of CSP,
// since custom schemes (e.g. "local-image:") are not valid CSP sources.
protocol.registerSchemesAsPrivileged([
  {
    scheme: "local-image",
    privileges: {
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      bypassCSP: true,
    },
  },
]);

function registerLocalImageProtocol(): void {
  protocol.handle("local-image", async (request) => {
    try {
      const reqUrl = new URL(request.url);
      const encodedPath = reqUrl.searchParams.get("path");
      if (!encodedPath) {
        return new Response("Missing path", { status: 400 });
      }

      // searchParams.get() already percent-decodes the value.
      const requestedPath = encodedPath;
      const resolvedPath = path.resolve(requestedPath);
      const imagesRoot = path.resolve(app.getPath("userData"), "images");

      // Normalize to forward-slashes + lowercase for case-insensitive Windows
      // comparison.  The trailing "/" guard prevents "images-evil/" matching
      // "images/".
      const norm = (p: string) =>
        path.normalize(p).toLowerCase().replace(/\\/g, "/");
      if (!norm(resolvedPath).startsWith(norm(imagesRoot) + "/")) {
        return new Response("Forbidden", { status: 403 });
      }

      if (!fs.existsSync(resolvedPath)) {
        return new Response("Not found", { status: 404 });
      }

      return net.fetch(pathToFileURL(resolvedPath).toString());
    } catch {
      return new Response("Invalid image request", { status: 400 });
    }
  });
}

function findVitePort(): Promise<number> {
  const candidates = [5173, 5174, 5175, 5176, 5177, 5178, 5179, 5180];
  return new Promise((resolve) => {
    let found = false;
    let pending = candidates.length;
    for (const port of candidates) {
      const req = http.get(`http://localhost:${port}`, (res) => {
        if (!found) {
          found = true;
          resolve(port);
        }
        res.resume();
      });
      req.on("error", () => {
        pending--;
        if (pending === 0 && !found) resolve(5173);
      });
      req.setTimeout(1000, () => {
        req.destroy();
        pending--;
        if (pending === 0 && !found) resolve(5173);
      });
    }
  });
}

async function createWindow(): Promise<void> {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    title: "Pak Japan Motors, Layyah",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
  });

  // Set CSP at the HTTP-response-header level.  The local-image: protocol uses
  // bypassCSP so it does not need to appear in the source list.  In dev mode
  // Vite injects inline scripts for HMR, so 'unsafe-inline' is required.
  const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;
  const scriptSrc = isDev
    ? "script-src 'self' 'unsafe-inline';"
    : "script-src 'self';";
  mainWindow.webContents.session.webRequest.onHeadersReceived(
    (details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          "Content-Security-Policy": [
            "default-src 'self'; " +
              scriptSrc + " " +
              "style-src 'self' 'unsafe-inline'; " +
              "img-src 'self' data: blob: file:; " +
              "object-src 'self'; " +
              "font-src 'self' data:; " +
              "connect-src 'self';",
          ],
        },
      });
    },
  );

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });

  // In development, load from Vite dev server
  if (process.env.NODE_ENV === "development" || !app.isPackaged) {
    const port = await findVitePort();
    mainWindow.loadURL(`http://localhost:${port}`);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  initializeDatabase();
  startAutomaticBackups();
  startAutomaticGoogleDriveBackups();
  registerIpcHandlers();
  registerLocalImageProtocol();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  stopAutomaticBackups();
  stopAutomaticGoogleDriveBackups();
  closeDatabase();
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  stopAutomaticBackups();
  stopAutomaticGoogleDriveBackups();
  closeDatabase();
});
