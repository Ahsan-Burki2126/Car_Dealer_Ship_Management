import { ipcMain, dialog, app } from "electron";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import { getDatabase } from "../database/init";
import * as authService from "../services/authService";
import * as vehicleService from "../services/vehicleService";
import * as vehicleExpenseService from "../services/vehicleExpenseService";
import * as customerService from "../services/customerService";
import * as salesService from "../services/salesService";
import * as showroomExpenseService from "../services/showroomExpenseService";
import * as reportService from "../services/reportService";
import * as bankAccountService from "../services/bankAccountService";
import * as backupService from "../services/backupService";
import * as appSettingsService from "../services/appSettingsService";
import type { UserRole } from "../../shared/types";
import { isValidPhone } from "../../shared/constants";

function handleError(error: unknown): { success: false; error: string } {
  const message =
    error instanceof Error ? error.message : "An unexpected error occurred";
  return { success: false, error: message };
}

// Simple in-memory login rate limiter: max 5 attempts per 15 minutes per username
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

function checkLoginRateLimit(username: string): void {
  const now = Date.now();
  const entry = loginAttempts.get(username);
  if (entry && now < entry.resetAt) {
    if (entry.count >= LOGIN_MAX_ATTEMPTS) {
      const minutesLeft = Math.ceil((entry.resetAt - now) / 60_000);
      throw new Error(
        `Too many failed login attempts. Try again in ${minutesLeft} minute(s).`,
      );
    }
  }
}

