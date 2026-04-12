import { getDatabase } from "../database/init";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import type { User, AuthPayload, UserRole } from "../../shared/types";

const JWT_SECRET =
  process.env.JWT_SECRET || "dms-secure-key-change-in-production-2024";
const TOKEN_EXPIRY = "24h";

export function login(
  username: string,
  password: string,
  deviceInfo?: string,
): { token: string; user: User } {
  const db = getDatabase();
  const row = db
    .prepare("SELECT * FROM users WHERE username = ? AND is_active = 1")
    .get(username) as any;

  if (!row) {
    throw new Error("Invalid username or password");
  }

  const isValid = bcrypt.compareSync(password, row.password_hash);
  if (!isValid) {
    throw new Error("Invalid username or password");
  }

  const payload: AuthPayload = {
    userId: row.id,
    username: row.username,
    role: row.role,
  };

  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });

  // Update last login
  db.prepare("UPDATE users SET last_login = datetime('now') WHERE id = ?").run(
    row.id,
  );

  // Log login action
  db.prepare(
    `
    INSERT INTO audit_logs (id, user_id, username, role, action_type, affected_entity, entity_id, device_info, timestamp)
    VALUES (?, ?, ?, ?, 'login', 'users', ?, ?, datetime('now'))
  `,
  ).run(
    uuidv4(),
    row.id,
    row.username,
    row.role,
    row.id,
    deviceInfo || "Desktop",
  );

  const user: User = {
    id: row.id,
    username: row.username,
    full_name: row.full_name,
    email: row.email,
    role: row.role,
    is_active: Boolean(row.is_active),
    created_at: row.created_at,
    updated_at: row.updated_at,
    last_login: row.last_login,
  };

  return { token, user };
}

export function verifyToken(token: string): AuthPayload {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthPayload;
  } catch {
    throw new Error("Invalid or expired token");
  }
}

