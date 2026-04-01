import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "../store";
import {
  FiWifi,
  FiWifiOff,
  FiRefreshCw,
  FiSend,
  FiCheck,
  FiX,
  FiLoader,
} from "react-icons/fi";
import { toast } from "react-toastify";
import { fmtDate, fmtDateTime } from "../utils/dateUtils";

type WAStatus = "disconnected" | "connecting" | "qr" | "connected" | "auth_failure";

interface ReminderLog {
  id: string;
  customer_name: string;
  phone: string;
  invoice_number: string;
  due_date: string;
  amount: number;
  installment_number: number;
  sent_at: string;
  status: "sent" | "failed";
}

interface WASettings {
  remindersEnabled: boolean;
  reminderDaysBefore: number;
}

export default function WhatsAppPage() {
  const { user } = useSelector((state: RootState) => state.auth);

  const [status, setStatus] = useState<WAStatus>("disconnected");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [logs, setLogs] = useState<ReminderLog[]>([]);
  const [settings, setSettings] = useState<WASettings>({
    remindersEnabled: true,
    reminderDaysBefore: 3,
  });
  const [testPhone, setTestPhone] = useState("");
  const [sendingTest, setSendingTest] = useState(false);
  const [sendingNow, setSendingNow] = useState(false);
  const [connecting, setConnecting] = useState(false);

  // Load initial state
  useEffect(() => {
    loadStatus();
    loadLogs();
    loadSettings();
  }, []);

  // Subscribe to push events from main process
  useEffect(() => {
    const unsubStatus = window.api.onWhatsAppStatus((data) => {
      setStatus(data.status as WAStatus);
      if (data.status === "connected") {
        setQrDataUrl(null);
        setConnecting(false);
        toast.success("WhatsApp connected!");
        loadLogs();
      }
      if (data.status === "disconnected" || data.status === "auth_failure") {
        setConnecting(false);
        if (data.status === "auth_failure") {
          toast.error("WhatsApp authentication failed. Please scan QR again.");
        }
      }
    });

    const unsubQr = window.api.onWhatsAppQR((data) => {
      if (data.qr) setQrDataUrl(data.qr);
    });

    return () => {
      unsubStatus();
      unsubQr();
    };
  }, []);

  const loadStatus = async () => {
    const r = await window.api.whatsappGetStatus();
    if (r.success) setStatus(r.data as WAStatus);
  };

  const loadLogs = async () => {
    if (!user) return;
    const r = await window.api.whatsappGetLogs(user.id);
    if (r.success) setLogs(r.data || []);
  };

  const loadSettings = async () => {
    const r = await window.api.whatsappGetSettings();
    if (r.success) setSettings(r.data);
  };

  const handleConnect = async () => {
    setConnecting(true);
    setQrDataUrl(null);
    const r = await window.api.whatsappInitialize();
    if (!r.success) {
      setConnecting(false);
      toast.error(r.error || "Failed to start WhatsApp");
    }
    // Status will be updated via push events
  };

  const handleDisconnect = async () => {
    if (!user) return;
    await window.api.whatsappDisconnect(user.id);
    setQrDataUrl(null);
    setStatus("disconnected");
    toast.info("WhatsApp disconnected");
  };

  const handleSendTest = async () => {
    if (!user || !testPhone.trim()) return;
    setSendingTest(true);
    const r = await window.api.whatsappSendTest(user.id, testPhone.trim());
    setSendingTest(false);
    if (r.success) {
      toast.success("Test message sent!");
    } else {
      toast.error(r.error || "Failed to send test message");
    }
  };

  const handleSendNow = async () => {
    if (!user) return;
    setSendingNow(true);
    const r = await window.api.whatsappSendRemindersNow(user.id);
    setSendingNow(false);
    if (r.success) {
      const { sent, failed } = r.data;
      if (sent === 0 && failed === 0) {
        toast.info("No installments due in 3 days right now.");
      } else {
        toast.success(`Sent: ${sent}, Failed: ${failed}`);
      }
      loadLogs();
    } else {
      toast.error(r.error || "Failed to send reminders");
    }
  };

  const handleToggleReminders = async (enabled: boolean) => {
    if (!user) return;
    const updated = { ...settings, remindersEnabled: enabled };
    setSettings(updated);
    await window.api.whatsappUpdateSettings(user.id, { remindersEnabled: enabled });
  };

  const statusInfo: Record<
    WAStatus,
    { label: string; color: string; icon: React.ReactNode }
  > = {
    disconnected: {
      label: "Disconnected",
      color: "text-red-500",
      icon: <FiWifiOff />,
    },
    connecting: {
      label: "Connecting…",
      color: "text-yellow-500",
      icon: <FiLoader className="animate-spin" />,
    },
    qr: {
      label: "Scan QR Code",
      color: "text-blue-500",
      icon: <FiLoader className="animate-spin" />,
    },
    connected: {
      label: "Connected",
      color: "text-green-500",
      icon: <FiWifi />,
    },
    auth_failure: {
      label: "Auth Failed",
      color: "text-red-500",
      icon: <FiWifiOff />,
    },
  };

  const info = statusInfo[status];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          WhatsApp Reminders
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Automatically send installment reminders to customers 3 days before
          due date.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Connection Card */}
        <div className="card space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Connection Status
          </h2>

          <div className={`flex items-center gap-3 text-lg font-medium ${info.color}`}>
            {info.icon}
            <span>{info.label}</span>
          </div>

          {/* QR Code */}
          {status === "qr" && qrDataUrl && (
            <div className="flex flex-col items-center gap-3 py-2">
              <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                Open WhatsApp → 3 dots → Linked Devices → Link a Device → scan QR:
              </p>
              <img
                src={qrDataUrl}
                alt="WhatsApp QR Code"
                className="w-60 h-60 border-2 border-gray-200 dark:border-gray-600 rounded-xl"
              />
            </div>
          )}

          {(status === "connecting" || status === "qr") && !qrDataUrl && (
            <p className="text-sm text-yellow-600 dark:text-yellow-400 animate-pulse">
              Starting browser session, please wait…
            </p>
          )}

          <div className="flex gap-3">
            {status === "connected" ? (
              <button
                onClick={handleDisconnect}
                className="btn-danger flex items-center gap-2"
              >
                <FiWifiOff /> Disconnect
              </button>
            ) : status === "disconnected" || status === "auth_failure" ? (
              <button
                onClick={handleConnect}
                disabled={connecting}
                className="btn-primary flex items-center gap-2"
              >
                {connecting ? <FiLoader className="animate-spin" /> : <FiWifi />}
                Reconnect
              </button>
            ) : null}
          </div>

          <p className="text-xs text-gray-400 dark:text-gray-500">
            {status === "connecting" || status === "qr"
              ? "Connecting automatically — scan QR only on first-time setup."
              : "WhatsApp connects automatically on every app launch after the first scan."}
          </p>
        </div>

        {/* Settings Card */}
        <div className="card space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Reminder Settings
          </h2>

          <label className="flex items-center gap-3 cursor-pointer">
            <div className="relative">
              <input
                type="checkbox"
                className="sr-only"
                checked={settings.remindersEnabled}
                onChange={(e) => handleToggleReminders(e.target.checked)}
              />
              <div
                className={`w-12 h-6 rounded-full transition-colors ${
                  settings.remindersEnabled
                    ? "bg-green-500"
                    : "bg-gray-300 dark:bg-gray-600"
                }`}
              >
                <div
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    settings.remindersEnabled ? "translate-x-6" : "translate-x-0"
                  }`}
                />
              </div>
            </div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Automatic reminders{" "}
              {settings.remindersEnabled ? (
                <span className="text-green-600">enabled</span>
              ) : (
                <span className="text-red-500">disabled</span>
              )}
            </span>
          </label>

          <div className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
            <p>⏰ Reminders are sent daily at <strong>10:00 AM</strong></p>
            <p>📅 Message is sent <strong>3 days before</strong> the installment due date</p>
            <p>🔒 Each installment is reminded only once per day (no duplicates)</p>
          </div>

          <hr className="border-gray-200 dark:border-gray-700" />

          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Manual Run
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Immediately check and send messages for installments due in 3 days
            </p>
            <button
              onClick={handleSendNow}
              disabled={sendingNow || status !== "connected"}
              className="btn-secondary flex items-center gap-2 text-sm"
            >
              {sendingNow ? (
                <FiLoader className="animate-spin" />
              ) : (
                <FiRefreshCw />
              )}
              Send Reminders Now
            </button>
          </div>
        </div>
      </div>

      {/* Test Message */}
      {status === "connected" && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Send Test Message
          </h2>
          <div className="flex gap-3 max-w-md">
            <input
              type="tel"
              placeholder="03001234567"
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              className="input-field"
            />
            <button
              onClick={handleSendTest}
              disabled={sendingTest || !testPhone.trim()}
              className="btn-primary flex items-center gap-2 whitespace-nowrap"
            >
              {sendingTest ? <FiLoader className="animate-spin" /> : <FiSend />}
              Send
            </button>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
            Pakistani format: 03XX-XXXXXXX
          </p>
        </div>
      )}

      {/* Reminder Logs */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Sent Reminders Log
          </h2>
          <button
            onClick={loadLogs}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <FiRefreshCw size={14} /> Refresh
          </button>
        </div>

        {logs.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">
            No reminders have been sent yet
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr>
                  <th className="table-header">Customer</th>
                  <th className="table-header">Phone</th>
                  <th className="table-header">Invoice</th>
                  <th className="table-header text-right">Amount</th>
                  <th className="table-header">Due Date</th>
                  <th className="table-header">Sent At</th>
                  <th className="table-header">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
                    <td className="table-cell font-medium">
                      {log.customer_name || "—"}
                    </td>
                    <td className="table-cell font-mono text-sm">
                      {log.phone}
                    </td>
                    <td className="table-cell font-mono text-sm">
                      {log.invoice_number || "—"}
                    </td>
                    <td className="table-cell text-right">
                      {log.amount
                        ? `PKR ${Number(log.amount).toLocaleString()}`
                        : "—"}
                    </td>
                    <td className="table-cell">
                      {log.due_date
                        ? fmtDate(log.due_date)
                        : "—"}
                    </td>
                    <td className="table-cell text-sm">
                      {fmtDateTime(log.sent_at)}
                    </td>
                    <td className="table-cell">
                      {log.status === "sent" ? (
                        <span className="badge-success badge">
                          <FiCheck size={11} className="mr-1" /> Sent
                        </span>
                      ) : (
                        <span className="badge-danger badge">
                          <FiX size={11} className="mr-1" /> Failed
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
