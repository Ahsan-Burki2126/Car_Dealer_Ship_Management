import { getDatabase } from "../database/init";
import { v4 as uuidv4 } from "uuid";
import { INSPECTION_POINTS } from "../../shared/inspectionPoints";
import type {
  Inspection,
  InspectionItem,
  DamageMapEntry,
  InspectionPhoto,
  DamageStatus,
  InspectionPointStatus,
} from "../../shared/types";
import { CAR_PANELS } from "../../shared/constants";

export function createInspection(
  userId: string,
  vehicleId: string,
): Inspection {
  const db = getDatabase();

  const vehicle = db
    .prepare("SELECT * FROM vehicles WHERE id = ? AND is_deleted = 0")
    .get(vehicleId) as any;
  if (!vehicle) throw new Error("Vehicle not found");

  const user = db
    .prepare("SELECT * FROM users WHERE id = ?")
    .get(userId) as any;
  if (!user) throw new Error("User not found");

  const id = uuidv4();
  const date = new Date().toISOString().split("T")[0];

  const create = db.transaction(() => {
    // Create inspection
    db.prepare(
      `
      INSERT INTO inspections (id, vehicle_id, inspector_id, inspector_name, date, overall_score, status)
      VALUES (?, ?, ?, ?, ?, 10.0, 'draft')
    `,
    ).run(id, vehicleId, userId, user.full_name, date);

    // Create all inspection items from the 200+ points definition
    const insertItem = db.prepare(`
      INSERT INTO inspection_items (id, inspection_id, category, item_name, status, score_deduction, input_type)
      VALUES (?, ?, ?, ?, 'good', 0, ?)
    `);

    for (const point of INSPECTION_POINTS) {
      insertItem.run(
        uuidv4(),
        id,
        point.category,
        point.name,
        point.input_type,
      );
    }

    // Create damage map entries for all panels
    const insertDamage = db.prepare(`
      INSERT INTO damage_map (id, inspection_id, panel, status)
      VALUES (?, ?, ?, 'original')
    `);

    for (const panel of CAR_PANELS) {
      insertDamage.run(uuidv4(), id, panel);
    }

    // Audit log
    db.prepare(
      `
      INSERT INTO audit_logs (id, user_id, username, role, action_type, affected_entity, entity_id, new_value, timestamp)
      VALUES (?, ?, ?, ?, 'create', 'inspections', ?, ?, datetime('now'))
    `,
    ).run(
      uuidv4(),
      userId,
      user.username,
      user.role,
      id,
      JSON.stringify({ vehicle: `${vehicle.make} ${vehicle.model}` }),
    );
  });

  create();
  return getInspectionById(id)!;
}

export function getInspections(filters?: {
  vehicleId?: string;
  status?: string;
  page?: number;
  limit?: number;
}): { data: Inspection[]; total: number } {
  const db = getDatabase();
  let whereClause = "WHERE 1=1";
  const params: any[] = [];

  if (filters?.vehicleId) {
    whereClause += " AND i.vehicle_id = ?";
    params.push(filters.vehicleId);
  }

  if (filters?.status) {
    whereClause += " AND i.status = ?";
    params.push(filters.status);
  }

  const countRow = db
    .prepare(`SELECT COUNT(*) as count FROM inspections i ${whereClause}`)
    .get(...params) as any;
  const page = filters?.page || 1;
  const limit = filters?.limit || 50;
  const offset = (page - 1) * limit;

  const rows = db
    .prepare(
      `
    SELECT i.*, v.make, v.model, v.year, v.registration_number, v.color
    FROM inspections i
    LEFT JOIN vehicles v ON i.vehicle_id = v.id
    ${whereClause} ORDER BY i.created_at DESC LIMIT ? OFFSET ?
  `,
    )
    .all(...params, limit, offset) as any[];

  return {
    data: rows.map((row) => ({
      id: row.id,
      vehicle_id: row.vehicle_id,
      inspector_id: row.inspector_id,
      inspector_name: row.inspector_name,
      date: row.date,
      overall_score: row.overall_score,
      notes: row.notes,
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at,
      vehicle: row.make
        ? ({
            id: row.vehicle_id,
            make: row.make,
            model: row.model,
            year: row.year,
            registration_number: row.registration_number,
            color: row.color,
          } as any)
        : undefined,
    })),
    total: countRow.count,
  };
}

