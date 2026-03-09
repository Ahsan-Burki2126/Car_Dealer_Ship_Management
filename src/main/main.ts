import { app, BrowserWindow, ipcMain, globalShortcut } from "electron";
import path from "path";
import http from "http";
import { initializeDatabase, closeDatabase } from "./database/init";
import { registerIpcHandlers } from "./ipc/handlers";

let mainWindow: BrowserWindow | null = null;

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
    title: "Dealership Management System",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
  });

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
  registerIpcHandlers();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  closeDatabase();
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  closeDatabase();
});
