import Database from "better-sqlite3";
import path from "path";
import { app } from "electron";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";

let db: Database.Database;

export function getDatabase(): Database.Database {
  if (!db) {
    const userDataPath = app.getPath("userData");
    const dbPath = path.join(userDataPath, "dealership.db");
    db = new Database(dbPath);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
  }
  return db;
}

export function initializeDatabase(): void {
  const database = getDatabase();

  database.exec(`
    -- ============================================================
    -- USERS TABLE
    -- ============================================================
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      email TEXT,
      role TEXT NOT NULL CHECK(role IN ('super_admin', 'admin', 'staff')),
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_login TEXT
    );

    -- ============================================================
    -- VEHICLES TABLE
    -- ============================================================
    CREATE TABLE IF NOT EXISTS vehicles (
      id TEXT PRIMARY KEY,
      registration_number TEXT,
      chassis_number TEXT,
      engine_number TEXT,
      make TEXT NOT NULL,
      model TEXT NOT NULL,
      year INTEGER NOT NULL,
      color TEXT,
      assembly_country TEXT,
      key_available INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'purchased' CHECK(status IN ('purchased', 'in_stock', 'reserved', 'sold', 'on_installments')),
      purchase_price REAL NOT NULL DEFAULT 0,
      purchase_date TEXT,
      seller_name TEXT,
      seller_cnic TEXT,
      seller_phone TEXT,
      total_expenses REAL NOT NULL DEFAULT 0,
      total_cost REAL NOT NULL DEFAULT 0,
      selling_price REAL,
      notes TEXT,
      is_deleted INTEGER NOT NULL DEFAULT 0,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      synced INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    -- ============================================================
    -- VEHICLE DOCUMENTS/PHOTOS TABLE
    -- ============================================================
    CREATE TABLE IF NOT EXISTS vehicle_documents (
      id TEXT PRIMARY KEY,
      vehicle_id TEXT NOT NULL,
      document_type TEXT NOT NULL,
      file_path TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)
    );

    -- ============================================================
    -- VEHICLE EXPENSES TABLE
    -- ============================================================
    CREATE TABLE IF NOT EXISTS vehicle_expenses (
      id TEXT PRIMARY KEY,
      vehicle_id TEXT NOT NULL,
      category TEXT NOT NULL,
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      notes TEXT,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      synced INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    -- ============================================================
    -- CUSTOMERS TABLE
    -- ============================================================
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      father_name TEXT,
      cnic TEXT,
      phone TEXT,
      address TEXT,
      photo_path TEXT,
      cnic_photo_path TEXT,
      witness_name TEXT,
      witness_father_name TEXT,
      witness_cnic TEXT,
      witness_phone TEXT,
      is_deleted INTEGER NOT NULL DEFAULT 0,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      synced INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    -- ============================================================
    -- SALES TABLE
    -- ============================================================
    CREATE TABLE IF NOT EXISTS sales (
      id TEXT PRIMARY KEY,
      invoice_number TEXT UNIQUE NOT NULL,
      date TEXT NOT NULL,
      customer_id TEXT NOT NULL,
      vehicle_id TEXT NOT NULL,
      vehicle_price REAL NOT NULL,
      down_payment REAL NOT NULL DEFAULT 0,
      remaining_balance REAL NOT NULL DEFAULT 0,
      payment_type TEXT NOT NULL CHECK(payment_type IN ('cash', 'installment')),
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('completed', 'active', 'cancelled')),
      notes TEXT,
      is_deleted INTEGER NOT NULL DEFAULT 0,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      synced INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (customer_id) REFERENCES customers(id),
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    -- ============================================================
    -- INSTALLMENTS TABLE
    -- ============================================================
    CREATE TABLE IF NOT EXISTS installments (
      id TEXT PRIMARY KEY,
      sale_id TEXT NOT NULL,
      installment_number INTEGER NOT NULL,
      due_date TEXT NOT NULL,
      amount REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'paid', 'overdue')),
      payment_date TEXT,
      payment_amount REAL,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      synced INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (sale_id) REFERENCES sales(id)
    );

    -- ============================================================
    -- PAYMENTS TABLE
    -- ============================================================
    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      sale_id TEXT NOT NULL,
      installment_id TEXT,
      amount REAL NOT NULL,
      payment_date TEXT NOT NULL,
      payment_method TEXT DEFAULT 'cash',
      notes TEXT,
      received_by TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      synced INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (sale_id) REFERENCES sales(id),
      FOREIGN KEY (installment_id) REFERENCES installments(id),
      FOREIGN KEY (received_by) REFERENCES users(id)
    );

    -- ============================================================
    -- SHOWROOM EXPENSES TABLE
    -- ============================================================
    CREATE TABLE IF NOT EXISTS showroom_expenses (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL,
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      description TEXT,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      synced INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    -- ============================================================
    -- INSPECTIONS TABLE
    -- ============================================================
    CREATE TABLE IF NOT EXISTS inspections (
      id TEXT PRIMARY KEY,
      vehicle_id TEXT NOT NULL,
      inspector_id TEXT NOT NULL,
      inspector_name TEXT NOT NULL,
      date TEXT NOT NULL,
      overall_score REAL NOT NULL DEFAULT 10.0,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'completed')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      synced INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id),
      FOREIGN KEY (inspector_id) REFERENCES users(id)
    );

    -- ============================================================
    -- INSPECTION ITEMS TABLE
    -- ============================================================
    CREATE TABLE IF NOT EXISTS inspection_items (
      id TEXT PRIMARY KEY,
      inspection_id TEXT NOT NULL,
      category TEXT NOT NULL,
      item_name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'good' CHECK(status IN ('good', 'fair', 'poor', 'not_applicable')),
      score_deduction REAL NOT NULL DEFAULT 0,
      notes TEXT,
      input_type TEXT NOT NULL DEFAULT 'dropdown',
      value TEXT,
      FOREIGN KEY (inspection_id) REFERENCES inspections(id) ON DELETE CASCADE
    );

    -- ============================================================
    -- DAMAGE MAP TABLE
    -- ============================================================
    CREATE TABLE IF NOT EXISTS damage_map (
      id TEXT PRIMARY KEY,
      inspection_id TEXT NOT NULL,
      panel TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'original' CHECK(status IN ('original', 'repainted', 'dented', 'replaced', 'scratched')),
      FOREIGN KEY (inspection_id) REFERENCES inspections(id) ON DELETE CASCADE
    );

    -- ============================================================
    -- INSPECTION PHOTOS TABLE
    -- ============================================================
    CREATE TABLE IF NOT EXISTS inspection_photos (
      id TEXT PRIMARY KEY,
      inspection_id TEXT NOT NULL,
      category TEXT,
      photo_path TEXT NOT NULL,
      caption TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (inspection_id) REFERENCES inspections(id) ON DELETE CASCADE
    );

    -- ============================================================
    -- AUDIT LOGS TABLE (IMMUTABLE)
    -- ============================================================
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      username TEXT NOT NULL,
      role TEXT NOT NULL,
      action_type TEXT NOT NULL,
      affected_entity TEXT NOT NULL,
      entity_id TEXT,
      old_value TEXT,
      new_value TEXT,
      timestamp TEXT NOT NULL DEFAULT (datetime('now')),
      device_info TEXT,
      ip_address TEXT
    );

    -- ============================================================
    -- SYNC TRACKING TABLE
    -- ============================================================
    CREATE TABLE IF NOT EXISTS sync_log (
      id TEXT PRIMARY KEY,
      table_name TEXT NOT NULL,
      record_id TEXT NOT NULL,
      action TEXT NOT NULL,
      synced_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- ============================================================
    -- INDEXES
    -- ============================================================
    CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
    CREATE INDEX IF NOT EXISTS idx_vehicles_make_model ON vehicles(make, model);
    CREATE INDEX IF NOT EXISTS idx_vehicle_expenses_vehicle ON vehicle_expenses(vehicle_id);
    CREATE INDEX IF NOT EXISTS idx_customers_cnic ON customers(cnic);
    CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
    CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customer_id);
    CREATE INDEX IF NOT EXISTS idx_sales_vehicle ON sales(vehicle_id);
    CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(date);
    CREATE INDEX IF NOT EXISTS idx_installments_sale ON installments(sale_id);
    CREATE INDEX IF NOT EXISTS idx_installments_status ON installments(status);
    CREATE INDEX IF NOT EXISTS idx_installments_due_date ON installments(due_date);
    CREATE INDEX IF NOT EXISTS idx_payments_sale ON payments(sale_id);
    CREATE INDEX IF NOT EXISTS idx_inspections_vehicle ON inspections(vehicle_id);
    CREATE INDEX IF NOT EXISTS idx_inspection_items_inspection ON inspection_items(inspection_id);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(affected_entity);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
    CREATE INDEX IF NOT EXISTS idx_sync_log_table ON sync_log(table_name, record_id);
  `);

  // Create default super admin if not exists
  const existingAdmin = database
    .prepare("SELECT id FROM users WHERE role = ?")
    .get("super_admin");
  if (!existingAdmin) {
    const hashedPassword = bcrypt.hashSync("admin123", 12);
    const adminId = uuidv4();
    database
      .prepare(
        `
      INSERT INTO users (id, username, password_hash, full_name, email, role, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
      )
      .run(
        adminId,
        "superadmin",
        hashedPassword,
        "Super Administrator",
        "admin@dealership.com",
        "super_admin",
        1,
      );
  }
}

export function closeDatabase(): void {
  if (db) {
    db.close();
  }
}
