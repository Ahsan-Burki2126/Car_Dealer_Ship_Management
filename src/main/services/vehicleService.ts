import { getDatabase } from "../database/init";
import { v4 as uuidv4 } from "uuid";
import type { Vehicle, VehicleStatus } from "../../shared/types";

export function addVehicle(userId: string, data: Partial<Vehicle>): Vehicle {
  const db = getDatabase();
  const id = uuidv4();
  const totalCost = data.purchase_price || 0;
  const purchaseDate =
    data.purchase_date || new Date().toISOString().split("T")[0];

  // Enforce unique chassis number
  if (data.chassis_number && data.chassis_number.trim()) {
    const existing = db.prepare(
      "SELECT id FROM vehicles WHERE chassis_number = ? AND chassis_number != '' AND is_deleted = 0"
    ).get(data.chassis_number.trim());
    if (existing) throw new Error(`A vehicle with chassis number "${data.chassis_number.trim()}" already exists.`);
  }

  const inspectionJson = data.vehicleInspection
    ? JSON.stringify(data.vehicleInspection)
    : null;

  const tx = db.transaction(() => {
    db.prepare(
      `
      INSERT INTO vehicles (
        id, photo_path, registration_number, chassis_number, engine_number, make, model, year, color,
        assembling_company, key_available, status,
        year_of_manufacture, year_of_import, extra_keys_available, extra_keys_count,
        file_available, file_pages, current_smart_card, smart_card_count,
        purchase_price, purchase_date,
        seller_name, seller_father_name, seller_caste, seller_address, seller_cnic, seller_phone,
        seller_photo_path, seller_cnic_photo_path, seller_cnic_photo_back_path,
        seller_witness_name, seller_witness_father_name, seller_witness_cnic, seller_witness_phone,
        total_expenses, total_cost, selling_price, notes, inspection_points, created_by
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?,
        0, ?, ?, ?, ?, ?
      )
    `,
    ).run(
      id,
      data.photo_path || "",
      data.registration_number || "",
      data.chassis_number || "",
      data.engine_number || "",
      data.make || "",
      data.model || "",
      data.year_of_manufacture || new Date().getFullYear(),
      data.color || "",
      data.assembling_company || "",
      data.extra_keys_available === undefined ? 1 : data.extra_keys_available ? 1 : 0,
      data.status || "in_stock",
      data.year_of_manufacture || new Date().getFullYear(),
      (data as any).year_of_import || null,
      data.extra_keys_available === undefined ? 1 : data.extra_keys_available ? 1 : 0,
      (data as any).extra_keys_count || null,
      (data as any).file_available ? 1 : 0,
      (data as any).file_pages || null,
      (data as any).current_smart_card ? 1 : 0,
      (data as any).smart_card_count || null,
      data.purchase_price || 0,
      purchaseDate,
      data.seller_name || "",
      data.seller_father_name || "",
      data.seller_caste || "",
      data.seller_address || "",
      data.seller_cnic || "",
      data.seller_phone || "",
      data.seller_photo_path || "",
      data.seller_cnic_photo_path || "",
      data.seller_cnic_photo_back_path || "",
      data.seller_witness_name || "",
      data.seller_witness_father_name || "",
      data.seller_witness_cnic || "",
      data.seller_witness_phone || "",
      totalCost,
      data.selling_price || null,
      data.notes || "",
      inspectionJson,
      userId,
    );

    // Seller is also a customer to preserve a single person profile across buy/sell flows.
    const sellerName = (data.seller_name || "").trim();
    const sellerCnic = (data.seller_cnic || "").trim();
    const sellerPhone = (data.seller_phone || "").trim();
    let sellerCustomerId: string | null = null;

    if (sellerName || sellerCnic || sellerPhone) {
      const seller = db
        .prepare(
          `
          SELECT id
          FROM customers
          WHERE is_deleted = 0 AND (
            (cnic != '' AND cnic = ?) OR
            (phone != '' AND phone = ?) OR
            (name = ? AND name != '')
          )
          LIMIT 1
        `,
        )
        .get(sellerCnic, sellerPhone, sellerName) as { id: string } | undefined;

      if (seller) {
        sellerCustomerId = seller.id;
        if (data.seller_photo_path || data.seller_cnic_photo_path || data.seller_cnic_photo_back_path) {
          db.prepare(
            `
            UPDATE customers
            SET photo_path = COALESCE(NULLIF(?, ''), photo_path),
                cnic_photo_path = COALESCE(NULLIF(?, ''), cnic_photo_path),
                cnic_photo_back_path = COALESCE(NULLIF(?, ''), cnic_photo_back_path),
                updated_at = datetime('now'),
                synced = 0
            WHERE id = ?
          `,
          ).run(
            data.seller_photo_path || "",
            data.seller_cnic_photo_path || "",
            data.seller_cnic_photo_back_path || "",
            sellerCustomerId,
          );
        }
      } else if (sellerName) {
        sellerCustomerId = uuidv4();
        db.prepare(
          `
          INSERT INTO customers (id, name, father_name, cnic, phone, address, photo_path, cnic_photo_path, cnic_photo_back_path, created_by)
          VALUES (?, ?, '', ?, ?, '', ?, ?, ?, ?)
        `,
        ).run(
          sellerCustomerId,
          sellerName,
          sellerCnic,
          sellerPhone,
          data.seller_photo_path || "",
          data.seller_cnic_photo_path || "",
          data.seller_cnic_photo_back_path || "",
          userId,
        );
      }
    }

    db.prepare(
      `
      INSERT INTO purchases (id, vehicle_id, seller_customer_id, purchase_price, purchase_date, notes, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    ).run(
      uuidv4(),
      id,
      sellerCustomerId,
      data.purchase_price || 0,
      purchaseDate,
      data.notes || "",
      userId,
    );
  });

  tx();

  // Audit log
  const user = db
    .prepare("SELECT username, role FROM users WHERE id = ?")
    .get(userId) as any;
  db.prepare(
    `
    INSERT INTO audit_logs (id, user_id, username, role, action_type, affected_entity, entity_id, new_value, timestamp)
    VALUES (?, ?, ?, ?, 'create', 'vehicles', ?, ?, datetime('now'))
  `,
  ).run(
    uuidv4(),
    userId,
    user?.username || "",
    user?.role || "",
    id,
    JSON.stringify({ make: data.make, model: data.model }),
  );

  return getVehicleById(id)!;
}

export function getVehicles(filters?: {
  status?: VehicleStatus;
  search?: string;
  page?: number;
  limit?: number;
}): { data: Vehicle[]; total: number } {
  const db = getDatabase();
  let whereClause = "WHERE is_deleted = 0";
  const params: any[] = [];

  if (filters?.status) {
    whereClause += " AND status = ?";
    params.push(filters.status);
  }

  if (filters?.search) {
    whereClause += " AND chassis_number LIKE ?";
    const searchTerm = `%${filters.search}%`;
    params.push(searchTerm);
  }

  const countRow = db
    .prepare(`SELECT COUNT(*) as count FROM vehicles ${whereClause}`)
    .get(...params) as any;
  const total = countRow.count;

  const page = filters?.page || 1;
  const limit = filters?.limit || 50;
  const offset = (page - 1) * limit;

  const rows = db
    .prepare(
      `SELECT * FROM vehicles ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    )
    .all(...params, limit, offset) as any[];

  return {
    data: rows.map(mapVehicleRow),
    total,
  };
}

export function getVehicleById(id: string): Vehicle | null {
  const db = getDatabase();
  const row = db
    .prepare("SELECT * FROM vehicles WHERE id = ? AND is_deleted = 0")
    .get(id) as any;
  return row ? mapVehicleRow(row) : null;
}

export function updateVehicle(
  userId: string,
  id: string,
  data: Partial<Vehicle>,
): Vehicle {
  const db = getDatabase();
  const existing = db
    .prepare("SELECT * FROM vehicles WHERE id = ? AND is_deleted = 0")
    .get(id) as any;
  if (!existing) throw new Error("Vehicle not found");

  // Enforce unique chassis number on update (exclude current vehicle)
  if (data.chassis_number && data.chassis_number.trim()) {
    const duplicate = db.prepare(
      "SELECT id FROM vehicles WHERE chassis_number = ? AND chassis_number != '' AND is_deleted = 0 AND id != ?"
    ).get(data.chassis_number.trim(), id);
    if (duplicate) throw new Error(`A vehicle with chassis number "${data.chassis_number.trim()}" already exists.`);
  }

  const updates: string[] = [];
  const values: any[] = [];

  const fields = [
    "photo_path",
    "registration_number",
    "chassis_number",
    "engine_number",
    "make",
    "model",
    "color",
    "assembling_company",
    "status",
    "year_of_manufacture",
    "year_of_import",
    "extra_keys_count",
    "file_pages",
    "smart_card_count",
    "purchase_price",
    "purchase_date",
    "seller_name",
    "seller_father_name",
    "seller_caste",
    "seller_address",
    "seller_cnic",
    "seller_phone",
    "seller_photo_path",
    "seller_cnic_photo_path",
    "seller_cnic_photo_back_path",
    "seller_witness_name",
    "seller_witness_father_name",
    "seller_witness_cnic",
    "seller_witness_phone",
    "selling_price",
    "notes",
  ];

  for (const field of fields) {
    if ((data as any)[field] !== undefined) {
      updates.push(`${field} = ?`);
      values.push((data as any)[field]);
    }
  }

  if (data.vehicleInspection !== undefined) {
    updates.push("inspection_points = ?");
    values.push(
      data.vehicleInspection ? JSON.stringify(data.vehicleInspection) : null,
    );
  }

  if (data.extra_keys_available !== undefined) {
    updates.push("extra_keys_available = ?");
    values.push(data.extra_keys_available ? 1 : 0);
    updates.push("key_available = ?");
    values.push(data.extra_keys_available ? 1 : 0);
  }

  if ((data as any).file_available !== undefined) {
    updates.push("file_available = ?");
    values.push((data as any).file_available ? 1 : 0);
  }

  if ((data as any).current_smart_card !== undefined) {
    updates.push("current_smart_card = ?");
    values.push((data as any).current_smart_card ? 1 : 0);
  }

  // Recalculate total cost if purchase price changed
  if (data.purchase_price !== undefined) {
    const newTotalCost = data.purchase_price + (existing.total_expenses || 0);
    updates.push("total_cost = ?");
    values.push(newTotalCost);
  }

  if (updates.length > 0) {
    updates.push("updated_at = datetime('now')");
    updates.push("synced = 0");
    values.push(id);
    db.prepare(`UPDATE vehicles SET ${updates.join(", ")} WHERE id = ?`).run(
      ...values,
    );

    const user = db
      .prepare("SELECT username, role FROM users WHERE id = ?")
      .get(userId) as any;
    db.prepare(
      `
      INSERT INTO audit_logs (id, user_id, username, role, action_type, affected_entity, entity_id, old_value, new_value, timestamp)
      VALUES (?, ?, ?, ?, 'update', 'vehicles', ?, ?, ?, datetime('now'))
    `,
    ).run(
      uuidv4(),
      userId,
      user?.username || "",
      user?.role || "",
      id,
      JSON.stringify({
        make: existing.make,
        model: existing.model,
        status: existing.status,
      }),
      JSON.stringify(data),
    );
  }

  return getVehicleById(id)!;
}

export function deleteVehicle(userId: string, id: string): void {
  const db = getDatabase();
  const existing = db
    .prepare("SELECT * FROM vehicles WHERE id = ?")
    .get(id) as any;
  if (!existing) throw new Error("Vehicle not found");

  db.prepare(
    "UPDATE vehicles SET is_deleted = 1, updated_at = datetime('now'), synced = 0 WHERE id = ?",
  ).run(id);

  const user = db
    .prepare("SELECT username, role FROM users WHERE id = ?")
    .get(userId) as any;
  db.prepare(
    `
    INSERT INTO audit_logs (id, user_id, username, role, action_type, affected_entity, entity_id, old_value, timestamp)
    VALUES (?, ?, ?, ?, 'delete', 'vehicles', ?, ?, datetime('now'))
  `,
  ).run(
    uuidv4(),
    userId,
    user?.username || "",
    user?.role || "",
    id,
    JSON.stringify({
      make: existing.make,
      model: existing.model,
      registration_number: existing.registration_number,
    }),
  );
}

export function restoreVehicle(userId: string, id: string): void {
  const db = getDatabase();
  db.prepare(
    "UPDATE vehicles SET is_deleted = 0, updated_at = datetime('now'), synced = 0 WHERE id = ?",
  ).run(id);

  const user = db
    .prepare("SELECT username, role FROM users WHERE id = ?")
    .get(userId) as any;
  db.prepare(
    `
    INSERT INTO audit_logs (id, user_id, username, role, action_type, affected_entity, entity_id, timestamp)
    VALUES (?, ?, ?, ?, 'restore', 'vehicles', ?, datetime('now'))
  `,
  ).run(uuidv4(), userId, user?.username || "", user?.role || "", id);
}

function mapVehicleRow(row: any): Vehicle {
  let vehicleInspection = undefined;
  if (row.inspection_points) {
    try {
      vehicleInspection = JSON.parse(row.inspection_points);
    } catch {
      // ignore malformed JSON
    }
  }
  return {
    id: row.id,
    photo_path: row.photo_path,
    registration_number: row.registration_number,
    chassis_number: row.chassis_number,
    engine_number: row.engine_number,
    make: row.make,
    model: row.model,
    year_of_manufacture: row.year_of_manufacture || row.year,
    year_of_import: row.year_of_import,
    color: row.color,
    assembling_company: row.assembling_company,
    extra_keys_available: Boolean(row.extra_keys_available ?? row.key_available),
    extra_keys_count: row.extra_keys_count,
    file_available: Boolean(row.file_available),
    file_pages: row.file_pages,
    current_smart_card: Boolean(row.current_smart_card),
    smart_card_count: row.smart_card_count,
    status: row.status,
    purchase_price: row.purchase_price,
    purchase_date: row.purchase_date,
    seller_name: row.seller_name,
    seller_father_name: row.seller_father_name,
    seller_caste: row.seller_caste,
    seller_address: row.seller_address,
    seller_cnic: row.seller_cnic,
    seller_phone: row.seller_phone,
    seller_photo_path: row.seller_photo_path,
    seller_cnic_photo_path: row.seller_cnic_photo_path,
    seller_cnic_photo_back_path: row.seller_cnic_photo_back_path,
    seller_witness_name: row.seller_witness_name,
    seller_witness_father_name: row.seller_witness_father_name,
    seller_witness_cnic: row.seller_witness_cnic,
    seller_witness_phone: row.seller_witness_phone,
    total_expenses: row.total_expenses,
    total_cost: row.total_cost,
    selling_price: row.selling_price,
    notes: row.notes,
    vehicleInspection,
    created_by: row.created_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
  } as Vehicle;
}
