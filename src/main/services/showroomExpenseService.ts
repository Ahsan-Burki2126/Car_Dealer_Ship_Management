import { getDatabase } from "../database/init";
import { v4 as uuidv4 } from "uuid";
import type {
  ShowroomExpense,
  ShowroomExpenseCategory,
} from "../../shared/types";

export function addShowroomExpense(
  userId: string,
  data: {
    category: ShowroomExpenseCategory;
    amount: number;
    date: string;
    description?: string;
  },
): ShowroomExpense {
  const db = getDatabase();
  const id = uuidv4();

  db.prepare(
    `
    INSERT INTO showroom_expenses (id, category, amount, date, description, created_by)
    VALUES (?, ?, ?, ?, ?, ?)
  `,
  ).run(
    id,
    data.category,
    data.amount,
    data.date,
    data.description || "",
    userId,
  );

  const user = db
    .prepare("SELECT username, role FROM users WHERE id = ?")
    .get(userId) as any;
  db.prepare(
    `
    INSERT INTO audit_logs (id, user_id, username, role, action_type, affected_entity, entity_id, new_value, timestamp)
    VALUES (?, ?, ?, ?, 'create', 'showroom_expenses', ?, ?, datetime('now'))
  `,
  ).run(
    uuidv4(),
    userId,
    user?.username || "",
    user?.role || "",
    id,
    JSON.stringify({ category: data.category, amount: data.amount }),
  );

  return {
    id,
    category: data.category,
    amount: data.amount,
    date: data.date,
    description: data.description,
    created_by: userId,
    created_at: new Date().toISOString(),
  };
}

export function getShowroomExpenses(filters?: {
  category?: ShowroomExpenseCategory;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}): { data: ShowroomExpense[]; total: number } {
  const db = getDatabase();
  let whereClause = "WHERE 1=1";
  const params: any[] = [];

  if (filters?.category) {
    whereClause += " AND category = ?";
    params.push(filters.category);
  }

  if (filters?.startDate) {
    whereClause += " AND date >= ?";
    params.push(filters.startDate);
  }

  if (filters?.endDate) {
    whereClause += " AND date <= ?";
    params.push(filters.endDate);
  }

  const countRow = db
    .prepare(`SELECT COUNT(*) as count FROM showroom_expenses ${whereClause}`)
    .get(...params) as any;
  const total = countRow.count;

  const page = filters?.page || 1;
  const limit = filters?.limit || 50;
  const offset = (page - 1) * limit;

  const rows = db
    .prepare(
      `SELECT * FROM showroom_expenses ${whereClause} ORDER BY date DESC LIMIT ? OFFSET ?`,
    )
    .all(...params, limit, offset) as any[];

  return {
    data: rows.map((row) => ({
      id: row.id,
      category: row.category,
      amount: row.amount,
      date: row.date,
      description: row.description,
      created_by: row.created_by,
      created_at: row.created_at,
    })),
    total,
  };
}

export function deleteShowroomExpense(userId: string, id: string): void {
  const db = getDatabase();
  const expense = db
    .prepare("SELECT * FROM showroom_expenses WHERE id = ?")
    .get(id) as any;
  if (!expense) throw new Error("Expense not found");

  db.prepare("DELETE FROM showroom_expenses WHERE id = ?").run(id);

  const user = db
    .prepare("SELECT username, role FROM users WHERE id = ?")
    .get(userId) as any;
  db.prepare(
    `
    INSERT INTO audit_logs (id, user_id, username, role, action_type, affected_entity, entity_id, old_value, timestamp)
    VALUES (?, ?, ?, ?, 'delete', 'showroom_expenses', ?, ?, datetime('now'))
  `,
  ).run(
    uuidv4(),
    userId,
    user?.username || "",
    user?.role || "",
    id,
    JSON.stringify({ category: expense.category, amount: expense.amount }),
  );
}
