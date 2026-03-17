import { getDatabase } from "../database/init";
import { v4 as uuidv4 } from "uuid";
import type { BankAccount } from "../../shared/types";

export function getBankAccounts(activeOnly = true): BankAccount[] {
  const db = getDatabase();
  const whereClause = activeOnly ? "WHERE is_active = 1" : "";
  const rows = db
    .prepare(
      `
      SELECT * FROM bank_accounts
      ${whereClause}
      ORDER BY name ASC
    `,
    )
    .all() as Array<{
    id: string;
    name: string;
    bank_name: string | null;
    account_title: string | null;
    account_number: string | null;
    type: "bank" | "wallet";
    is_active: number;
    created_at: string;
    updated_at: string;
  }>;

  return rows.map((row) => ({
    id: row.id,
    name: row.bank_name || row.name,
    bank_name: row.bank_name || row.name,
    account_title: row.account_title || "",
    account_number: row.account_number || "",
    type: row.type,
    is_active: Boolean(row.is_active),
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));
}

export function createBankAccount(
  userId: string,
  data: {
    bank_name: string;
    account_title?: string;
    account_number?: string;
    type?: "bank" | "wallet";
    is_active?: boolean;
  },
): BankAccount {
  const db = getDatabase();
  const id = uuidv4();
  const bankName = (data.bank_name || "").trim();
  if (!bankName) {
    throw new Error("Bank name is required");
  }

  db.prepare(
    `
    INSERT INTO bank_accounts (id, name, bank_name, account_title, account_number, type, is_active, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `,
  ).run(
    id,
    bankName,
    bankName,
    (data.account_title || "").trim(),
    (data.account_number || "").trim(),
    data.type || "bank",
    data.is_active === false ? 0 : 1,
    userId,
  );

  const user = db
    .prepare("SELECT username, role FROM users WHERE id = ?")
    .get(userId) as { username: string; role: string } | undefined;
  db.prepare(
    `
    INSERT INTO audit_logs (id, user_id, username, role, action_type, affected_entity, entity_id, new_value, timestamp)
    VALUES (?, ?, ?, ?, 'create', 'bank_accounts', ?, ?, datetime('now'))
  `,
  ).run(
    uuidv4(),
    userId,
    user?.username || "",
    user?.role || "",
    id,
    JSON.stringify({
      bank_name: bankName,
      account_title: (data.account_title || "").trim(),
      account_number: (data.account_number || "").trim(),
    }),
  );

  return getBankAccountById(id)!;
}

export function updateBankAccount(
  userId: string,
  id: string,
  data: Partial<{
    bank_name: string;
    account_title: string;
    account_number: string;
    type: "bank" | "wallet";
    is_active: boolean;
  }>,
): BankAccount {
  const db = getDatabase();
  const existing = db
    .prepare("SELECT * FROM bank_accounts WHERE id = ?")
    .get(id) as
    | {
        id: string;
        name: string;
        bank_name: string | null;
        account_title: string | null;
        account_number: string | null;
        type: "bank" | "wallet";
        is_active: number;
      }
    | undefined;
  if (!existing) {
    throw new Error("Bank account not found");
  }

  const updates: string[] = [];
  const values: any[] = [];

  if (data.bank_name !== undefined) {
    const bankName = data.bank_name.trim();
    if (!bankName) throw new Error("Bank name is required");
    updates.push("name = ?");
    values.push(bankName);
    updates.push("bank_name = ?");
    values.push(bankName);
  }
  if (data.account_title !== undefined) {
    updates.push("account_title = ?");
    values.push(data.account_title.trim());
  }
  if (data.account_number !== undefined) {
    updates.push("account_number = ?");
    values.push(data.account_number.trim());
  }
  if (data.type !== undefined) {
    updates.push("type = ?");
    values.push(data.type);
  }
  if (data.is_active !== undefined) {
    updates.push("is_active = ?");
    values.push(data.is_active ? 1 : 0);
  }

  if (!updates.length) {
    return getBankAccountById(id)!;
  }

  updates.push("updated_at = datetime('now')");
  values.push(id);
  db.prepare(`UPDATE bank_accounts SET ${updates.join(", ")} WHERE id = ?`).run(
    ...values,
  );

  const user = db
    .prepare("SELECT username, role FROM users WHERE id = ?")
    .get(userId) as { username: string; role: string } | undefined;
  db.prepare(
    `
    INSERT INTO audit_logs (id, user_id, username, role, action_type, affected_entity, entity_id, old_value, new_value, timestamp)
    VALUES (?, ?, ?, ?, 'update', 'bank_accounts', ?, ?, ?, datetime('now'))
  `,
  ).run(
    uuidv4(),
    userId,
    user?.username || "",
    user?.role || "",
    id,
    JSON.stringify({
      bank_name: existing.bank_name || existing.name,
      account_title: existing.account_title || "",
      account_number: existing.account_number || "",
      type: existing.type,
      is_active: Boolean(existing.is_active),
    }),
    JSON.stringify(data),
  );

  return getBankAccountById(id)!;
}

function getBankAccountById(id: string): BankAccount | null {
  const db = getDatabase();
  const row = db
    .prepare("SELECT * FROM bank_accounts WHERE id = ?")
    .get(id) as
    | {
        id: string;
        name: string;
        bank_name: string | null;
        account_title: string | null;
        account_number: string | null;
        type: "bank" | "wallet";
        is_active: number;
        created_at: string;
        updated_at: string;
      }
    | undefined;
  if (!row) return null;
  return {
    id: row.id,
    name: row.bank_name || row.name,
    bank_name: row.bank_name || row.name,
    account_title: row.account_title || "",
    account_number: row.account_number || "",
    type: row.type,
    is_active: Boolean(row.is_active),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}
