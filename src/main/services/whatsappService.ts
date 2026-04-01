import { BrowserWindow } from "electron";
import path from "path";
import { app } from "electron";
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

export function getStatus(): WAStatus {
  return currentStatus;
}

function setStatus(s: WAStatus) {
  currentStatus = s;
  emit("whatsapp:status", { status: s });
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

export async function initializeWhatsApp(): Promise<{
  success: boolean;
  error?: string;
}> {
  if (client) {
    return { success: true };
  }

  const loaded = await loadLibrary();
  if (!loaded) {
    return {
      success: false,
      error:
        "whatsapp-web.js not installed. Run: npm install whatsapp-web.js",
    };
  }

  const authPath = path.join(app.getPath("userData"), "whatsapp-session");

  try {
    client = new WAClient({
      authStrategy: new LocalAuth({ dataPath: authPath }),
      puppeteer: {
        headless: true,
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
      setStatus("connected");
    });

    client.on("authenticated", () => {
      emit("whatsapp:authenticated", {});
    });

    client.on("auth_failure", () => {
      client = null;
      setStatus("auth_failure");
    });

    client.on("disconnected", () => {
      client = null;
      setStatus("disconnected");
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
  if (client) {
    try {
      await client.destroy();
    } catch {
      // ignore destroy errors
    }
    client = null;
  }
  setStatus("disconnected");
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
  // Strip all non-digit characters
  let digits = phone.replace(/\D/g, "");

  // Pakistani local number: 03XX-XXXXXXX → 923XX-XXXXXXX
  if (digits.startsWith("0") && digits.length === 11) {
    digits = "92" + digits.slice(1);
  } else if (!digits.startsWith("92")) {
    digits = "92" + digits;
  }

  return digits + "@c.us";
}
