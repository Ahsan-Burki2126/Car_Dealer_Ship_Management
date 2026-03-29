import { getDatabase } from "../database/init";
import { v4 as uuidv4 } from "uuid";
import { addDays, addMonths, addWeeks, addYears, format } from "date-fns";
import type {
  Sale,
  Installment,
  PaymentType,
  CashPaymentMethod,
  InstallmentDurationType,
  InstallmentScheduleItem,
} from "../../shared/types";

interface CreateSaleData {
  customer_id: string;
  vehicle_id: string;
  vehicle_price?: number;
  sale_price?: number;
  down_payment?: number;
  payment_type: PaymentType;
  cash_payment_method?: CashPaymentMethod;
  bank_account_id?: string;
  installment_count?: number;
  installment_frequency?: InstallmentDurationType;
  installment_duration_type?: InstallmentDurationType;
  installment_start_date?: string;
  installment_schedule?: Array<{
    installment_number?: number;
    due_date: string;
    amount: number;
  }>;
  witness_required?: boolean;
  witness?: {
    name?: string;
    father_name?: string;
    cnic?: string;
    phone?: string;
    cnic_photo_path?: string;
    cnic_photo_back_path?: string;
  };
  notes?: string;
}

interface InstallmentRow {
  id: string;
  sale_id: string;
  installment_number: number;
  due_date: string;
  amount: number;
  status: "pending" | "paid" | "overdue";
  payment_date: string | null;
  payment_amount: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function createSale(userId: string, data: CreateSaleData): Sale {
  const db = getDatabase();
  const paymentType = data.payment_type;
  const vehiclePrice = data.vehicle_price ?? data.sale_price ?? 0;
  const requestedDownPayment = data.down_payment ?? 0;
  const cashPaymentMethod = data.cash_payment_method ?? "hard_cash";
  const durationType = normalizeDurationType(
    data.installment_duration_type || data.installment_frequency || "months",
  );
  const downPayment =
    paymentType === "cash" ? vehiclePrice : requestedDownPayment;

  const vehicle = db
    .prepare("SELECT * FROM vehicles WHERE id = ? AND is_deleted = 0")
    .get(data.vehicle_id) as
    | {
        id: string;
        status: string;
        make: string;
        model: string;
      }
    | undefined;
  if (!vehicle) throw new Error("Vehicle not found");
  if (vehicle.status === "sold" || vehicle.status === "on_installments") {
    throw new Error("Vehicle is not available for sale");
  }

  const customer = db
    .prepare("SELECT * FROM customers WHERE id = ? AND is_deleted = 0")
    .get(data.customer_id) as { id: string; name: string } | undefined;
  if (!customer) throw new Error("Customer not found");
  if (vehiclePrice <= 0) throw new Error("Sale price must be greater than zero");
  if (downPayment < 0) throw new Error("Down payment cannot be negative");
  if (downPayment > vehiclePrice) {
    throw new Error("Down payment cannot exceed sale price");
  }

  if (paymentType === "cash" && cashPaymentMethod === "bank_transfer") {
    if (!data.bank_account_id) {
      throw new Error("Bank account is required for bank transfer");
    }
  }

  if (data.bank_account_id) {
    const bankAccount = db
      .prepare("SELECT id FROM bank_accounts WHERE id = ? AND is_active = 1")
      .get(data.bank_account_id);
    if (!bankAccount) throw new Error("Invalid bank account selected");
  }

  const id = uuidv4();
  const remaining = round2(
    paymentType === "cash" ? 0 : vehiclePrice - downPayment,
  );

  const countRow = db
    .prepare("SELECT COUNT(*) as count FROM sales")
    .get() as { count: number };
  const invoiceNumber = `INV-${String(countRow.count + 1).padStart(6, "0")}`;
  const saleDate = format(new Date(), "yyyy-MM-dd");
  const saleStatus = paymentType === "cash" ? "completed" : "active";
  const vehicleStatus = paymentType === "cash" ? "sold" : "on_installments";

  const installmentSchedule =
    paymentType === "installment"
      ? resolveInstallmentSchedule(
          remaining,
          durationType,
          data.installment_count || 12,
          data.installment_start_date || saleDate,
          data.installment_schedule,
        )
      : [];

  const totalInstallmentAmount = round2(
    installmentSchedule.reduce((sum, item) => sum + item.amount, 0),
  );
  if (
    paymentType === "installment" &&
    Math.abs(totalInstallmentAmount - remaining) > 1
  ) {
    throw new Error("Installment amounts must match remaining balance");
  }

  const insertSale = db.transaction(() => {
    db.prepare(
      `
      INSERT INTO sales (
        id, invoice_number, date, customer_id, vehicle_id, vehicle_price, down_payment,
        remaining_balance, payment_type, installment_count, installment_frequency,
        installment_duration_type, installment_schedule_json, cash_payment_method, bank_account_id,
        status, notes, created_by
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    ).run(
      id,
      invoiceNumber,
      saleDate,
      data.customer_id,
      data.vehicle_id,
      vehiclePrice,
      downPayment,
      remaining,
      paymentType,
      installmentSchedule.length,
      durationType,
      durationType,
      JSON.stringify(installmentSchedule),
      cashPaymentMethod,
      data.bank_account_id || null,
      saleStatus,
      data.notes || "",
      userId,
    );

    db.prepare(
      "UPDATE vehicles SET status = ?, selling_price = ?, updated_at = datetime('now'), synced = 0 WHERE id = ?",
    ).run(vehicleStatus, vehiclePrice, data.vehicle_id);

    if (data.witness_required && data.witness) {
      db.prepare(
        `
        UPDATE customers
        SET witness_name = ?, witness_father_name = ?, witness_cnic = ?, witness_phone = ?,
            witness_cnic_photo_path = ?, witness_cnic_photo_back_path = ?,
            updated_at = datetime('now'), synced = 0
        WHERE id = ?
      `,
      ).run(
        data.witness.name || "",
        data.witness.father_name || "",
        data.witness.cnic || "",
        data.witness.phone || "",
        data.witness.cnic_photo_path || "",
        data.witness.cnic_photo_back_path || "",
        data.customer_id,
      );
    }

    const user = db
      .prepare("SELECT username, role FROM users WHERE id = ?")
      .get(userId) as { username: string; role: string } | undefined;

    if (downPayment > 0) {
      const paymentId = uuidv4();
      db.prepare(
        `
        INSERT INTO payments (id, sale_id, amount, payment_date, payment_method, bank_account_id, notes, received_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      ).run(
        paymentId,
        id,
        downPayment,
        saleDate,
        cashPaymentMethod,
        cashPaymentMethod === "bank_transfer" ? data.bank_account_id : null,
        paymentType === "cash" ? "Full Payment" : "Down Payment",
        userId,
      );

      db.prepare(
        `
        INSERT INTO audit_logs (id, user_id, username, role, action_type, affected_entity, entity_id, new_value, timestamp)
        VALUES (?, ?, ?, ?, 'payment', 'payments', ?, ?, datetime('now'))
      `,
      ).run(
        uuidv4(),
        userId,
        user?.username || "",
        user?.role || "",
        paymentId,
        JSON.stringify({ sale_id: id, amount: downPayment }),
      );
    }

    if (paymentType === "installment") {
      const insertInstallment = db.prepare(
        `
        INSERT INTO installments (id, sale_id, installment_number, due_date, amount, status)
        VALUES (?, ?, ?, ?, ?, 'pending')
      `,
      );

      installmentSchedule.forEach((installment) => {
        insertInstallment.run(
          uuidv4(),
          id,
          installment.installment_number,
          installment.due_date,
          installment.amount,
        );
      });
    }

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
        payment_type: paymentType,
      }),
    );
  });

  insertSale();
  return getSaleById(id)!;
}

