import { BrowserWindow, app } from "electron";
import path from "path";
import fs from "fs";
import qrcode from "qrcode";

// Dynamically imported at runtime to allow graceful failure if package missing
let WAClient: any = null;
let LocalAuth: any = null;

function getMainWindow(): BrowserWindow | null {
  const wins = BrowserWindow.getAllWindows();
  return wins.length > 0 ? wins[0] : null;
}

function emit(channel: string, data: any) {
  getMainWindow()?.webContents.send(channel, data);
}

export type WAStatus =
  | "disconnected"
  | "connecting"
  | "qr"
  | "connected"
  | "auth_failure";

let client: any = null;
let currentStatus: WAStatus = "disconnected";
let manualDisconnect = false;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectAttempts = 0;
const RECONNECT_BASE_MS = 10_000;
const RECONNECT_MAX_MS = 5 * 60_000; // cap at 5 minutes

export function getStatus(): WAStatus {
  return currentStatus;
}

function setStatus(s: WAStatus) {
  currentStatus = s;
  emit("whatsapp:status", { status: s });
}

function scheduleReconnect() {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  const delay = Math.min(
    RECONNECT_BASE_MS * Math.pow(2, reconnectAttempts),
    RECONNECT_MAX_MS,
  );
  reconnectAttempts += 1;
  console.log(`[WhatsApp] Reconnecting in ${delay / 1000}s (attempt ${reconnectAttempts})`);
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    initializeWhatsApp().catch((e) =>
      console.error("[WhatsApp] Auto-reconnect failed:", e),
    );
  }, delay);
}

async function loadLibrary(): Promise<boolean> {
  if (WAClient) return true;
  try {
    const mod = require("whatsapp-web.js");
    WAClient = mod.Client;
    LocalAuth = mod.LocalAuth;
    return true;
  } catch {
    return false;
  }
}

/**
 * Finds a usable Chrome/Chromium executable.
 *
 * - Development: use Puppeteer's own bundled Chromium (works fine outside ASAR)
 * - Production (packaged): Puppeteer's Chromium is locked inside the ASAR
 *   archive and cannot be executed. Fall back to system Chrome or Edge.
 */
function findChrome(): string | undefined {
  if (!app.isPackaged) {
    // Dev mode — puppeteer ships its own Chrome, use it
    try {
      return require("puppeteer").executablePath();
    } catch {
      // fall through to system search
    }
  }

  // Production — search common Windows install paths
  const candidates = [
    process.env.CHROME_PATH,
    process.env.CHROMIUM_PATH,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Chromium\\Application\\chrome.exe",
  ].filter(Boolean) as string[];

  return candidates.find((p) => fs.existsSync(p));
}

export async function initializeWhatsApp(): Promise<{
  success: boolean;
  error?: string;
}> {
  manualDisconnect = false;
  if (client) return { success: true };

  const loaded = await loadLibrary();
  if (!loaded) {
    return {
      success: false,
      error: "whatsapp-web.js not installed. Run: npm install whatsapp-web.js",
    };
  }

  const authPath = path.join(app.getPath("userData"), "whatsapp-session");
  const executablePath = findChrome();

  if (!executablePath) {
    return {
      success: false,
      error:
        "No Chrome/Edge browser found. Please install Google Chrome or Microsoft Edge.",
    };
  }

  try {
    client = new WAClient({
      authStrategy: new LocalAuth({ dataPath: authPath }),
      puppeteer: {
        headless: true,
        executablePath,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-accelerated-2d-canvas",
          "--no-first-run",
          "--no-zygote",
          "--disable-gpu",
        ],
      },
    });

    setStatus("connecting");

    client.on("qr", async (qr: string) => {
      try {
        const dataUrl = await qrcode.toDataURL(qr, { width: 300 });
        emit("whatsapp:qr", { qr: dataUrl });
        setStatus("qr");
      } catch {
        emit("whatsapp:qr", { qr: null });
      }
    });

    client.on("ready", () => {
      reconnectAttempts = 0;
      setStatus("connected");
    });

    client.on("authenticated", () => {
      emit("whatsapp:authenticated", {});
    });

    client.on("auth_failure", () => {
      client = null;
      setStatus("auth_failure");
      // Auth failure = session expired; auto-reconnect will show QR again
      scheduleReconnect();
    });

    client.on("disconnected", () => {
      client = null;
      setStatus("disconnected");
      if (!manualDisconnect) {
        scheduleReconnect();
      }
    });

    // initialize() is non-blocking — Puppeteer starts in background
    client.initialize().catch((err: Error) => {
      console.error("[WhatsApp] initialize error:", err.message);
      client = null;
      setStatus("disconnected");
    });

    return { success: true };
  } catch (err) {
    client = null;
    setStatus("disconnected");
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: msg };
  }
}

export async function disconnectWhatsApp(): Promise<void> {
  manualDisconnect = true;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (client) {
    try {
      await client.destroy();
    } catch {
      // ignore destroy errors
    }
    client = null;
  }
  setStatus("disconnected");
  manualDisconnect = false;
}

export async function sendMessage(
  phone: string,
  message: string,
): Promise<{ success: boolean; error?: string }> {
  if (!client || currentStatus !== "connected") {
    return { success: false, error: "WhatsApp not connected" };
  }
  try {
    const waId = formatPhone(phone);
    await client.sendMessage(waId, message);
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Send failed";
    return { success: false, error: msg };
  }
}

function formatPhone(phone: string): string {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0") && digits.length === 11) {
    digits = "92" + digits.slice(1);
  } else if (!digits.startsWith("92")) {
    digits = "92" + digits;
  }
  return digits + "@c.us";
}