export function getInspectionById(id: string): Inspection | null {
  const db = getDatabase();
  const row = db
    .prepare(
      `
    SELECT i.*, v.make, v.model, v.year, v.registration_number, v.color, v.chassis_number, v.engine_number
    FROM inspections i
    LEFT JOIN vehicles v ON i.vehicle_id = v.id
    WHERE i.id = ?
  `,
    )
    .get(id) as any;

  if (!row) return null;

  const items = db
    .prepare(
      "SELECT * FROM inspection_items WHERE inspection_id = ? ORDER BY category, item_name",
    )
    .all(id) as InspectionItem[];

  const damageMap = db
    .prepare("SELECT * FROM damage_map WHERE inspection_id = ?")
    .all(id) as DamageMapEntry[];

  const photos = db
    .prepare(
      "SELECT * FROM inspection_photos WHERE inspection_id = ? ORDER BY created_at",
    )
    .all(id) as InspectionPhoto[];

  return {
    id: row.id,
    vehicle_id: row.vehicle_id,
    inspector_id: row.inspector_id,
    inspector_name: row.inspector_name,
    date: row.date,
    overall_score: row.overall_score,
    notes: row.notes,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
    vehicle: row.make
      ? ({
          id: row.vehicle_id,
          make: row.make,
          model: row.model,
          year: row.year,
          registration_number: row.registration_number,
          chassis_number: row.chassis_number,
          engine_number: row.engine_number,
          color: row.color,
        } as any)
      : undefined,
    items,
    damage_map: damageMap,
    photos,
  };
}

export function updateInspectionItem(
  userId: string,
  itemId: string,
  data: { status: InspectionPointStatus; notes?: string; value?: string },
): void {
  const db = getDatabase();
  const item = db
    .prepare("SELECT * FROM inspection_items WHERE id = ?")
    .get(itemId) as any;
  if (!item) throw new Error("Inspection item not found");

  // Calculate deduction based on status
  const pointDef = INSPECTION_POINTS.find(
    (p) => p.name === item.item_name && p.category === item.category,
  );
  let deduction = 0;
  if (pointDef) {
    switch (data.status) {
      case "poor":
        deduction = pointDef.deduction_major;
        break;
      case "fair":
        deduction = pointDef.deduction_minor;
        break;
      case "good":
      case "not_applicable":
      default:
        deduction = 0;
    }
  }

  db.prepare(
    `
    UPDATE inspection_items SET status = ?, score_deduction = ?, notes = ?, value = ?
    WHERE id = ?
  `,
  ).run(
    data.status,
    deduction,
    data.notes || item.notes || "",
    data.value || item.value || "",
    itemId,
  );

  // Recalculate overall score
  recalculateScore(item.inspection_id);
}

export function updateDamageMap(
  userId: string,
  inspectionId: string,
  panel: string,
  status: DamageStatus,
): void {
  const db = getDatabase();
  db.prepare(
    "UPDATE damage_map SET status = ? WHERE inspection_id = ? AND panel = ?",
  ).run(status, inspectionId, panel);
}

export function completeInspection(
  userId: string,
  inspectionId: string,
): Inspection {
  const db = getDatabase();
  recalculateScore(inspectionId);

  db.prepare(
    `
    UPDATE inspections SET status = 'completed', updated_at = datetime('now'), synced = 0
    WHERE id = ?
  `,
  ).run(inspectionId);

  const user = db
    .prepare("SELECT username, role FROM users WHERE id = ?")
    .get(userId) as any;
  db.prepare(
    `
    INSERT INTO audit_logs (id, user_id, username, role, action_type, affected_entity, entity_id, timestamp)
    VALUES (?, ?, ?, ?, 'status_change', 'inspections', ?, datetime('now'))
  `,
  ).run(uuidv4(), userId, user?.username || "", user?.role || "", inspectionId);

  return getInspectionById(inspectionId)!;
}

export function addInspectionPhoto(
  inspectionId: string,
  category: string,
  photoPath: string,
  caption?: string,
): InspectionPhoto {
  const db = getDatabase();
  const id = uuidv4();

  db.prepare(
    `
    INSERT INTO inspection_photos (id, inspection_id, category, photo_path, caption)
    VALUES (?, ?, ?, ?, ?)
  `,
  ).run(id, inspectionId, category, photoPath, caption || "");

  return {
    id,
    inspection_id: inspectionId,
    category,
    photo_path: photoPath,
    caption,
    created_at: new Date().toISOString(),
  };
}

function recalculateScore(inspectionId: string): void {
  const db = getDatabase();
  const result = db
    .prepare(
      `
    SELECT COALESCE(SUM(score_deduction), 0) as total_deduction
    FROM inspection_items WHERE inspection_id = ?
  `,
    )
    .get(inspectionId) as any;

  const score = Math.max(
    0,
    Math.round((10 - result.total_deduction) * 10) / 10,
  );

  db.prepare(
    "UPDATE inspections SET overall_score = ?, updated_at = datetime('now') WHERE id = ?",
  ).run(score, inspectionId);
}