function recordFailedLogin(username: string): void {
  const now = Date.now();
  const entry = loginAttempts.get(username);
  if (!entry || now >= entry.resetAt) {
    loginAttempts.set(username, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
  } else {
    entry.count += 1;
  }
}

function clearLoginAttempts(username: string): void {
  loginAttempts.delete(username);
}

function getUserRole(userId: string): UserRole {
  const db = getDatabase();
  const user = db
    .prepare("SELECT role FROM users WHERE id = ? AND is_active = 1")
    .get(userId) as { role: UserRole } | undefined;
  if (!user) {
    throw new Error("Unauthorized user");
  }
  return user.role;
}

function requireRole(userId: string, roles: UserRole[]): UserRole {
  const role = getUserRole(userId);
  if (!roles.includes(role)) {
    throw new Error("You do not have permission for this action");
  }
  return role;
}

export function registerIpcHandlers(): void {
  // =========== AUTH ===========
  ipcMain.handle(
    "auth:login",
    async (_event, username: string, password: string) => {
      try {
        checkLoginRateLimit(username);
        const result = authService.login(username, password);
        clearLoginAttempts(username);
        return { success: true, data: result };
      } catch (e) {
        if (!(e instanceof Error && e.message.startsWith("Too many"))) {
          recordFailedLogin(username);
        }
        return handleError(e);
      }
    },
  );

  ipcMain.handle("auth:verify", async (_event, token: string) => {
    try {
      const payload = authService.verifyToken(token);
      return { success: true, data: payload };
    } catch (e) {
      return handleError(e);
    }
  });

  ipcMain.handle(
    "auth:verifySuperadminPassword",
    async (_event, password: string) => {
      try {
        const db = getDatabase();
        const bcrypt = require("bcryptjs");
        const superadmin = db
          .prepare(
            "SELECT password_hash FROM users WHERE role = 'super_admin' AND is_active = 1 LIMIT 1",
          )
          .get() as { password_hash: string } | undefined;
        if (!superadmin) {
          return { success: false, error: "No superadmin account found" };
        }
        const valid = bcrypt.compareSync(password, superadmin.password_hash);
        return {
          success: valid,
          error: valid ? undefined : "Invalid superadmin password",
        };
      } catch (e) {
        return handleError(e);
      }
    },
  );

  ipcMain.handle(
    "auth:createUser",
    async (_event, adminId: string, data: any) => {
      try {
        requireRole(adminId, ["super_admin"]);
        const user = authService.createUser(adminId, data);
        return { success: true, data: user };
      } catch (e) {
        return handleError(e);
      }
    },
  );

  ipcMain.handle("auth:getUsers", async (_event, requesterId: string) => {
    try {
      requireRole(requesterId, ["super_admin", "admin"]);
      return { success: true, data: authService.getUsers() };
    } catch (e) {
      return handleError(e);
    }
  });

  ipcMain.handle(
    "auth:updateUser",
    async (_event, adminId: string, userId: string, data: any) => {
      try {
        requireRole(adminId, ["super_admin", "admin"]);
        authService.updateUser(adminId, userId, data);
        return { success: true };
      } catch (e) {
        return handleError(e);
      }
    },
  );

  ipcMain.handle(
    "auth:deleteUser",
    async (_event, adminId: string, userId: string) => {
      try {
        requireRole(adminId, ["super_admin"]);
        authService.deleteUser(adminId, userId);
        return { success: true };
      } catch (e) {
        return handleError(e);
      }
    },
  );

  ipcMain.handle(
    "auth:changePassword",
    async (
      _event,
      userId: string,
      currentPassword: string,
      newPassword: string,
    ) => {
      try {
        authService.changePassword(userId, currentPassword, newPassword);
        return { success: true };
      } catch (e) {
        return handleError(e);
      }
    },
  );

  // =========== VEHICLES ===========
  ipcMain.handle("vehicles:add", async (_event, userId: string, data: any) => {
    try {
      requireRole(userId, ["super_admin", "admin"]);
      const vehicle = vehicleService.addVehicle(userId, data);
      return { success: true, data: vehicle };
    } catch (e) {
      return handleError(e);
    }
  });

  ipcMain.handle("vehicles:getAll", async (_event, filters: any) => {
    try {
      return { success: true, data: vehicleService.getVehicles(filters) };
    } catch (e) {
      return handleError(e);
    }
  });

  ipcMain.handle("vehicles:getById", async (_event, id: string) => {
    try {
      return { success: true, data: vehicleService.getVehicleById(id) };
    } catch (e) {
      return handleError(e);
    }
  });

  ipcMain.handle("vehicles:checkChassis", async (_event, chassis: string) => {
    try {
      return { success: true, data: vehicleService.checkChassisExists(chassis) };
    } catch (e) {
      return handleError(e);
    }
  });

  ipcMain.handle(
    "vehicles:repurchase",
    async (_event, userId: string, vehicleId: string, data: any) => {
      try {
        requireRole(userId, ["super_admin", "admin"]);
        const vehicle = vehicleService.repurchaseVehicle(vehicleId, userId, data);
        return { success: true, data: vehicle };
      } catch (e) {
        return handleError(e);
      }
    },
  );

  ipcMain.handle(
    "vehicles:update",
    async (_event, userId: string, id: string, data: any) => {
      try {
        requireRole(userId, ["super_admin", "admin"]);
        const vehicle = vehicleService.updateVehicle(userId, id, data);
        return { success: true, data: vehicle };
      } catch (e) {
        return handleError(e);
      }
    },
  );

  ipcMain.handle(
    "vehicles:delete",
    async (_event, userId: string, id: string) => {
      try {
        requireRole(userId, ["super_admin", "admin"]);
        vehicleService.deleteVehicle(userId, id);
        return { success: true };
      } catch (e) {
        return handleError(e);
      }
    },
  );

  ipcMain.handle(
    "vehicles:restore",
    async (_event, userId: string, id: string) => {
      try {
        requireRole(userId, ["super_admin", "admin"]);
        vehicleService.restoreVehicle(userId, id);
        return { success: true };
      } catch (e) {
        return handleError(e);
      }
    },
  );

  // =========== VEHICLE EXPENSES ===========
  ipcMain.handle(
    "vehicleExpenses:add",
    async (_event, userId: string, vehicleId: string, data: any) => {
      try {
        requireRole(userId, ["super_admin", "admin"]);
        const expense = vehicleExpenseService.addVehicleExpense(
          userId,
          vehicleId,
          data,
        );
        return { success: true, data: expense };
      } catch (e) {
        return handleError(e);
      }
    },
  );

  ipcMain.handle(
    "vehicleExpenses:getByVehicle",
    async (_event, userId: string, vehicleId: string) => {
      try {
        requireRole(userId, ["super_admin", "admin"]);
        return {
          success: true,
          data: vehicleExpenseService.getVehicleExpenses(vehicleId),
        };
      } catch (e) {
        return handleError(e);
      }
    },
  );

  ipcMain.handle(
    "vehicleExpenses:delete",
    async (_event, userId: string, expenseId: string) => {
      try {
        requireRole(userId, ["super_admin", "admin"]);
        vehicleExpenseService.deleteVehicleExpense(userId, expenseId);
        return { success: true };
      } catch (e) {
        return handleError(e);
      }
    },
  );

  // =========== CUSTOMERS ===========
  ipcMain.handle("customers:add", async (_event, userId: string, data: any) => {
    try {
      requireRole(userId, ["super_admin", "admin"]);
      if (data.contact_number && !isValidPhone(data.contact_number)) {
        return { success: false, error: "Invalid phone number. Use Pakistani format e.g. 03XX-XXXXXXX" };
      }
      const customer = customerService.addCustomer(userId, data);
      return { success: true, data: customer };
    } catch (e) {
      return handleError(e);
    }
  });

  ipcMain.handle("customers:getAll", async (_event, filters: any) => {
    try {
      return { success: true, data: customerService.getCustomers(filters) };
    } catch (e) {
      return handleError(e);
    }
  });

  ipcMain.handle("customers:getById", async (_event, id: string) => {
    try {
      return { success: true, data: customerService.getCustomerById(id) };
    } catch (e) {
      return handleError(e);
    }
  });

  ipcMain.handle(
    "customers:update",
    async (_event, userId: string, id: string, data: any) => {
      try {
        requireRole(userId, ["super_admin", "admin"]);
        if (data.contact_number && !isValidPhone(data.contact_number)) {
          return { success: false, error: "Invalid phone number. Use Pakistani format e.g. 03XX-XXXXXXX" };
        }
        const customer = customerService.updateCustomer(userId, id, data);
        return { success: true, data: customer };
      } catch (e) {
        return handleError(e);
      }
    },
  );

  ipcMain.handle(
    "customers:delete",
    async (_event, userId: string, id: string) => {
      try {
        requireRole(userId, ["super_admin", "admin"]);
        customerService.deleteCustomer(userId, id);
        return { success: true };
      } catch (e) {
        return handleError(e);
      }
    },
  );

  // =========== SALES ===========
  ipcMain.handle("sales:create", async (_event, userId: string, data: any) => {
    try {
      requireRole(userId, ["super_admin", "admin"]);
      const sale = salesService.createSale(userId, data);
      return { success: true, data: sale };
    } catch (e) {
      return handleError(e);
    }
  });

  ipcMain.handle(
    "sales:update",
    async (_event, userId: string, saleId: string, data: any) => {
      try {
        requireRole(userId, ["super_admin", "admin"]);
        const sale = salesService.updateSale(userId, saleId, data);
        return { success: true, data: sale };
      } catch (e) {
        return handleError(e);
      }
    },
  );

  ipcMain.handle(
    "sales:delete",
    async (
      _event,
      userId: string,
      saleId: string,
      forceWithInstallments = false,
    ) => {
      try {
        requireRole(userId, ["super_admin", "admin"]);
        salesService.deleteSale(userId, saleId, forceWithInstallments);
        return { success: true };
      } catch (e) {
        return handleError(e);
      }
    },
  );

  ipcMain.handle(
    "sales:getAll",
    async (_event, userId: string, filters: any) => {
      try {
        requireRole(userId, ["super_admin", "admin"]);
        return { success: true, data: salesService.getSales(filters) };
      } catch (e) {
        return handleError(e);
      }
    },
  );

  ipcMain.handle(
    "sales:getById",
    async (_event, userId: string, id: string) => {
      try {
        requireRole(userId, ["super_admin", "admin"]);
        return { success: true, data: salesService.getSaleById(id) };
      } catch (e) {
        return handleError(e);
      }
    },
  );

  ipcMain.handle(
    "sales:getInstallments",
    async (_event, userId: string, saleId: string) => {
      try {
        requireRole(userId, ["super_admin", "admin"]);
        return {
          success: true,
          data: salesService.getInstallmentsBySale(saleId),
        };
      } catch (e) {
        return handleError(e);
      }
    },
  );

  ipcMain.handle(
    "sales:payInstallment",
    async (_event, userId: string, installmentId: string, data: any) => {
      try {
        requireRole(userId, ["super_admin", "admin"]);
        const installment = salesService.recordInstallmentPayment(
          userId,
          installmentId,
          data,
        );
        return { success: true, data: installment };
      } catch (e) {
        return handleError(e);
      }
    },
  );

  ipcMain.handle("sales:getOverdue", async (_event, userId: string) => {
    try {
      requireRole(userId, ["super_admin", "admin"]);
      return { success: true, data: salesService.getOverdueInstallments() };
    } catch (e) {
      return handleError(e);
    }
  });

  ipcMain.handle("sales:getInstallmentSales", async (_event, userId: string) => {
    try {
      requireRole(userId, ["super_admin", "admin"]);
      return { success: true, data: salesService.getInstallmentSales() };
    } catch (e) {
      return handleError(e);
    }
  });

  ipcMain.handle(
    "sales:getCustomerLedger",
    async (_event, userId: string, customerId: string) => {
      try {
        requireRole(userId, ["super_admin", "admin"]);
        return {
          success: true,
          data: salesService.getCustomerLedger(customerId),
        };
      } catch (e) {
        return handleError(e);
      }
    },
  );

  // =========== SHOWROOM EXPENSES ===========
  ipcMain.handle(
    "showroomExpenses:add",
    async (_event, userId: string, data: any) => {
      try {
        requireRole(userId, ["super_admin", "admin"]);
        const payload = {
          ...data,
          date: data.date || data.expense_date,
        };
        const expense = showroomExpenseService.addShowroomExpense(
          userId,
          payload,
        );
        return { success: true, data: expense };
      } catch (e) {
        return handleError(e);
      }
    },
  );

  ipcMain.handle(
    "showroomExpenses:getAll",
    async (_event, userId: string, filters: any) => {
      try {
        requireRole(userId, ["super_admin", "admin"]);
        const payload = {
          category: filters?.category,
          startDate: filters?.startDate || filters?.date_from,
          endDate: filters?.endDate || filters?.date_to,
          page: filters?.page,
          limit: filters?.limit,
        };
        return {
          success: true,
          data: showroomExpenseService.getShowroomExpenses(payload),
        };
      } catch (e) {
        return handleError(e);
      }
    },
  );

  ipcMain.handle(
    "showroomExpenses:delete",
    async (_event, userId: string, id: string) => {
      try {
        requireRole(userId, ["super_admin", "admin"]);
        showroomExpenseService.deleteShowroomExpense(userId, id);
        return { success: true };
      } catch (e) {
        return handleError(e);
      }
    },
  );

  // =========== INSPECTIONS ===========
  // =========== REPORTS ===========
  ipcMain.handle("reports:dashboard", async (_event, userId: string) => {
    try {
      requireRole(userId, ["super_admin", "admin"]);
      const data = reportService.getDashboardStats();
      return { success: true, data };
    } catch (e) {
      return handleError(e);
    }
  });

  ipcMain.handle(
    "reports:sales",
    async (_event, userId: string, period: string, startOrDate?: string, endDate?: string) => {
      try {
        requireRole(userId, ["super_admin", "admin"]);
        return {
          success: true,
          data: reportService.getSalesReport(period as any, startOrDate, endDate),
        };
      } catch (e) {
        return handleError(e);
      }
    },
  );

  ipcMain.handle("reports:profit", async (_event, userId: string, period?: string, startOrDate?: string, endDate?: string) => {
    try {
      requireRole(userId, ["super_admin", "admin"]);
      return { success: true, data: reportService.getProfitReport(period as any, startOrDate, endDate) };
    } catch (e) {
      return handleError(e);
    }
  });

  ipcMain.handle("reports:inventory", async (_event, userId: string) => {
    try {
      requireRole(userId, ["super_admin", "admin"]);
      return { success: true, data: reportService.getInventoryReport() };
    } catch (e) {
      return handleError(e);
    }
  });

  ipcMain.handle(
    "reports:auditLogs",
    async (_event, userId: string, filters: any) => {
      try {
        requireRole(userId, ["super_admin"]);
        return {
          success: true,
          data: reportService.getAuditLogs({
            userId: filters?.userId,
            entity: filters?.entity || filters?.entity_type,
            page: filters?.page,
            limit: filters?.limit,
          }),
        };
      } catch (e) {
        return handleError(e);
      }
    },
  );

  ipcMain.handle(
    "reports:vehicleSearch",
    async (_event, userId: string, search: string) => {
      try {
        requireRole(userId, ["super_admin", "admin"]);
        return {
          success: true,
          data: reportService.getVehicleSearchReport(search),
        };
      } catch (e) {
        return handleError(e);
      }
    },
  );

  ipcMain.handle(
    "sales:transferOwnership",
    async (_event, userId: string, saleId: string) => {
      try {
        requireRole(userId, ["super_admin", "admin"]);
        salesService.transferOwnership(userId, saleId);
        return { success: true };
      } catch (e) {
        return handleError(e);
      }
    },
  );

  // =========== BANK ACCOUNTS ===========
  ipcMain.handle(
    "bankAccounts:getAll",
    async (_event, userId: string, activeOnly = true) => {
      try {
        requireRole(userId, ["super_admin", "admin"]);
        return {
          success: true,
          data: bankAccountService.getBankAccounts(activeOnly),
        };
      } catch (e) {
        return handleError(e);
      }
    },
  );

  ipcMain.handle(
    "bankAccounts:create",
    async (_event, userId: string, data: any) => {
      try {
        requireRole(userId, ["super_admin", "admin"]);
        return {
          success: true,
          data: bankAccountService.createBankAccount(userId, data),
        };
      } catch (e) {
        return handleError(e);
      }
    },
  );

  ipcMain.handle(
    "bankAccounts:update",
    async (_event, userId: string, accountId: string, data: any) => {
      try {
        requireRole(userId, ["super_admin", "admin"]);
        return {
          success: true,
          data: bankAccountService.updateBankAccount(userId, accountId, data),
        };
      } catch (e) {
        return handleError(e);
      }
    },
  );

  ipcMain.handle(
    "bankAccounts:delete",
    async (_event, userId: string, accountId: string) => {
      try {
        requireRole(userId, ["super_admin", "admin"]);
        bankAccountService.deleteBankAccount(userId, accountId);
        return { success: true };
      } catch (e) {
        return handleError(e);
      }
    },
  );

  // =========== BACKUP ===========
  ipcMain.handle(
    "backup:create",
    async (_event, userId: string, targetPath?: string) => {
      try {
        requireRole(userId, ["super_admin", "admin"]);
        const backup = await backupService.createBackup("manual", userId, targetPath);
        return { success: true, data: backup };
      } catch (e) {
        return handleError(e);
      }
    },
  );

  ipcMain.handle("backup:list", async (_event, userId: string) => {
    try {
      requireRole(userId, ["super_admin", "admin"]);
      return { success: true, data: backupService.listBackups() };
    } catch (e) {
      return handleError(e);
    }
  });

  ipcMain.handle(
    "backup:restore",
    async (_event, userId: string, filePath: string) => {
      try {
        requireRole(userId, ["super_admin", "admin"]);
        backupService.restoreBackup(filePath, userId);
        return { success: true };
      } catch (e) {
        return handleError(e);
      }
    },
  );

  ipcMain.handle("backup:getFolder", async (_event, userId: string) => {
    try {
      requireRole(userId, ["super_admin", "admin"]);
      return { success: true, data: backupService.getBackupFolderPath() };
    } catch (e) {
      return handleError(e);
    }
  });

  // =========== GOOGLE DRIVE BACKUP ===========

  // New: single-call auth flow that opens browser + captures callback automatically
  ipcMain.handle("googledrive:startAuth", async () => {
    try {
      const googleDriveService = require("../services/googleDriveService");
      if (!googleDriveService.areCredentialsConfigured()) {
        return {
          success: false,
          error:
            "Google Drive credentials are not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET before building.",
        };
      }
      await googleDriveService.startAuthFlow();
      return { success: true, data: true };
    } catch (e) {
      return handleError(e);
    }
  });

  // Legacy handlers kept for backward compatibility
  ipcMain.handle("googledrive:getAuthUrl", async () => {
    try {
      const googleDriveService = require("../services/googleDriveService");
      const url = googleDriveService.getAuthorizationUrl();
      return { success: true, data: url };
    } catch (e) {
      return handleError(e);
    }
  });

  ipcMain.handle(
    "googledrive:authenticate",
    async (_event, authCode: string) => {
      try {
        const googleDriveService = require("../services/googleDriveService");
        const result = await googleDriveService.authenticateWithCode(authCode);
        return { success: result, data: result };
      } catch (e) {
        return handleError(e);
      }
    },
  );

  ipcMain.handle("googledrive:isAuthenticated", async () => {
    try {
      const googleDriveService = require("../services/googleDriveService");
      const isAuth = googleDriveService.isAuthenticated();
      return { success: true, data: isAuth };
    } catch (e) {
      return handleError(e);
    }
  });

  ipcMain.handle(
    "googledrive:uploadBackup",
    async (_event, userId: string, filePath: string) => {
      try {
        requireRole(userId, ["super_admin", "admin"]);
        const fileId = await backupService.uploadBackupToGoogleDrive(
          filePath,
          userId,
        );
        return { success: true, data: fileId };
      } catch (e) {
        return handleError(e);
      }
    },
  );

  ipcMain.handle("googledrive:listBackups", async (_event, userId: string) => {
    try {
      requireRole(userId, ["super_admin", "admin"]);
      const backups = await backupService.getGoogleDriveBackups();
      return { success: true, data: backups };
    } catch (e) {
      return handleError(e);
    }
  });

  ipcMain.handle(
    "googledrive:downloadBackup",
    async (_event, userId: string, fileId: string, destinationPath: string) => {
      try {
        requireRole(userId, ["super_admin", "admin"]);
        await backupService.downloadGoogleDriveBackup(fileId, destinationPath);
        return { success: true };
      } catch (e) {
        return handleError(e);
      }
    },
  );

  ipcMain.handle(
    "googledrive:deleteBackup",
    async (_event, userId: string, fileId: string) => {
      try {
        requireRole(userId, ["super_admin", "admin"]);
        await backupService.deleteGoogleDriveBackup(fileId);
        return { success: true };
      } catch (e) {
        return handleError(e);
      }
    },
  );

  ipcMain.handle("googledrive:getFolderUrl", async (_event, userId: string) => {
    try {
      requireRole(userId, ["super_admin", "admin"]);
      const url = await backupService.getGoogleDriveFolderUrl();
      return { success: true, data: url };
    } catch (e) {
      return handleError(e);
    }
  });

  ipcMain.handle("googledrive:getSettings", async (_event, userId: string) => {
    try {
      requireRole(userId, ["super_admin", "admin"]);
      const settings = backupService.getBackupSettings();
      return { success: true, data: settings };
    } catch (e) {
      return handleError(e);
    }
  });

  ipcMain.handle(
    "googledrive:updateSettings",
    async (_event, userId: string, settings: any) => {
      try {
        requireRole(userId, ["super_admin", "admin"]);
        backupService.updateBackupSettings(settings);
        return { success: true };
      } catch (e) {
        return handleError(e);
      }
    },
  );

  ipcMain.handle("googledrive:logout", async () => {
    try {
      const googleDriveService = require("../services/googleDriveService");
      googleDriveService.logout();
      return { success: true };
    } catch (e) {
      return handleError(e);
    }
  });

  // =========== FILE OPERATIONS ===========
  ipcMain.handle(
    "files:saveImage",
    async (_event, sourceFilePath: string, category: string) => {
      try {
        const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp"]);
        const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

        const ext = path.extname(sourceFilePath).toLowerCase();
        if (!ALLOWED_EXTENSIONS.has(ext)) {
          return { success: false, error: "Invalid file type. Only JPG, PNG, GIF, and WebP images are allowed." };
        }

        const stat = fs.statSync(sourceFilePath);
        if (stat.size > MAX_FILE_SIZE_BYTES) {
          return { success: false, error: "Image file is too large. Maximum allowed size is 10 MB." };
        }

        // Sanitize category to prevent path traversal
        const safeCategory = path.basename(category);
        const imagesDir = path.join(app.getPath("userData"), "images", safeCategory);
        if (!fs.existsSync(imagesDir)) {
          fs.mkdirSync(imagesDir, { recursive: true });
        }
        const fileName = `${uuidv4()}${ext}`;
        const destPath = path.join(imagesDir, fileName);
        fs.copyFileSync(sourceFilePath, destPath);
        return { success: true, data: destPath };
      } catch (e) {
        return handleError(e);
      }
    },
  );

  ipcMain.handle("files:selectImage", async () => {
    try {
      const result = await dialog.showOpenDialog({
        properties: ["openFile"],
        filters: [
          { name: "Images", extensions: ["jpg", "jpeg", "png", "gif", "webp"] },
        ],
      });
      if (result.canceled) return { success: true, data: null };
      return { success: true, data: result.filePaths[0] };
    } catch (e) {
      return handleError(e);
    }
  });

  ipcMain.handle("files:selectMultipleImages", async () => {
    try {
      const result = await dialog.showOpenDialog({
        properties: ["openFile", "multiSelections"],
        filters: [
          { name: "Images", extensions: ["jpg", "jpeg", "png", "gif", "webp"] },
        ],
      });
      if (result.canceled) return { success: true, data: [] };
      return { success: true, data: result.filePaths };
    } catch (e) {
      return handleError(e);
    }
  });

  ipcMain.handle("files:selectBackupFile", async (_event, userId?: string) => {
    try {
      if (userId) {
        requireRole(userId, ["super_admin", "admin"]);
      }
      const result = await dialog.showOpenDialog({
        properties: ["openFile"],
        filters: [
          { name: "Database Backup", extensions: ["db", "sqlite", "sqlite3"] },
        ],
      });
      if (result.canceled || result.filePaths.length === 0) {
        return { success: true, data: null };
      }
      return { success: true, data: result.filePaths[0] };
    } catch (e) {
      return handleError(e);
    }
  });

  ipcMain.handle(
    "files:savePdf",
    async (_event, pdfData: Uint8Array, defaultName: string) => {
      try {
        const result = await dialog.showSaveDialog({
          defaultPath: defaultName,
          filters: [{ name: "PDF", extensions: ["pdf"] }],
        });
        if (result.canceled || !result.filePath) {
          return { success: true, data: null };
        }
        fs.writeFileSync(result.filePath, Buffer.from(pdfData));
        return { success: true, data: result.filePath };
      } catch (e) {
        return handleError(e);
      }
    },
  );

  // =========== INVESTORS ===========
  ipcMain.handle("investors:getAll", async (_event, userId: string) => {
    try {
      requireRole(userId, ["super_admin", "admin"]);
      const db = getDatabase();
      const rows = db.prepare(`
        SELECT i.*,
          COALESCE((SELECT SUM(w.amount) FROM investor_withdrawals w WHERE w.investor_id = i.id), 0) AS total_withdrawn,
          COALESCE((SELECT SUM(a.amount) FROM investor_additions a WHERE a.investor_id = i.id), 0) AS total_added
        FROM investors i
        WHERE i.is_active = 1
        ORDER BY i.created_at DESC
      `).all();
      return { success: true, data: rows };
    } catch (e) {
      return handleError(e);
    }
  });

  ipcMain.handle("investors:add", async (_event, userId: string, data: any) => {
    try {
      requireRole(userId, ["super_admin", "admin"]);
      const db = getDatabase();
      const { v4: uuidv4Local } = require("uuid");
      const id = uuidv4Local();
      db.prepare(
        `INSERT INTO investors (id, name, contact, investment_amount, notes, photo_path, cnic_photo_front_path, cnic_photo_back_path, address, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(id, data.name, data.contact || "", data.investment_amount || 0, data.notes || "",
        data.photo_path || "", data.cnic_photo_front_path || "", data.cnic_photo_back_path || "",
        data.address || "", userId);
      const investor = db.prepare("SELECT * FROM investors WHERE id = ?").get(id);
      return { success: true, data: investor };
    } catch (e) {
      return handleError(e);
    }
  });

  ipcMain.handle("investors:delete", async (_event, userId: string, investorId: string) => {
    try {
      requireRole(userId, ["super_admin", "admin"]);
      const db = getDatabase();
      db.prepare("UPDATE investors SET is_active = 0 WHERE id = ?").run(investorId);
      return { success: true };
    } catch (e) {
      return handleError(e);
    }
  });

  ipcMain.handle("investors:update", async (_event, userId: string, investorId: string, data: any) => {
    try {
      requireRole(userId, ["super_admin", "admin"]);
      const db = getDatabase();
      db.prepare(
        `UPDATE investors SET name = ?, contact = ?, investment_amount = ?, notes = ?,
         photo_path = ?, cnic_photo_front_path = ?, cnic_photo_back_path = ?, address = ?,
         updated_at = datetime('now') WHERE id = ?`
      ).run(data.name, data.contact || "", data.investment_amount || 0, data.notes || "",
        data.photo_path || "", data.cnic_photo_front_path || "", data.cnic_photo_back_path || "",
        data.address || "", investorId);
      const investor = db.prepare("SELECT * FROM investors WHERE id = ?").get(investorId);
      return { success: true, data: investor };
    } catch (e) {
      return handleError(e);
    }
  });

  // =========== INVESTOR WITHDRAWALS ===========
  ipcMain.handle("investorWithdrawals:add", async (_event, userId: string, data: any) => {
    try {
      requireRole(userId, ["super_admin", "admin"]);
      const db = getDatabase();
      const { v4: uuidv4Local } = require("uuid");
      const id = uuidv4Local();
      db.prepare(
        `INSERT INTO investor_withdrawals (id, investor_id, amount, date, reason, notes, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).run(id, data.investor_id, data.amount, data.date, data.reason, data.notes || "", userId);
      const withdrawal = db.prepare("SELECT * FROM investor_withdrawals WHERE id = ?").get(id);
      return { success: true, data: withdrawal };
    } catch (e) {
      return handleError(e);
    }
  });

  ipcMain.handle("investorWithdrawals:getByInvestor", async (_event, userId: string, investorId: string) => {
    try {
      requireRole(userId, ["super_admin", "admin"]);
      const db = getDatabase();
      const rows = db.prepare(
        "SELECT * FROM investor_withdrawals WHERE investor_id = ? ORDER BY date DESC, created_at DESC"
      ).all(investorId);
      return { success: true, data: rows };
    } catch (e) {
      return handleError(e);
    }
  });

  ipcMain.handle("investorWithdrawals:delete", async (_event, userId: string, withdrawalId: string) => {
    try {
      requireRole(userId, ["super_admin", "admin"]);
      const db = getDatabase();
      db.prepare("DELETE FROM investor_withdrawals WHERE id = ?").run(withdrawalId);
      return { success: true };
    } catch (e) {
      return handleError(e);
    }
  });

  // =========== INVESTOR ADDITIONS ===========
  ipcMain.handle("investorAdditions:add", async (_event, userId: string, data: any) => {
    try {
      requireRole(userId, ["super_admin", "admin"]);
      const db = getDatabase();
      const { v4: uuidv4Local } = require("uuid");
      const id = uuidv4Local();
      db.prepare(
        `INSERT INTO investor_additions (id, investor_id, amount, date, reason, notes, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).run(id, data.investor_id, data.amount, data.date, data.reason, data.notes || "", userId);
      const addition = db.prepare("SELECT * FROM investor_additions WHERE id = ?").get(id);
      return { success: true, data: addition };
    } catch (e) {
      return handleError(e);
    }
  });

  ipcMain.handle("investorAdditions:getByInvestor", async (_event, userId: string, investorId: string) => {
    try {
      requireRole(userId, ["super_admin", "admin"]);
      const db = getDatabase();
      const rows = db.prepare(
        "SELECT * FROM investor_additions WHERE investor_id = ? ORDER BY date DESC, created_at DESC"
      ).all(investorId);
      return { success: true, data: rows };
    } catch (e) {
      return handleError(e);
    }
  });

  ipcMain.handle("investorAdditions:delete", async (_event, userId: string, additionId: string) => {
    try {
      requireRole(userId, ["super_admin", "admin"]);
      const db = getDatabase();
      db.prepare("DELETE FROM investor_additions WHERE id = ?").run(additionId);
      return { success: true };
    } catch (e) {
      return handleError(e);
    }
  });

  // =========== PDF SAVE TO LOCAL BACKUP ===========
  ipcMain.handle(
    "files:savePdfToBackup",
    async (_event, userId: string, pdfData: Uint8Array, fileName: string, uploadToGoogleDrive: boolean) => {
      try {
        requireRole(userId, ["super_admin", "admin"]);
        const backupDir = path.join(app.getPath("userData"), "purchase-reports");
        if (!fs.existsSync(backupDir)) {
          fs.mkdirSync(backupDir, { recursive: true });
        }
        const safeName = fileName.replace(/[^a-zA-Z0-9_\-\.]/g, "_");
        const localPath = path.join(backupDir, safeName.endsWith(".pdf") ? safeName : `${safeName}.pdf`);
        fs.writeFileSync(localPath, Buffer.from(pdfData));

        let driveFileId: string | null = null;
        if (uploadToGoogleDrive) {
          try {
            const googleDriveService = require("../services/googleDriveService");
            if (googleDriveService.isAuthenticated()) {
              driveFileId = await googleDriveService.uploadFile(localPath, safeName.endsWith(".pdf") ? safeName : `${safeName}.pdf`, "application/pdf");
            }
          } catch (driveErr) {
            console.error("Google Drive upload failed:", driveErr);
          }
        }
        return { success: true, data: { localPath, driveFileId } };
      } catch (e) {
        return handleError(e);
      }
    }
  );

  // =========== VEHICLE HISTORY ===========
  ipcMain.handle("vehicles:getHistory", async (_event, vehicleId: string) => {
    try {
      const history = vehicleService.getVehicleHistory(vehicleId);
      return { success: true, data: history };
    } catch (e) {
      return handleError(e);
    }
  });

  // =========== PROFIT/LOSS REPORT ===========
  ipcMain.handle(
    "vehicles:getProfitReport",
    async (_event, userId: string, filters: any) => {
      try {
        requireRole(userId, ["super_admin", "admin"]);
        const result = vehicleService.getVehicleProfitReport(filters || {});
        return { success: true, data: result };
      } catch (e) {
        return handleError(e);
      }
    },
  );

  // =========== WHATSAPP ===========
  ipcMain.handle("whatsapp:getStatus", async () => {
    try {
      const whatsappService = require("../services/whatsappService");
      return { success: true, data: whatsappService.getStatus() };
    } catch (e) {
      return handleError(e);
    }
  });

  ipcMain.handle("whatsapp:initialize", async () => {
    try {
      const whatsappService = require("../services/whatsappService");
      const result = await whatsappService.initializeWhatsApp();
      return result.success
        ? { success: true }
        : { success: false, error: result.error };
    } catch (e) {
      return handleError(e);
    }
  });

  ipcMain.handle("whatsapp:disconnect", async (_event, userId: string) => {
    try {
      requireRole(userId, ["super_admin", "admin"]);
      const whatsappService = require("../services/whatsappService");
      await whatsappService.disconnectWhatsApp();
      return { success: true };
    } catch (e) {
      return handleError(e);
    }
  });

  ipcMain.handle(
    "whatsapp:sendTest",
    async (_event, userId: string, phone: string) => {
      try {
        requireRole(userId, ["super_admin", "admin"]);
        const whatsappService = require("../services/whatsappService");
        const result = await whatsappService.sendMessage(
          phone,
          "✅ *Test Message*\nYeh Pak Japan Motors ka test message hai. WhatsApp reminders chal rahay hain! 🎉",
        );
        return result.success
          ? { success: true }
          : { success: false, error: result.error };
      } catch (e) {
        return handleError(e);
      }
    },
  );

  ipcMain.handle("whatsapp:sendRemindersNow", async (_event, userId: string) => {
    try {
      requireRole(userId, ["super_admin", "admin"]);
      const reminderScheduler = require("../services/reminderScheduler");
      const result = await reminderScheduler.sendInstallmentReminders();
      return { success: true, data: result };
    } catch (e) {
      return handleError(e);
    }
  });

  ipcMain.handle("whatsapp:getLogs", async (_event, userId: string) => {
    try {
      requireRole(userId, ["super_admin", "admin"]);
      const reminderScheduler = require("../services/reminderScheduler");
      return { success: true, data: reminderScheduler.getReminderLogs(50) };
    } catch (e) {
      return handleError(e);
    }
  });

  ipcMain.handle("whatsapp:getSettings", async () => {
    try {
      return { success: true, data: appSettingsService.getWhatsAppSettings() };
    } catch (e) {
      return handleError(e);
    }
  });

  ipcMain.handle(
    "whatsapp:updateSettings",
    async (_event, userId: string, data: any) => {
      try {
        requireRole(userId, ["super_admin", "admin"]);
        appSettingsService.setWhatsAppSettings(data);
        return { success: true };
      } catch (e) {
        return handleError(e);
      }
    },
  );

  // =========== APP SETTINGS ===========
  ipcMain.handle("settings:getLowStockThreshold", async () => {
    try {
      return { success: true, data: appSettingsService.getLowStockThreshold() };
    } catch (e) {
      return handleError(e);
    }
  });

  ipcMain.handle(
    "settings:setLowStockThreshold",
    async (_event, userId: string, threshold: number) => {
      try {
        requireRole(userId, ["super_admin", "admin"]);
        appSettingsService.setLowStockThreshold(threshold);
        return { success: true };
      } catch (e) {
        return handleError(e);
      }
    },
  );

  ipcMain.handle(
    "files:saveBackupAs",
    async (_event, userId: string, defaultName: string) => {
      try {
        requireRole(userId, ["super_admin", "admin"]);
        const result = await dialog.showSaveDialog({
          defaultPath: defaultName,
          filters: [{ name: "Database Backup", extensions: ["db"] }],
        });
        if (result.canceled || !result.filePath) {
          return { success: true, data: null };
        }
        return { success: true, data: result.filePath };
      } catch (e) {
        return handleError(e);
      }
    },
  );
}
