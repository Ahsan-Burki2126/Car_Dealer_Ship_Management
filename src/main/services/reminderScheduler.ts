import { getDatabase } from "../database/init";
import { sendMessage, getStatus } from "./whatsappService";
import { v4 as uuidv4 } from "uuid";

let cronTask: any = null;
let cron: any = null;

function loadCron(): boolean {
  if (cron) return true;
  try {
    cron = require("node-cron");
    return true;
  } catch {
    return false;
  }
}

export function startReminderScheduler(): void {
  if (!loadCron()) {
    console.warn("[Reminder] node-cron not available, scheduler disabled");
    return;
  }

  // Run every day at 10:00 AM
  cronTask = cron.schedule("0 10 * * *", () => {
    sendInstallmentReminders().catch((e) =>
      console.error("[Reminder] Scheduler run failed:", e),
    );
  });

  // Run once on startup to catch any missed reminders (e.g. app was off at 10 AM)
  sendInstallmentReminders().catch((e) =>
    console.error("[Reminder] Startup run failed:", e),
  );

  console.log("[Reminder] Installment reminder scheduler started");
}

export function stopReminderScheduler(): void {
  if (cronTask) {
    cronTask.stop();
    cronTask = null;
  }
}

export async function sendInstallmentReminders(): Promise<{
  sent: number;
  skipped: number;
  failed: number;
}> {
  if (getStatus() !== "connected") {
    return { sent: 0, skipped: 0, failed: 0 };
  }

  const db = getDatabase();

  const dueInstallments = db
    .prepare(
      `
    SELECT
      i.id AS installment_id,
      i.due_date,
      i.amount,
      i.installment_number,
      s.invoice_number,
      c.name AS customer_name,
      c.phone AS customer_phone,
      v.make,
      v.model,
      v.year
    FROM installments i
    JOIN sales s ON i.sale_id = s.id
    JOIN customers c ON s.customer_id = c.id
    JOIN vehicles v ON s.vehicle_id = v.id
    WHERE i.status = 'pending'
      AND date(i.due_date) = date('now', '+3 days')
      AND c.phone IS NOT NULL
      AND c.phone != ''
      AND i.id NOT IN (
        SELECT installment_id
        FROM whatsapp_reminders
        WHERE date(sent_at) = date('now')
          AND status = 'sent'
      )
  `,
    )
    .all() as any[];

  let sent = 0;
  let failed = 0;

  for (const row of dueInstallments) {
    const message = buildMessage(row);
    const result = await sendMessage(row.customer_phone, message);

    db.prepare(
      `
      INSERT INTO whatsapp_reminders (id, installment_id, phone, sent_at, status, message)
      VALUES (?, ?, ?, datetime('now'), ?, ?)
    `,
    ).run(
      uuidv4(),
      row.installment_id,
      row.customer_phone,
      result.success ? "sent" : "failed",
      message,
    );

    if (result.success) {
      sent++;
    } else {
      failed++;
      console.warn(
        `[Reminder] Failed to send to ${row.customer_phone}: ${result.error}`,
      );
    }
  }

  const skipped = dueInstallments.length === 0 ? 0 : 0; // all attempted
  console.log(
    `[Reminder] Sent: ${sent}, Failed: ${failed}, Total due in 3 days: ${dueInstallments.length}`,
  );
  return { sent, skipped, failed };
}

export function getReminderLogs(limit = 50): any[] {
  try {
    const db = getDatabase();
    return db
      .prepare(
        `
      SELECT
        r.id,
        r.phone,
        r.sent_at,
        r.status,
        r.message,
        i.due_date,
        i.amount,
        i.installment_number,
        s.invoice_number,
        c.name AS customer_name
      FROM whatsapp_reminders r
      LEFT JOIN installments i ON r.installment_id = i.id
      LEFT JOIN sales s ON i.sale_id = s.id
      LEFT JOIN customers c ON s.customer_id = c.id
      ORDER BY r.sent_at DESC
      LIMIT ?
    `,
      )
      .all(limit) as any[];
  } catch {
    return [];
  }
}

function buildMessage(data: any): string {
  const date = new Date(data.due_date).toLocaleDateString("en-PK", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const amount = Number(data.amount).toLocaleString("en-PK");

  return (
    `Assalamu Alaikum *${data.customer_name}* Sahb,\n\n` +
    `*📅 Installment Reminder*\n` +
    `_Pak Japan Motors, Layyah_\n\n` +
    `Vehicle: *${data.year} ${data.make} ${data.model}*\n` +
    `Invoice: *${data.invoice_number}*\n` +
    `Installment No: *#${data.installment_number}*\n` +
    `Amount Due: *PKR ${amount}*\n` +
    `Due Date: *${date}* _(3 days remaining)_\n\n` +
    `Meherbani farma kar waqt par ada karein.\n` +
    `JazakAllah Khair! \n\n` +
    `_Pak Japan Motors, Layyah_`
  );
}