export function createUser(
  adminId: string,
  data: {
    username: string;
    password: string;
    full_name: string;
    email?: string;
    role: UserRole;
  },
): User {
  const db = getDatabase();
  const admin = db
    .prepare("SELECT role, username FROM users WHERE id = ?")
    .get(adminId) as any;

  if (!admin || admin.role !== "super_admin") {
    throw new Error("Only Super Admin can create users");
  }

  const existing = db
    .prepare("SELECT id FROM users WHERE username = ?")
    .get(data.username);
  if (existing) {
    throw new Error("Username already exists");
  }

  const id = uuidv4();
  const hashedPassword = bcrypt.hashSync(data.password, 12);

  db.prepare(
    `
    INSERT INTO users (id, username, password_hash, full_name, email, role)
    VALUES (?, ?, ?, ?, ?, ?)
  `,
  ).run(
    id,
    data.username,
    hashedPassword,
    data.full_name,
    data.email || "",
    data.role,
  );

  db.prepare(
    `
    INSERT INTO audit_logs (id, user_id, username, role, action_type, affected_entity, entity_id, new_value, timestamp)
    VALUES (?, ?, ?, ?, 'create', 'users', ?, ?, datetime('now'))
  `,
  ).run(
    uuidv4(),
    adminId,
    admin.username || "superadmin",
    admin.role,
    id,
    JSON.stringify({ username: data.username, role: data.role }),
  );

  return {
    id,
    username: data.username,
    full_name: data.full_name,
    email: data.email || "",
    role: data.role,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export function getUsers(): User[] {
  const db = getDatabase();
  const rows = db
    .prepare("SELECT * FROM users ORDER BY created_at DESC")
    .all() as any[];
  return rows.map((row) => ({
    id: row.id,
    username: row.username,
    full_name: row.full_name,
    email: row.email,
    role: row.role,
    is_active: Boolean(row.is_active),
    created_at: row.created_at,
    updated_at: row.updated_at,
    last_login: row.last_login,
  }));
}

export function updateUser(
  adminId: string,
  userId: string,
  data: Partial<{
    full_name: string;
    email: string;
    role: UserRole;
    is_active: boolean;
    password: string;
  }>,
): void {
  const db = getDatabase();
  const admin = db
    .prepare("SELECT role, username FROM users WHERE id = ?")
    .get(adminId) as any;
  if (!admin || (admin.role !== "super_admin" && admin.role !== "admin")) {
    throw new Error("Only Super Admin or Admin can update users");
  }

  const existing = db
    .prepare("SELECT * FROM users WHERE id = ?")
    .get(userId) as any;
  if (!existing) throw new Error("User not found");

  const updates: string[] = [];
  const values: any[] = [];

  if (data.full_name !== undefined) {
    updates.push("full_name = ?");
    values.push(data.full_name);
  }
  if (data.email !== undefined) {
    updates.push("email = ?");
    values.push(data.email);
  }
  if (data.role !== undefined) {
    updates.push("role = ?");
    values.push(data.role);
  }
  if (data.is_active !== undefined) {
    updates.push("is_active = ?");
    values.push(data.is_active ? 1 : 0);
  }
  if (data.password) {
    updates.push("password_hash = ?");
    values.push(bcrypt.hashSync(data.password, 12));
  }

  if (updates.length > 0) {
    updates.push("updated_at = datetime('now')");
    values.push(userId);
    db.prepare(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`).run(
      ...values,
    );

    db.prepare(
      `
      INSERT INTO audit_logs (id, user_id, username, role, action_type, affected_entity, entity_id, old_value, new_value, timestamp)
      VALUES (?, ?, ?, ?, 'update', 'users', ?, ?, ?, datetime('now'))
    `,
    ).run(
      uuidv4(),
      adminId,
      admin.username,
      admin.role,
      userId,
      JSON.stringify(existing),
      JSON.stringify(data),
    );
  }
}

export function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): void {
  const db = getDatabase();
  const user = db
    .prepare("SELECT * FROM users WHERE id = ?")
    .get(userId) as any;
  if (!user) throw new Error("User not found");

  if (!bcrypt.compareSync(currentPassword, user.password_hash)) {
    throw new Error("Current password is incorrect");
  }

  const newHash = bcrypt.hashSync(newPassword, 12);
  db.prepare(
    "UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?",
  ).run(newHash, userId);
}

export function deleteUser(adminId: string, userId: string): void {
  const db = getDatabase();
  const admin = db
    .prepare("SELECT role, username FROM users WHERE id = ?")
    .get(adminId) as { role: UserRole; username: string } | undefined;
  if (!admin || admin.role !== "super_admin") {
    throw new Error("Only Super Admin can delete users");
  }
  if (adminId === userId) {
    throw new Error("You cannot delete your own account");
  }

  const existing = db
    .prepare("SELECT id, username, role FROM users WHERE id = ?")
    .get(userId) as
    | { id: string; username: string; role: UserRole }
    | undefined;
  if (!existing) {
    throw new Error("User not found");
  }

  if (existing.role === "super_admin") {
    const superAdminCount = db
      .prepare("SELECT COUNT(*) as count FROM users WHERE role = 'super_admin'")
      .get() as { count: number };
    if (superAdminCount.count <= 1) {
      throw new Error("Cannot delete the last Super Admin");
    }
  }

  // Log the deletion before hard delete
  db.prepare(
    `
    INSERT INTO audit_logs (id, user_id, username, role, action_type, affected_entity, entity_id, old_value, timestamp)
    VALUES (?, ?, ?, ?, 'delete', 'users', ?, ?, datetime('now'))
  `,
  ).run(
    uuidv4(),
    adminId,
    admin.username,
    admin.role,
    userId,
    JSON.stringify({ username: existing.username, role: existing.role }),
  );

  // Hard delete: permanently remove from database
  db.prepare("DELETE FROM users WHERE id = ?").run(userId);
}
