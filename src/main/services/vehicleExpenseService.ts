import { getDatabase } from "../database/init";
import { v4 as uuidv4 } from "uuid";
import type {
  VehicleExpense,
  VehicleExpenseCategory,
} from "../../shared/types";

export function addVehicleExpense(
  userId: string,
  vehicleId: string,
  data: {
    category: VehicleExpenseCategory;
    amount: number;
    date: string;
    notes?: string;
    condition_before?: string;
    condition_after?: string;
  },
): VehicleExpense {
  const db = getDatabase();

  const vehicle = db
    .prepare("SELECT * FROM vehicles WHERE id = ? AND is_deleted = 0")
    .get(vehicleId) as any;
  if (!vehicle) throw new Error("Vehicle not found");

  const id = uuidv4();

  db.prepare(
    `
    INSERT INTO vehicle_expenses (id, vehicle_id, category, amount, date, notes, condition_before, condition_after, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
  ).run(
    id,
    vehicleId,
    data.category,
    data.amount,
    data.date,
    data.notes || "",
    data.condition_before || "",
    data.condition_after || "",
    userId,
  );

  // Update vehicle total expenses and total cost
  const newTotalExpenses = vehicle.total_expenses + data.amount;
  const newTotalCost = vehicle.purchase_price + newTotalExpenses;

  db.prepare(
    "UPDATE vehicles SET total_expenses = ?, total_cost = ?, updated_at = datetime('now'), synced = 0 WHERE id = ?",
  ).run(newTotalExpenses, newTotalCost, vehicleId);

  // Audit log
  const user = db
    .prepare("SELECT username, role FROM users WHERE id = ?")
    .get(userId) as any;
  db.prepare(
    `
    INSERT INTO audit_logs (id, user_id, username, role, action_type, affected_entity, entity_id, new_value, timestamp)
    VALUES (?, ?, ?, ?, 'create', 'vehicle_expenses', ?, ?, datetime('now'))
  `,
  ).run(
    uuidv4(),
    userId,
    user?.username || "",
    user?.role || "",
    id,
    JSON.stringify({
      vehicle_id: vehicleId,
      category: data.category,
      amount: data.amount,
    }),
  );

  return {
    id,
    vehicle_id: vehicleId,
    category: data.category,
    amount: data.amount,
    date: data.date,
    notes: data.notes,
    condition_before: data.condition_before,
    condition_after: data.condition_after,
    created_by: userId,
    created_at: new Date().toISOString(),
  };
}

export function getVehicleExpenses(vehicleId: string): VehicleExpense[] {
  const db = getDatabase();
  const rows = db
    .prepare(
      "SELECT * FROM vehicle_expenses WHERE vehicle_id = ? ORDER BY date DESC",
    )
    .all(vehicleId) as any[];
  return rows.map((row) => ({
    id: row.id,
    vehicle_id: row.vehicle_id,
    category: row.category,
    amount: row.amount,
    date: row.date,
    notes: row.notes,
    condition_before: row.condition_before,
    condition_after: row.condition_after,
    created_by: row.created_by,
    created_at: row.created_at,
  }));
}

export function deleteVehicleExpense(userId: string, expenseId: string): void {
  const db = getDatabase();
  const expense = db
    .prepare("SELECT * FROM vehicle_expenses WHERE id = ?")
    .get(expenseId) as any;
  if (!expense) throw new Error("Expense not found");

  const vehicle = db
    .prepare("SELECT * FROM vehicles WHERE id = ?")
    .get(expense.vehicle_id) as any;
  if (!vehicle) throw new Error("Vehicle not found");

  db.prepare("DELETE FROM vehicle_expenses WHERE id = ?").run(expenseId);

  // Recalculate totals
  const result = db
    .prepare(
      "SELECT COALESCE(SUM(amount), 0) as total FROM vehicle_expenses WHERE vehicle_id = ?",
    )
    .get(expense.vehicle_id) as any;
  const newTotalExpenses = result.total;
  const newTotalCost = vehicle.purchase_price + newTotalExpenses;

  db.prepare(
    "UPDATE vehicles SET total_expenses = ?, total_cost = ?, updated_at = datetime('now'), synced = 0 WHERE id = ?",
  ).run(newTotalExpenses, newTotalCost, expense.vehicle_id);

  const user = db
    .prepare("SELECT username, role FROM users WHERE id = ?")
    .get(userId) as any;
  db.prepare(
    `
    INSERT INTO audit_logs (id, user_id, username, role, action_type, affected_entity, entity_id, old_value, timestamp)
    VALUES (?, ?, ?, ?, 'delete', 'vehicle_expenses', ?, ?, datetime('now'))
  `,
  ).run(
    uuidv4(),
    userId,
    user?.username || "",
    user?.role || "",
    expenseId,
    JSON.stringify({
      vehicle_id: expense.vehicle_id,
      category: expense.category,
      amount: expense.amount,
    }),
  );
}
