import { getDatabase } from "../database/init";
import { v4 as uuidv4 } from "uuid";
import { addDays, addWeeks, format } from "date-fns";
import type {
  Sale,
  Installment,
  PaymentType,
  InstallmentPlan,
} from "../../shared/types";

export function createSale(
  userId: string,
  data: {
    customer_id: string;
    vehicle_id: string;
    vehicle_price: number;
    down_payment: number;
    payment_type: PaymentType;
    installment_plan?: {
      num_installments: number;
      frequency: "monthly" | "bi_weekly" | "weekly";
      start_date: string;
    };
    notes?: string;
  },
): Sale {
  const db = getDatabase();

  // Validate vehicle is available
  const vehicle = db
    .prepare("SELECT * FROM vehicles WHERE id = ? AND is_deleted = 0")
    .get(data.vehicle_id) as any;
  if (!vehicle) throw new Error("Vehicle not found");
  if (vehicle.status === "sold" || vehicle.status === "on_installments") {
    throw new Error("Vehicle is not available for sale");
  }

  // Validate customer
  const customer = db
    .prepare("SELECT * FROM customers WHERE id = ? AND is_deleted = 0")
    .get(data.customer_id) as any;
  if (!customer) throw new Error("Customer not found");

  const id = uuidv4();
  const remaining = data.vehicle_price - data.down_payment;

  // Generate invoice number
  const countRow = db
    .prepare("SELECT COUNT(*) as count FROM sales")
    .get() as any;
  const invoiceNumber = `INV-${String(countRow.count + 1).padStart(6, "0")}`;

  const saleDate = format(new Date(), "yyyy-MM-dd");

  const status = data.payment_type === "cash" ? "completed" : "active";
  const vehicleStatus =
    data.payment_type === "cash" ? "sold" : "on_installments";

  // Use transaction for atomicity
  const insertSale = db.transaction(() => {
    db.prepare(
      `
      INSERT INTO sales (id, invoice_number, date, customer_id, vehicle_id, vehicle_price, down_payment,
        remaining_balance, payment_type, status, notes, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    ).run(
      id,
      invoiceNumber,
      saleDate,
      data.customer_id,
      data.vehicle_id,
      data.vehicle_price,
      data.down_payment,
      remaining,
      data.payment_type,
      status,
      data.notes || "",
      userId,
    );

    // Update vehicle status
    db.prepare(
      "UPDATE vehicles SET status = ?, selling_price = ?, updated_at = datetime('now'), synced = 0 WHERE id = ?",
    ).run(vehicleStatus, data.vehicle_price, data.vehicle_id);

    // Record down payment if any
    if (data.down_payment > 0) {
      db.prepare(
        `
        INSERT INTO payments (id, sale_id, amount, payment_date, payment_method, notes, received_by)
        VALUES (?, ?, ?, ?, 'cash', 'Down Payment', ?)
      `,
      ).run(uuidv4(), id, data.down_payment, saleDate, userId);
    }

    // Generate installments if installment sale
    if (data.payment_type === "installment" && data.installment_plan) {
      const plan = data.installment_plan;
      const installmentAmount =
        Math.round((remaining / plan.num_installments) * 100) / 100;
      let startDate = new Date(plan.start_date);

      for (let i = 1; i <= plan.num_installments; i++) {
        let dueDate: Date;
        switch (plan.frequency) {
          case "weekly":
            dueDate = addWeeks(startDate, i - 1);
            break;
          case "bi_weekly":
            dueDate = addWeeks(startDate, (i - 1) * 2);
            break;
          case "monthly":
          default:
            dueDate = addDays(startDate, (i - 1) * 30);
            break;
        }

        // Adjust last installment for rounding
        const amount =
          i === plan.num_installments
            ? remaining - installmentAmount * (plan.num_installments - 1)
            : installmentAmount;

        db.prepare(
          `
          INSERT INTO installments (id, sale_id, installment_number, due_date, amount, status)
          VALUES (?, ?, ?, ?, ?, 'pending')
        `,
        ).run(uuidv4(), id, i, format(dueDate, "yyyy-MM-dd"), amount);
      }
    }

    // Audit log
    const user = db
      .prepare("SELECT username, role FROM users WHERE id = ?")
      .get(userId) as any;
    db.prepare(
      `
      INSERT INTO audit_logs (id, user_id, username, role, action_type, affected_entity, entity_id, new_value, timestamp)
      VALUES (?, ?, ?, ?, 'create', 'sales', ?, ?, datetime('now'))
    `,
    ).run(
      uuidv4(),
      userId,
      user?.username || "",
      user?.role || "",
      id,
      JSON.stringify({
        invoice_number: invoiceNumber,
        customer: customer.name,
        vehicle: `${vehicle.make} ${vehicle.model}`,
      }),
    );
  });

  insertSale();
  return getSaleById(id)!;
}

export function getSales(filters?: {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
}): { data: Sale[]; total: number } {
  const db = getDatabase();
  let whereClause = "WHERE s.is_deleted = 0";
  const params: any[] = [];

  if (filters?.status) {
    whereClause += " AND s.status = ?";
    params.push(filters.status);
  }

  if (filters?.search) {
    whereClause +=
      " AND (s.invoice_number LIKE ? OR c.name LIKE ? OR v.make LIKE ? OR v.model LIKE ?)";
    const s = `%${filters.search}%`;
    params.push(s, s, s, s);
  }

  if (filters?.startDate) {
    whereClause += " AND s.date >= ?";
    params.push(filters.startDate);
  }

  if (filters?.endDate) {
    whereClause += " AND s.date <= ?";
    params.push(filters.endDate);
  }

  const countRow = db
    .prepare(
      `
    SELECT COUNT(*) as count FROM sales s
    LEFT JOIN customers c ON s.customer_id = c.id
    LEFT JOIN vehicles v ON s.vehicle_id = v.id
    ${whereClause}
  `,
    )
    .get(...params) as any;

  const page = filters?.page || 1;
  const limit = filters?.limit || 50;
  const offset = (page - 1) * limit;

  const rows = db
    .prepare(
      `
    SELECT s.*, c.name as customer_name, c.cnic as customer_cnic, c.phone as customer_phone,
      v.make, v.model, v.year, v.registration_number, v.color
    FROM sales s
    LEFT JOIN customers c ON s.customer_id = c.id
    LEFT JOIN vehicles v ON s.vehicle_id = v.id
    ${whereClause} ORDER BY s.created_at DESC LIMIT ? OFFSET ?
  `,
    )
    .all(...params, limit, offset) as any[];

  return {
    data: rows.map(mapSaleRow),
    total: countRow.count,
  };
}

export function getSaleById(id: string): Sale | null {
  const db = getDatabase();
  const row = db
    .prepare(
      `
    SELECT s.*, c.name as customer_name, c.cnic as customer_cnic, c.phone as customer_phone,
      c.father_name as customer_father_name, c.address as customer_address,
      v.make, v.model, v.year, v.registration_number, v.chassis_number, v.engine_number, v.color
    FROM sales s
    LEFT JOIN customers c ON s.customer_id = c.id
    LEFT JOIN vehicles v ON s.vehicle_id = v.id
    WHERE s.id = ?
  `,
    )
    .get(id) as any;
  return row ? mapSaleRow(row) : null;
}

export function getInstallmentsBySale(saleId: string): Installment[] {
  const db = getDatabase();
  const rows = db
    .prepare(
      "SELECT * FROM installments WHERE sale_id = ? ORDER BY installment_number",
    )
    .all(saleId) as any[];
  return rows.map((row) => ({
    id: row.id,
    sale_id: row.sale_id,
    installment_number: row.installment_number,
    due_date: row.due_date,
    amount: row.amount,
    status: row.status,
    payment_date: row.payment_date,
    payment_amount: row.payment_amount,
    notes: row.notes,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));
}

export function recordInstallmentPayment(
  userId: string,
  installmentId: string,
  data: { amount: number; payment_date: string; notes?: string },
): Installment {
  const db = getDatabase();
  const installment = db
    .prepare("SELECT * FROM installments WHERE id = ?")
    .get(installmentId) as any;
  if (!installment) throw new Error("Installment not found");

  const sale = db
    .prepare("SELECT * FROM sales WHERE id = ?")
    .get(installment.sale_id) as any;
  if (!sale) throw new Error("Sale not found");

  const payInstallment = db.transaction(() => {
    // Update installment
    db.prepare(
      `
      UPDATE installments SET status = 'paid', payment_date = ?, payment_amount = ?, notes = ?,
        updated_at = datetime('now'), synced = 0
      WHERE id = ?
    `,
    ).run(data.payment_date, data.amount, data.notes || "", installmentId);

    // Record payment
    db.prepare(
      `
      INSERT INTO payments (id, sale_id, installment_id, amount, payment_date, payment_method, notes, received_by)
      VALUES (?, ?, ?, ?, ?, 'cash', ?, ?)
    `,
    ).run(
      uuidv4(),
      installment.sale_id,
      installmentId,
      data.amount,
      data.payment_date,
      data.notes || "",
      userId,
    );

    // Update sale remaining balance
    const newRemaining = sale.remaining_balance - data.amount;
    db.prepare(
      "UPDATE sales SET remaining_balance = ?, updated_at = datetime('now'), synced = 0 WHERE id = ?",
    ).run(Math.max(0, newRemaining), installment.sale_id);

    // Check if all installments are paid
    const pendingCount = db
      .prepare(
        "SELECT COUNT(*) as c FROM installments WHERE sale_id = ? AND status != ?",
      )
      .get(installment.sale_id, "paid") as any;

    if (pendingCount.c <= 1) {
      // current one is about to be paid
      db.prepare(
        "UPDATE sales SET status = ?, updated_at = datetime('now') WHERE id = ?",
      ).run("completed", installment.sale_id);
      db.prepare(
        "UPDATE vehicles SET status = ?, updated_at = datetime('now') WHERE id = ?",
      ).run("sold", sale.vehicle_id);
    }

    const user = db
      .prepare("SELECT username, role FROM users WHERE id = ?")
      .get(userId) as any;
    db.prepare(
      `
      INSERT INTO audit_logs (id, user_id, username, role, action_type, affected_entity, entity_id, new_value, timestamp)
      VALUES (?, ?, ?, ?, 'payment', 'installments', ?, ?, datetime('now'))
    `,
    ).run(
      uuidv4(),
      userId,
      user?.username || "",
      user?.role || "",
      installmentId,
      JSON.stringify({ amount: data.amount, sale_id: installment.sale_id }),
    );
  });

  payInstallment();

  return db
    .prepare("SELECT * FROM installments WHERE id = ?")
    .get(installmentId) as Installment;
}

export function getOverdueInstallments(): Installment[] {
  const db = getDatabase();
  const today = format(new Date(), "yyyy-MM-dd");
  const rows = db
    .prepare(
      `
    SELECT i.*, s.invoice_number, c.name as customer_name, c.phone as customer_phone
    FROM installments i
    JOIN sales s ON i.sale_id = s.id
    JOIN customers c ON s.customer_id = c.id
    WHERE i.status = 'pending' AND i.due_date < ?
    ORDER BY i.due_date
  `,
    )
    .all(today) as any[];

  // Update status to overdue
  for (const row of rows) {
    if (row.status === "pending") {
      db.prepare("UPDATE installments SET status = ? WHERE id = ?").run(
        "overdue",
        row.id,
      );
    }
  }

  return rows;
}

export function getCustomerLedger(customerId: string): {
  sales: Sale[];
  payments: any[];
  totalPaid: number;
  totalPending: number;
} {
  const db = getDatabase();

  const sales = db
    .prepare(
      `
    SELECT s.*, v.make, v.model, v.year, v.registration_number
    FROM sales s
    JOIN vehicles v ON s.vehicle_id = v.id
    WHERE s.customer_id = ? AND s.is_deleted = 0
    ORDER BY s.date DESC
  `,
    )
    .all(customerId) as any[];

  const payments = db
    .prepare(
      `
    SELECT p.*, s.invoice_number
    FROM payments p
    JOIN sales s ON p.sale_id = s.id
    WHERE s.customer_id = ?
    ORDER BY p.payment_date DESC
  `,
    )
    .all(customerId) as any[];

  const totalPaid = payments.reduce((sum: number, p: any) => sum + p.amount, 0);
  const totalPending = sales.reduce(
    (sum: number, s: any) => sum + s.remaining_balance,
    0,
  );

  return { sales, payments, totalPaid, totalPending };
}

function mapSaleRow(row: any): Sale {
  return {
    id: row.id,
    invoice_number: row.invoice_number,
    date: row.date,
    customer_id: row.customer_id,
    vehicle_id: row.vehicle_id,
    vehicle_price: row.vehicle_price,
    down_payment: row.down_payment,
    remaining_balance: row.remaining_balance,
    payment_type: row.payment_type,
    status: row.status,
    notes: row.notes,
    created_by: row.created_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
    customer: row.customer_name
      ? {
          id: row.customer_id,
          name: row.customer_name,
          father_name: row.customer_father_name || "",
          cnic: row.customer_cnic || "",
          phone: row.customer_phone || "",
          address: row.customer_address || "",
          created_by: "",
          created_at: "",
          updated_at: "",
        }
      : undefined,
    vehicle: row.make
      ? {
          id: row.vehicle_id,
          registration_number: row.registration_number || "",
          chassis_number: row.chassis_number || "",
          engine_number: row.engine_number || "",
          make: row.make,
          model: row.model,
          year: row.year,
          color: row.color || "",
          assembly_country: "",
          key_available: true,
          status: "sold",
          purchase_price: 0,
          purchase_date: "",
          seller_name: "",
          seller_cnic: "",
          seller_phone: "",
          total_expenses: 0,
          total_cost: 0,
          created_by: "",
          created_at: "",
          updated_at: "",
        }
      : undefined,
  };
}
