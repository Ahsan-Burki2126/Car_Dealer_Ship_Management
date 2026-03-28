import { getDatabase } from "../database/init";
import { v4 as uuidv4 } from "uuid";
import type { Customer } from "../../shared/types";

export function addCustomer(userId: string, data: Partial<Customer>): Customer {
  const db = getDatabase();
  const id = uuidv4();

  // Enforce unique CNIC
  if (data.cnic && data.cnic.trim()) {
    const existing = db.prepare(
      "SELECT id FROM customers WHERE cnic = ? AND cnic != '' AND is_deleted = 0"
    ).get(data.cnic.trim());
    if (existing) throw new Error(`A customer with CNIC "${data.cnic.trim()}" already exists.`);
  }

  db.prepare(
    `
    INSERT INTO customers (id, name, father_name, caste, cnic, phone, address, photo_path, cnic_photo_path, cnic_photo_back_path,
      notes, witness_name, witness_father_name, witness_cnic, witness_phone, witness_cnic_photo_path, witness_cnic_photo_back_path, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
  ).run(
    id,
    data.name || "",
    data.father_name || "",
    data.caste || "",
    data.cnic || "",
    data.phone || "",
    data.address || "",
    data.photo_path || "",
    data.cnic_photo_path || "",
    data.cnic_photo_back_path || "",
    data.notes || "",
    data.witness_name || "",
    data.witness_father_name || "",
    data.witness_cnic || "",
    data.witness_phone || "",
    data.witness_cnic_photo_path || "",
    data.witness_cnic_photo_back_path || "",
    userId,
  );

  const user = db
    .prepare("SELECT username, role FROM users WHERE id = ?")
    .get(userId) as any;
  db.prepare(
    `
    INSERT INTO audit_logs (id, user_id, username, role, action_type, affected_entity, entity_id, new_value, timestamp)
    VALUES (?, ?, ?, ?, 'create', 'customers', ?, ?, datetime('now'))
  `,
  ).run(
    uuidv4(),
    userId,
    user?.username || "",
    user?.role || "",
    id,
    JSON.stringify({ name: data.name, cnic: data.cnic }),
  );

  return getCustomerById(id)!;
}

export function getCustomers(filters?: {
  search?: string;
  page?: number;
  limit?: number;
}): { data: Customer[]; total: number } {
  const db = getDatabase();
  let whereClause = "WHERE is_deleted = 0";
  const params: any[] = [];

  if (filters?.search) {
    whereClause +=
      " AND (name LIKE ? OR cnic LIKE ? OR phone LIKE ? OR father_name LIKE ?)";
    const s = `%${filters.search}%`;
    params.push(s, s, s, s);
  }

  const countRow = db
    .prepare(`SELECT COUNT(*) as count FROM customers ${whereClause}`)
    .get(...params) as any;
  const total = countRow.count;

  const page = filters?.page || 1;
  const limit = filters?.limit || 50;
  const offset = (page - 1) * limit;

  const rows = db
    .prepare(
      `SELECT * FROM customers ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    )
    .all(...params, limit, offset) as any[];

  return {
    data: rows.map(mapCustomerRow),
    total,
  };
}

export function getCustomerById(id: string): Customer | null {
  const db = getDatabase();
  const row = db
    .prepare("SELECT * FROM customers WHERE id = ? AND is_deleted = 0")
    .get(id) as any;
  return row ? mapCustomerRow(row) : null;
}

export function updateCustomer(
  userId: string,
  id: string,
  data: Partial<Customer>,
): Customer {
  const db = getDatabase();
  const existing = db
    .prepare("SELECT * FROM customers WHERE id = ? AND is_deleted = 0")
    .get(id) as any;
  if (!existing) throw new Error("Customer not found");

  // Enforce unique CNIC on update (exclude current customer)
  if (data.cnic && data.cnic.trim()) {
    const duplicate = db.prepare(
      "SELECT id FROM customers WHERE cnic = ? AND cnic != '' AND is_deleted = 0 AND id != ?"
    ).get(data.cnic.trim(), id);
    if (duplicate) throw new Error(`A customer with CNIC "${data.cnic.trim()}" already exists.`);
  }

  const updates: string[] = [];
  const values: any[] = [];

  const fields = [
    "name",
    "father_name",
    "caste",
    "cnic",
    "phone",
    "address",
    "photo_path",
    "cnic_photo_path",
    "cnic_photo_back_path",
    "notes",
    "witness_name",
    "witness_father_name",
    "witness_cnic",
    "witness_phone",
    "witness_cnic_photo_path",
    "witness_cnic_photo_back_path",
  ];

  for (const field of fields) {
    if ((data as any)[field] !== undefined) {
      updates.push(`${field} = ?`);
      values.push((data as any)[field]);
    }
  }

  if (updates.length > 0) {
    updates.push("updated_at = datetime('now')");
    updates.push("synced = 0");
    values.push(id);
    db.prepare(`UPDATE customers SET ${updates.join(", ")} WHERE id = ?`).run(
      ...values,
    );

    const user = db
      .prepare("SELECT username, role FROM users WHERE id = ?")
      .get(userId) as any;
    db.prepare(
      `
      INSERT INTO audit_logs (id, user_id, username, role, action_type, affected_entity, entity_id, old_value, new_value, timestamp)
      VALUES (?, ?, ?, ?, 'update', 'customers', ?, ?, ?, datetime('now'))
    `,
    ).run(
      uuidv4(),
      userId,
      user?.username || "",
      user?.role || "",
      id,
      JSON.stringify({ name: existing.name }),
      JSON.stringify(data),
    );
  }

  return getCustomerById(id)!;
}

export function deleteCustomer(userId: string, id: string): void {
  const db = getDatabase();
  db.prepare(
    "UPDATE customers SET is_deleted = 1, updated_at = datetime('now'), synced = 0 WHERE id = ?",
  ).run(id);

  const user = db
    .prepare("SELECT username, role FROM users WHERE id = ?")
    .get(userId) as any;
  db.prepare(
    `
    INSERT INTO audit_logs (id, user_id, username, role, action_type, affected_entity, entity_id, timestamp)
    VALUES (?, ?, ?, ?, 'delete', 'customers', ?, datetime('now'))
  `,
  ).run(uuidv4(), userId, user?.username || "", user?.role || "", id);
}

function mapCustomerRow(row: any): Customer {
  return {
    id: row.id,
    name: row.name,
    father_name: row.father_name,
    caste: row.caste,
    cnic: row.cnic,
    phone: row.phone,
    address: row.address,
    photo_path: row.photo_path,
    cnic_photo_path: row.cnic_photo_path,
    cnic_photo_back_path: row.cnic_photo_back_path,
    notes: row.notes,
    witness_name: row.witness_name,
    witness_father_name: row.witness_father_name,
    witness_cnic: row.witness_cnic,
    witness_phone: row.witness_phone,
    witness_cnic_photo_path: row.witness_cnic_photo_path,
    witness_cnic_photo_back_path: row.witness_cnic_photo_back_path,
    created_by: row.created_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}