export function updateSale(
  userId: string,
  saleId: string,
  data: Partial<CreateSaleData>,
): Sale {
  const db = getDatabase();
  const existing = db
    .prepare("SELECT * FROM sales WHERE id = ? AND is_deleted = 0")
    .get(saleId) as
    | {
        id: string;
        customer_id: string;
        vehicle_id: string;
        vehicle_price: number;
        down_payment: number;
        remaining_balance: number;
        payment_type: PaymentType;
        installment_count: number;
        installment_frequency: string | null;
        installment_duration_type: string | null;
        installment_schedule_json: string | null;
        cash_payment_method: CashPaymentMethod | null;
        bank_account_id: string | null;
        status: string;
        notes: string | null;
        date: string;
      }
    | undefined;
  if (!existing) {
    throw new Error("Sale not found");
  }

  const customerId = data.customer_id ?? existing.customer_id;
  const vehicleId = data.vehicle_id ?? existing.vehicle_id;
  const paymentType = data.payment_type ?? existing.payment_type;
  const vehiclePrice = data.vehicle_price ?? data.sale_price ?? existing.vehicle_price;
  const requestedDownPayment = data.down_payment ?? existing.down_payment;
  const downPayment =
    paymentType === "cash" ? vehiclePrice : requestedDownPayment;
  const cashPaymentMethod =
    data.cash_payment_method ??
    existing.cash_payment_method ??
    ("hard_cash" as CashPaymentMethod);
  const bankAccountId =
    data.bank_account_id !== undefined
      ? data.bank_account_id || null
      : existing.bank_account_id;
  const durationType = normalizeDurationType(
    data.installment_duration_type ||
      data.installment_frequency ||
      existing.installment_duration_type ||
      existing.installment_frequency ||
      "months",
  );

  const customer = db
    .prepare("SELECT id, name FROM customers WHERE id = ? AND is_deleted = 0")
    .get(customerId) as { id: string; name: string } | undefined;
  if (!customer) throw new Error("Customer not found");

  const vehicle = db
    .prepare("SELECT id, status, make, model FROM vehicles WHERE id = ? AND is_deleted = 0")
    .get(vehicleId) as
    | { id: string; status: string; make: string; model: string }
    | undefined;
  if (!vehicle) throw new Error("Vehicle not found");
  if (
    vehicleId !== existing.vehicle_id &&
    (vehicle.status === "sold" || vehicle.status === "on_installments")
  ) {
    throw new Error("Selected vehicle is not available for sale");
  }

  if (vehiclePrice <= 0) throw new Error("Sale price must be greater than zero");
  if (downPayment < 0) throw new Error("Down payment cannot be negative");
  if (downPayment > vehiclePrice) {
    throw new Error("Down payment cannot exceed sale price");
  }

  if (paymentType === "cash" && cashPaymentMethod === "bank_transfer" && !bankAccountId) {
    throw new Error("Bank account is required for bank transfer");
  }

  if (bankAccountId) {
    const bankAccount = db
      .prepare("SELECT id FROM bank_accounts WHERE id = ? AND is_active = 1")
      .get(bankAccountId);
    if (!bankAccount) throw new Error("Invalid bank account selected");
  }

  const paymentsCount = db
    .prepare("SELECT COUNT(*) as count FROM payments WHERE sale_id = ?")
    .get(saleId) as { count: number };
  const paidInstallmentsCount = db
    .prepare(
      "SELECT COUNT(*) as count FROM installments WHERE sale_id = ? AND status = 'paid'",
    )
    .get(saleId) as { count: number };
  const financialChanged =
    vehicleId !== existing.vehicle_id ||
    round2(vehiclePrice) !== round2(existing.vehicle_price) ||
    round2(downPayment) !== round2(existing.down_payment) ||
    paymentType !== existing.payment_type;

  if ((paymentsCount.count > 0 || paidInstallmentsCount.count > 0) && financialChanged) {
    throw new Error(
      "Cannot change sale amount, vehicle, or payment type after payments exist.",
    );
  }

  const canRebuildFinancials =
    paymentsCount.count === 0 && paidInstallmentsCount.count === 0;
  const remaining = round2(
    paymentType === "cash"
      ? 0
      : canRebuildFinancials
        ? vehiclePrice - downPayment
        : existing.remaining_balance,
  );

  const installmentSchedule =
    paymentType === "installment"
      ? canRebuildFinancials
        ? resolveInstallmentSchedule(
            remaining,
            durationType,
            data.installment_count || existing.installment_count || 12,
            data.installment_start_date || existing.date,
            data.installment_schedule,
          )
        : parseInstallmentSchedule(existing.installment_schedule_json)
      : [];

  if (paymentType === "installment") {
    const totalInstallmentAmount = round2(
      installmentSchedule.reduce((sum, item) => sum + item.amount, 0),
    );
    if (Math.abs(totalInstallmentAmount - remaining) > 1) {
      throw new Error("Installment amounts must match remaining balance");
    }
  }

  const saleStatus =
    paymentType === "cash"
      ? "completed"
      : remaining <= 0.01
        ? "completed"
        : "active";
  const vehicleStatus = paymentType === "cash" ? "sold" : "on_installments";

  const user = db
    .prepare("SELECT username, role FROM users WHERE id = ?")
    .get(userId) as { username: string; role: string } | undefined;

  const tx = db.transaction(() => {
    if (vehicleId !== existing.vehicle_id) {
      db.prepare(
        "UPDATE vehicles SET status = 'in_stock', selling_price = NULL, updated_at = datetime('now'), synced = 0 WHERE id = ?",
      ).run(existing.vehicle_id);
    }

    db.prepare(
      "UPDATE vehicles SET status = ?, selling_price = ?, updated_at = datetime('now'), synced = 0 WHERE id = ?",
    ).run(vehicleStatus, vehiclePrice, vehicleId);

    db.prepare(
      `
      UPDATE sales
      SET customer_id = ?, vehicle_id = ?, vehicle_price = ?, down_payment = ?, remaining_balance = ?,
          payment_type = ?, installment_count = ?, installment_frequency = ?, installment_duration_type = ?,
          installment_schedule_json = ?, cash_payment_method = ?, bank_account_id = ?, status = ?, notes = ?,
          updated_at = datetime('now'), synced = 0
      WHERE id = ?
    `,
    ).run(
      customerId,
      vehicleId,
      vehiclePrice,
      downPayment,
      remaining,
      paymentType,
      installmentSchedule.length,
      durationType,
      durationType,
      JSON.stringify(installmentSchedule),
      cashPaymentMethod,
      bankAccountId,
      saleStatus,
      data.notes !== undefined ? data.notes : existing.notes || "",
      saleId,
    );

    if (canRebuildFinancials) {
      db.prepare("DELETE FROM payments WHERE sale_id = ?").run(saleId);
      db.prepare("DELETE FROM installments WHERE sale_id = ?").run(saleId);

      if (downPayment > 0) {
        const paymentId = uuidv4();
        db.prepare(
          `
          INSERT INTO payments (id, sale_id, amount, payment_date, payment_method, bank_account_id, notes, received_by)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        ).run(
          paymentId,
          saleId,
          downPayment,
          format(new Date(), "yyyy-MM-dd"),
          cashPaymentMethod,
          cashPaymentMethod === "bank_transfer" ? bankAccountId : null,
          paymentType === "cash" ? "Full Payment" : "Down Payment",
          userId,
        );

        db.prepare(
          `
          INSERT INTO audit_logs (id, user_id, username, role, action_type, affected_entity, entity_id, new_value, timestamp)
          VALUES (?, ?, ?, ?, 'payment', 'payments', ?, ?, datetime('now'))
        `,
        ).run(
          uuidv4(),
          userId,
          user?.username || "",
          user?.role || "",
          paymentId,
          JSON.stringify({ sale_id: saleId, amount: downPayment }),
        );
      }

      if (paymentType === "installment") {
        const insertInstallment = db.prepare(
          `
          INSERT INTO installments (id, sale_id, installment_number, due_date, amount, status)
          VALUES (?, ?, ?, ?, ?, 'pending')
        `,
        );
        for (const installment of installmentSchedule) {
          insertInstallment.run(
            uuidv4(),
            saleId,
            installment.installment_number,
            installment.due_date,
            installment.amount,
          );
        }
      }
    }

    if (data.witness_required === false) {
      db.prepare(
        `
        UPDATE customers
        SET witness_name = '', witness_father_name = '', witness_cnic = '', witness_phone = '',
            witness_cnic_photo_path = '', witness_cnic_photo_back_path = '',
            updated_at = datetime('now'), synced = 0
        WHERE id = ?
      `,
      ).run(customerId);
    } else if (data.witness_required && data.witness) {
      db.prepare(
        `
        UPDATE customers
        SET witness_name = ?, witness_father_name = ?, witness_cnic = ?, witness_phone = ?,
            witness_cnic_photo_path = ?, witness_cnic_photo_back_path = ?,
            updated_at = datetime('now'), synced = 0
        WHERE id = ?
      `,
      ).run(
        data.witness.name || "",
        data.witness.father_name || "",
        data.witness.cnic || "",
        data.witness.phone || "",
        data.witness.cnic_photo_path || "",
        data.witness.cnic_photo_back_path || "",
        customerId,
      );
    }

    db.prepare(
      `
      INSERT INTO audit_logs (id, user_id, username, role, action_type, affected_entity, entity_id, old_value, new_value, timestamp)
      VALUES (?, ?, ?, ?, 'update', 'sales', ?, ?, ?, datetime('now'))
    `,
    ).run(
      uuidv4(),
      userId,
      user?.username || "",
      user?.role || "",
      saleId,
      JSON.stringify({
        customer_id: existing.customer_id,
        vehicle_id: existing.vehicle_id,
        vehicle_price: existing.vehicle_price,
        payment_type: existing.payment_type,
      }),
      JSON.stringify({
        customer_id: customerId,
        vehicle_id: vehicleId,
        vehicle_price: vehiclePrice,
        payment_type: paymentType,
      }),
    );
  });

  tx();
  return getSaleById(saleId)!;
}

export function deleteSale(
  userId: string,
  saleId: string,
  forceWithInstallments = false,
): void {
  const db = getDatabase();
  const sale = db
    .prepare("SELECT id, vehicle_id, is_deleted FROM sales WHERE id = ?")
    .get(saleId) as
    | { id: string; vehicle_id: string; is_deleted: number }
    | undefined;
  if (!sale || sale.is_deleted) {
    throw new Error("Sale not found");
  }

  const user = db
    .prepare("SELECT username, role FROM users WHERE id = ?")
    .get(userId) as { username: string; role: string } | undefined;
  if (!user) {
    throw new Error("Unauthorized user");
  }

  const installmentCount = db
    .prepare("SELECT COUNT(*) as count FROM installments WHERE sale_id = ?")
    .get(saleId) as { count: number };

  if (installmentCount.count > 0) {
    if (user.role !== "super_admin") {
      throw new Error(
        "Only Super Admin can delete sales with existing installments",
      );
    }
    if (!forceWithInstallments) {
      throw new Error(
        "Super Admin confirmation is required to delete a sale with installments",
      );
    }
  }

  const tx = db.transaction(() => {
    db.prepare("DELETE FROM payments WHERE sale_id = ?").run(saleId);
    db.prepare("DELETE FROM installments WHERE sale_id = ?").run(saleId);
    db.prepare(
      "UPDATE sales SET is_deleted = 1, status = 'cancelled', updated_at = datetime('now'), synced = 0 WHERE id = ?",
    ).run(saleId);
    db.prepare(
      "UPDATE vehicles SET status = 'in_stock', selling_price = NULL, updated_at = datetime('now'), synced = 0 WHERE id = ?",
    ).run(sale.vehicle_id);
    db.prepare(
      `
      INSERT INTO audit_logs (id, user_id, username, role, action_type, affected_entity, entity_id, timestamp)
      VALUES (?, ?, ?, ?, 'delete', 'sales', ?, datetime('now'))
    `,
    ).run(uuidv4(), userId, user.username, user.role, saleId);
  });

  tx();
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
  const params: Array<string | number> = [];

  if (filters?.status) {
    whereClause += " AND s.status = ?";
    params.push(filters.status);
  }

  if (filters?.search) {
    whereClause +=
      " AND (s.invoice_number LIKE ? OR c.name LIKE ? OR v.make LIKE ? OR v.model LIKE ?)";
    const searchTerm = `%${filters.search}%`;
    params.push(searchTerm, searchTerm, searchTerm, searchTerm);
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
      SELECT COUNT(*) as count
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      LEFT JOIN vehicles v ON s.vehicle_id = v.id
      ${whereClause}
    `,
    )
    .get(...params) as { count: number };

  const page = filters?.page || 1;
  const limit = filters?.limit || 50;
  const offset = (page - 1) * limit;

  const rows = db
    .prepare(
      `
      SELECT s.*, c.name as customer_name, c.cnic as customer_cnic, c.phone as customer_phone,
        v.make, v.model, v.year, v.registration_number, v.color,
        v.purchase_price, v.total_cost,
        ba.name as bank_account_name,
        COALESCE((SELECT SUM(amount) FROM payments p WHERE p.sale_id = s.id), 0) as total_paid,
        (v.year || ' ' || v.make || ' ' || v.model) as vehicle_name
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      LEFT JOIN vehicles v ON s.vehicle_id = v.id
      LEFT JOIN bank_accounts ba ON ba.id = s.bank_account_id
      ${whereClause}
      ORDER BY s.created_at DESC
      LIMIT ? OFFSET ?
    `,
    )
    .all(...params, limit, offset) as Record<string, unknown>[];

  return { data: rows.map(mapSaleRow), total: countRow.count };
}

export function getSaleById(id: string): Sale | null {
  const db = getDatabase();
  const row = db
    .prepare(
      `
      SELECT s.*, c.name as customer_name, c.cnic as customer_cnic, c.phone as customer_phone,
        c.father_name as customer_father_name, c.address as customer_address,
        c.witness_name, c.witness_father_name, c.witness_cnic, c.witness_phone,
        c.witness_cnic_photo_path, c.witness_cnic_photo_back_path,
        v.make, v.model, v.year, v.registration_number, v.chassis_number, v.engine_number, v.color,
        ba.name as bank_account_name,
        COALESCE((SELECT SUM(amount) FROM payments p WHERE p.sale_id = s.id), 0) as total_paid,
        (SELECT COUNT(*) FROM installments i WHERE i.sale_id = s.id) as installment_count,
        (v.year || ' ' || v.make || ' ' || v.model) as vehicle_name
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      LEFT JOIN vehicles v ON s.vehicle_id = v.id
      LEFT JOIN bank_accounts ba ON ba.id = s.bank_account_id
      WHERE s.id = ? AND s.is_deleted = 0
    `,
    )
    .get(id) as Record<string, unknown> | undefined;
  return row ? mapSaleRow(row) : null;
}

export function getInstallmentsBySale(saleId: string): Installment[] {
  const db = getDatabase();
  const rows = db
    .prepare(
      "SELECT * FROM installments WHERE sale_id = ? ORDER BY installment_number",
    )
    .all(saleId) as InstallmentRow[];
  return rows.map((row) => ({
    id: row.id,
    sale_id: row.sale_id,
    installment_number: row.installment_number,
    due_date: row.due_date,
    amount: row.amount,
    status: row.status,
    payment_date: row.payment_date || undefined,
    paid_date: row.payment_date || undefined,
    payment_amount: row.payment_amount || undefined,
    paid_amount: row.payment_amount || 0,
    notes: row.notes || undefined,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));
}

export function recordInstallmentPayment(
  userId: string,
  installmentId: string,
  data: {
    amount: number;
    payment_date: string;
    payment_method?: CashPaymentMethod;
    bank_account_id?: string;
    notes?: string;
  },
): Installment {
  const db = getDatabase();
  const installment = db
    .prepare("SELECT * FROM installments WHERE id = ?")
    .get(installmentId) as InstallmentRow | undefined;
  if (!installment) throw new Error("Installment not found");

  if (data.amount <= 0) throw new Error("Payment amount must be greater than 0");

  const alreadyPaid = installment.payment_amount || 0;
  const remainingForInstallment = round2(installment.amount - alreadyPaid);
  if (data.amount > remainingForInstallment + 0.01) {
    throw new Error("Payment amount exceeds remaining installment amount");
  }

  const sale = db
    .prepare("SELECT * FROM sales WHERE id = ? AND is_deleted = 0")
    .get(installment.sale_id) as
    | {
        id: string;
        vehicle_id: string;
        remaining_balance: number;
      }
    | undefined;
  if (!sale) throw new Error("Sale not found");

  if (data.payment_method === "bank_transfer" && !data.bank_account_id) {
    throw new Error("Bank account is required for bank transfer");
  }

  if (data.bank_account_id) {
    const bankAccount = db
      .prepare("SELECT id FROM bank_accounts WHERE id = ? AND is_active = 1")
      .get(data.bank_account_id);
    if (!bankAccount) throw new Error("Invalid bank account selected");
  }

  const payInstallment = db.transaction(() => {
    const newPaidAmount = round2(alreadyPaid + data.amount);
    const paidInFull = newPaidAmount >= installment.amount - 0.01;
    const today = format(new Date(), "yyyy-MM-dd");
    const nextStatus = paidInFull
      ? "paid"
      : installment.due_date < today
        ? "overdue"
        : "pending";

    db.prepare(
      `
      UPDATE installments
      SET status = ?, payment_date = ?, payment_amount = ?, notes = ?, updated_at = datetime('now'), synced = 0
      WHERE id = ?
    `,
    ).run(
      nextStatus,
      data.payment_date,
      newPaidAmount,
      data.notes || installment.notes || "",
      installmentId,
    );

    db.prepare(
      `
      INSERT INTO payments (id, sale_id, installment_id, amount, payment_date, payment_method, bank_account_id, notes, received_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    ).run(
      uuidv4(),
      installment.sale_id,
      installmentId,
      data.amount,
      data.payment_date,
      data.payment_method || "hard_cash",
      data.payment_method === "bank_transfer" ? data.bank_account_id : null,
      data.notes || "",
      userId,
    );

    const newRemaining = round2(sale.remaining_balance - data.amount);
    db.prepare(
      "UPDATE sales SET remaining_balance = ?, updated_at = datetime('now'), synced = 0 WHERE id = ?",
    ).run(Math.max(0, newRemaining), installment.sale_id);

    const pendingCount = db
      .prepare(
        "SELECT COUNT(*) as count FROM installments WHERE sale_id = ? AND status != 'paid'",
      )
      .get(installment.sale_id) as { count: number };

    if (pendingCount.count === 0 && newRemaining <= 0.01) {
      db.prepare(
        "UPDATE sales SET status = 'completed', final_payment_date = ?, updated_at = datetime('now') WHERE id = ?",
      ).run(data.payment_date, installment.sale_id);
      db.prepare(
        "UPDATE vehicles SET status = 'sold', updated_at = datetime('now') WHERE id = ?",
      ).run(sale.vehicle_id);
    }

    const user = db
      .prepare("SELECT username, role FROM users WHERE id = ?")
      .get(userId) as { username: string; role: string } | undefined;
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

  const updated = db
    .prepare("SELECT * FROM installments WHERE id = ?")
    .get(installmentId) as InstallmentRow;

  return {
    id: updated.id,
    sale_id: updated.sale_id,
    installment_number: updated.installment_number,
    due_date: updated.due_date,
    amount: updated.amount,
    status: updated.status,
    payment_date: updated.payment_date || undefined,
    payment_amount: updated.payment_amount || undefined,
    notes: updated.notes || undefined,
    created_at: updated.created_at,
    updated_at: updated.updated_at,
  };
}

export function getOverdueInstallments(): Installment[] {
  const db = getDatabase();
  const today = format(new Date(), "yyyy-MM-dd");

  db.prepare(
    `
    UPDATE installments
    SET status = 'overdue', updated_at = datetime('now')
    WHERE status = 'pending' AND due_date < ?
  `,
  ).run(today);

  const rows = db
    .prepare(
      `
      SELECT i.*, s.invoice_number, s.id as sale_id, c.name as customer_name, c.phone as customer_phone,
        (v.year || ' ' || v.make || ' ' || v.model) as vehicle_name,
        CAST(julianday(?) - julianday(i.due_date) AS INTEGER) as days_overdue
      FROM installments i
      JOIN sales s ON i.sale_id = s.id
      JOIN customers c ON s.customer_id = c.id
      LEFT JOIN vehicles v ON s.vehicle_id = v.id
      WHERE s.is_deleted = 0 AND i.status IN ('pending', 'overdue') AND i.due_date < ?
      ORDER BY i.due_date ASC
    `,
    )
    .all(today, today) as Array<
    InstallmentRow & {
      invoice_number: string;
      customer_name: string;
      customer_phone: string;
      vehicle_name: string;
      days_overdue: number;
    }
  >;

  return rows.map((row) => ({
    id: row.id,
    sale_id: row.sale_id,
    installment_number: row.installment_number,
    due_date: row.due_date,
    amount: row.amount,
    status: row.status,
    payment_date: row.payment_date || undefined,
    payment_amount: row.payment_amount || undefined,
    paid_amount: row.payment_amount || 0,
    notes: row.notes || undefined,
    created_at: row.created_at,
    updated_at: row.updated_at,
    invoice_number: row.invoice_number,
    customer_name: row.customer_name,
    customer_phone: row.customer_phone,
    vehicle_name: row.vehicle_name,
    days_overdue: row.days_overdue,
  }));
}

export function getCustomerLedger(customerId: string): {
  sales: Sale[];
  payments: Array<Record<string, unknown>>;
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
    .all(customerId) as Record<string, unknown>[];

  const payments = db
    .prepare(
      `
      SELECT p.*, s.invoice_number
      FROM payments p
      JOIN sales s ON p.sale_id = s.id
      WHERE s.customer_id = ? AND s.is_deleted = 0
      ORDER BY p.payment_date DESC
    `,
    )
    .all(customerId) as Array<Record<string, unknown>>;

  const totalPaid = payments.reduce(
    (sum, payment) => sum + Number(payment.amount || 0),
    0,
  );
  const totalPending = sales.reduce(
    (sum, sale) => sum + Number(sale.remaining_balance || 0),
    0,
  );

  return {
    sales: sales as any,
    payments,
    totalPaid,
    totalPending,
  };
}

function resolveInstallmentSchedule(
  remainingAmount: number,
  durationType: InstallmentDurationType,
  installmentCount: number,
  startDate: string,
  providedSchedule?: CreateSaleData["installment_schedule"],
): InstallmentScheduleItem[] {
  if (providedSchedule && providedSchedule.length > 0) {
    return providedSchedule.map((entry, index) => ({
      installment_number: entry.installment_number || index + 1,
      due_date: entry.due_date,
      amount: round2(entry.amount),
    }));
  }

  const normalizedCount = Math.max(1, installmentCount);
  const perInstallment = round2(remainingAmount / normalizedCount);
  const schedule: InstallmentScheduleItem[] = [];
  const start = new Date(startDate);

  for (let i = 1; i <= normalizedCount; i++) {
    const dueDate = calculateDueDate(start, durationType, i - 1);
    const amount =
      i === normalizedCount
        ? round2(remainingAmount - perInstallment * (normalizedCount - 1))
        : perInstallment;

    schedule.push({
      installment_number: i,
      due_date: format(dueDate, "yyyy-MM-dd"),
      amount,
    });
  }

  return schedule;
}

function calculateDueDate(
  startDate: Date,
  durationType: InstallmentDurationType,
  step: number,
): Date {
  switch (durationType) {
    case "days":
      return addDays(startDate, step);
    case "months":
    case "monthly":
      return addMonths(startDate, step);
    case "years":
      return addYears(startDate, step);
    case "weekly":
      return addWeeks(startDate, step);
    case "bi_weekly":
      return addWeeks(startDate, step * 2);
    default:
      return addMonths(startDate, step);
  }
}

function normalizeDurationType(value: string): InstallmentDurationType {
  const valid: InstallmentDurationType[] = [
    "days",
    "months",
    "years",
    "weekly",
    "bi_weekly",
    "monthly",
  ];
  if (valid.includes(value as InstallmentDurationType)) {
    return value as InstallmentDurationType;
  }
  return "months";
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function parseInstallmentSchedule(value: unknown): InstallmentScheduleItem[] {
  if (typeof value !== "string" || !value) {
    return [];
  }
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item && typeof item === "object")
      .map((item) => ({
        installment_number: Number(item.installment_number || 0),
        due_date: String(item.due_date || ""),
        amount: Number(item.amount || 0),
      }));
  } catch {
    return [];
  }
}

function mapSaleRow(row: Record<string, unknown>): Sale {
  return {
    id: String(row.id || ""),
    invoice_number: String(row.invoice_number || ""),
    date: String(row.date || ""),
    sale_date: String(row.date || ""),
    customer_id: String(row.customer_id || ""),
    customer_name: String(row.customer_name || ""),
    customer_cnic: String(row.customer_cnic || ""),
    customer_phone: String(row.customer_phone || ""),
    vehicle_id: String(row.vehicle_id || ""),
    vehicle_name:
      String(row.vehicle_name || "").trim() ||
      [row.year, row.make, row.model].filter(Boolean).join(" "),
    registration_number: String(row.registration_number || ""),
    chassis_number: String(row.chassis_number || ""),
    engine_number: String(row.engine_number || ""),
    vehicle_price: Number(row.vehicle_price || 0),
    sale_price: Number(row.vehicle_price || 0),
    down_payment: Number(row.down_payment || 0),
    remaining_balance: Number(row.remaining_balance || 0),
    total_paid:
      row.total_paid !== undefined && row.total_paid !== null
        ? Number(row.total_paid)
        : Number(row.vehicle_price || 0) - Number(row.remaining_balance || 0),
    balance: Number(row.remaining_balance || 0),
    payment_type: (row.payment_type || "cash") as PaymentType,
    cash_payment_method: (row.cash_payment_method || "hard_cash") as CashPaymentMethod,
    bank_account_id: row.bank_account_id ? String(row.bank_account_id) : undefined,
    bank_account_name: row.bank_account_name
      ? String(row.bank_account_name)
      : undefined,
    installment_count: Number(row.installment_count || 0),
    installment_frequency: row.installment_frequency
      ? String(row.installment_frequency)
      : "",
    installment_duration_type: row.installment_duration_type
      ? (String(row.installment_duration_type) as InstallmentDurationType)
      : undefined,
    installment_schedule: parseInstallmentSchedule(row.installment_schedule_json),
    status: String(row.status || "active") as Sale["status"],
    ownership_transferred: Boolean(row.ownership_transferred),
    ownership_transfer_date: row.ownership_transfer_date ? String(row.ownership_transfer_date) : undefined,
    final_payment_date: row.final_payment_date ? String(row.final_payment_date) : undefined,
    purchase_price: Number(row.purchase_price || 0),
    total_cost: Number(row.total_cost || 0),
    notes: row.notes ? String(row.notes) : "",
    created_by: String(row.created_by || ""),
    created_at: String(row.created_at || ""),
    updated_at: String(row.updated_at || ""),
    customer: row.customer_name
      ? {
          id: String(row.customer_id || ""),
          name: String(row.customer_name || ""),
          father_name: String(row.customer_father_name || ""),
          cnic: String(row.customer_cnic || ""),
          phone: String(row.customer_phone || ""),
          address: String(row.customer_address || ""),
          witness_name: String(row.witness_name || ""),
          witness_father_name: String(row.witness_father_name || ""),
          witness_cnic: String(row.witness_cnic || ""),
          witness_phone: String(row.witness_phone || ""),
          witness_cnic_photo_path: String(row.witness_cnic_photo_path || ""),
          witness_cnic_photo_back_path: String(row.witness_cnic_photo_back_path || ""),
          created_by: "",
          created_at: "",
          updated_at: "",
        }
      : undefined,
    vehicle: row.make
      ? {
          id: String(row.vehicle_id || ""),
          registration_number: String(row.registration_number || ""),
          chassis_number: String(row.chassis_number || ""),
          engine_number: String(row.engine_number || ""),
          make: String(row.make || ""),
          model: String(row.model || ""),
          year_of_manufacture: Number(row.year || 0),
          color: String(row.color || ""),
          assembling_company: "",
          extra_keys_available: true,
          file_available: false,
          current_smart_card: false,
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

export function transferOwnership(
  userId: string,
  saleId: string,
): void {
  const db = getDatabase();
  const sale = db
    .prepare("SELECT * FROM sales WHERE id = ? AND is_deleted = 0")
    .get(saleId) as Record<string, unknown> | undefined;
  if (!sale) throw new Error("Sale not found");

  const today = format(new Date(), "yyyy-MM-dd");

  db.prepare(
    `UPDATE sales SET ownership_transferred = 1, ownership_transfer_date = ?, updated_at = datetime('now') WHERE id = ?`,
  ).run(today, saleId);

  const user = db
    .prepare("SELECT username, role FROM users WHERE id = ?")
    .get(userId) as { username: string; role: string } | undefined;
  db.prepare(
    `INSERT INTO audit_logs (id, user_id, username, role, action_type, affected_entity, entity_id, new_value, timestamp)
     VALUES (?, ?, ?, ?, 'status_change', 'sales', ?, ?, datetime('now'))`,
  ).run(
    uuidv4(),
    userId,
    user?.username || "",
    user?.role || "",
    saleId,
    JSON.stringify({ ownership_transferred: true, date: today }),
  );
}
