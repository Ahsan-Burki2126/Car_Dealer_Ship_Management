import { ipcMain, dialog, app } from "electron";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import * as authService from "../services/authService";
import * as vehicleService from "../services/vehicleService";
import * as vehicleExpenseService from "../services/vehicleExpenseService";
import * as customerService from "../services/customerService";
import * as salesService from "../services/salesService";
import * as showroomExpenseService from "../services/showroomExpenseService";
import * as inspectionService from "../services/inspectionService";
import * as reportService from "../services/reportService";

function handleError(error: unknown): { success: false; error: string } {
  const message =
    error instanceof Error ? error.message : "An unexpected error occurred";
  return { success: false, error: message };
}

export function registerIpcHandlers(): void {
  // =========== AUTH ===========
  ipcMain.handle(
    "auth:login",
    async (_event, username: string, password: string) => {
      try {
        const result = authService.login(username, password);
        return { success: true, data: result };
      } catch (e) {
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
    "auth:createUser",
    async (_event, adminId: string, data: any) => {
      try {
        const user = authService.createUser(adminId, data);
        return { success: true, data: user };
      } catch (e) {
        return handleError(e);
      }
    },
  );

  ipcMain.handle("auth:getUsers", async () => {
    try {
      return { success: true, data: authService.getUsers() };
    } catch (e) {
      return handleError(e);
    }
  });

  ipcMain.handle(
    "auth:updateUser",
    async (_event, adminId: string, userId: string, data: any) => {
      try {
        authService.updateUser(adminId, userId, data);
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
      const vehicle = vehicleService.getVehicleById(id);
      return { success: true, data: vehicle };
    } catch (e) {
      return handleError(e);
    }
  });

  ipcMain.handle(
    "vehicles:update",
    async (_event, userId: string, id: string, data: any) => {
      try {
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
    async (_event, vehicleId: string) => {
      try {
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
      const sale = salesService.createSale(userId, data);
      return { success: true, data: sale };
    } catch (e) {
      return handleError(e);
    }
  });

  ipcMain.handle("sales:getAll", async (_event, filters: any) => {
    try {
      return { success: true, data: salesService.getSales(filters) };
    } catch (e) {
      return handleError(e);
    }
  });

  ipcMain.handle("sales:getById", async (_event, id: string) => {
    try {
      return { success: true, data: salesService.getSaleById(id) };
    } catch (e) {
      return handleError(e);
    }
  });

  ipcMain.handle("sales:getInstallments", async (_event, saleId: string) => {
    try {
      return {
        success: true,
        data: salesService.getInstallmentsBySale(saleId),
      };
    } catch (e) {
      return handleError(e);
    }
  });

  ipcMain.handle(
    "sales:payInstallment",
    async (_event, userId: string, installmentId: string, data: any) => {
      try {
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

  ipcMain.handle("sales:getOverdue", async () => {
    try {
      return { success: true, data: salesService.getOverdueInstallments() };
    } catch (e) {
      return handleError(e);
    }
  });

  ipcMain.handle(
    "sales:getCustomerLedger",
    async (_event, customerId: string) => {
      try {
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
        const expense = showroomExpenseService.addShowroomExpense(userId, data);
        return { success: true, data: expense };
      } catch (e) {
        return handleError(e);
      }
    },
  );

  ipcMain.handle("showroomExpenses:getAll", async (_event, filters: any) => {
    try {
      return {
        success: true,
        data: showroomExpenseService.getShowroomExpenses(filters),
      };
    } catch (e) {
      return handleError(e);
    }
  });

  ipcMain.handle(
    "showroomExpenses:delete",
    async (_event, userId: string, id: string) => {
      try {
        showroomExpenseService.deleteShowroomExpense(userId, id);
        return { success: true };
      } catch (e) {
        return handleError(e);
      }
    },
  );

  // =========== INSPECTIONS ===========
  ipcMain.handle(
    "inspections:create",
    async (_event, userId: string, vehicleId: string) => {
      try {
        const inspection = inspectionService.createInspection(
          userId,
          vehicleId,
        );
        return { success: true, data: inspection };
      } catch (e) {
        return handleError(e);
      }
    },
  );

  ipcMain.handle("inspections:getAll", async (_event, filters: any) => {
    try {
      return { success: true, data: inspectionService.getInspections(filters) };
    } catch (e) {
      return handleError(e);
    }
  });

  ipcMain.handle("inspections:getById", async (_event, id: string) => {
    try {
      return { success: true, data: inspectionService.getInspectionById(id) };
    } catch (e) {
      return handleError(e);
    }
  });

  ipcMain.handle(
    "inspections:updateItem",
    async (_event, userId: string, itemId: string, data: any) => {
      try {
        inspectionService.updateInspectionItem(userId, itemId, data);
        return { success: true };
      } catch (e) {
        return handleError(e);
      }
    },
  );

  ipcMain.handle(
    "inspections:updateDamageMap",
    async (
      _event,
      userId: string,
      inspectionId: string,
      panel: string,
      status: string,
    ) => {
      try {
        inspectionService.updateDamageMap(
          userId,
          inspectionId,
          panel,
          status as any,
        );
        return { success: true };
      } catch (e) {
        return handleError(e);
      }
    },
  );

  ipcMain.handle(
    "inspections:complete",
    async (_event, userId: string, inspectionId: string) => {
      try {
        const inspection = inspectionService.completeInspection(
          userId,
          inspectionId,
        );
        return { success: true, data: inspection };
      } catch (e) {
        return handleError(e);
      }
    },
  );

  ipcMain.handle(
    "inspections:addPhoto",
    async (
      _event,
      inspectionId: string,
      category: string,
      photoPath: string,
      caption: string,
    ) => {
      try {
        const photo = inspectionService.addInspectionPhoto(
          inspectionId,
          category,
          photoPath,
          caption,
        );
        return { success: true, data: photo };
      } catch (e) {
        return handleError(e);
      }
    },
  );

  // =========== REPORTS ===========
  ipcMain.handle("reports:dashboard", async () => {
    try {
      return { success: true, data: reportService.getDashboardStats() };
    } catch (e) {
      return handleError(e);
    }
  });

  ipcMain.handle(
    "reports:sales",
    async (_event, period: string, date?: string) => {
      try {
        return {
          success: true,
          data: reportService.getSalesReport(period as any, date),
        };
      } catch (e) {
        return handleError(e);
      }
    },
  );

  ipcMain.handle("reports:profit", async () => {
    try {
      return { success: true, data: reportService.getProfitReport() };
    } catch (e) {
      return handleError(e);
    }
  });

  ipcMain.handle("reports:inventory", async () => {
    try {
      return { success: true, data: reportService.getInventoryReport() };
    } catch (e) {
      return handleError(e);
    }
  });

  ipcMain.handle("reports:auditLogs", async (_event, filters: any) => {
    try {
      return { success: true, data: reportService.getAuditLogs(filters) };
    } catch (e) {
      return handleError(e);
    }
  });

  // =========== FILE OPERATIONS ===========
  ipcMain.handle(
    "files:saveImage",
    async (_event, sourceFilePath: string, category: string) => {
      try {
        const imagesDir = path.join(
          app.getPath("userData"),
          "images",
          category,
        );
        if (!fs.existsSync(imagesDir)) {
          fs.mkdirSync(imagesDir, { recursive: true });
        }
        const ext = path.extname(sourceFilePath);
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

  ipcMain.handle(
    "files:savePdf",
    async (_event, pdfData: Uint8Array, defaultName: string) => {
      try {
        const result = await dialog.showSaveDialog({
          defaultPath: defaultName,
          filters: [{ name: "PDF", extensions: ["pdf"] }],
        });
        if (result.canceled || !result.filePath)
          return { success: true, data: null };
        fs.writeFileSync(result.filePath, Buffer.from(pdfData));
        return { success: true, data: result.filePath };
      } catch (e) {
        return handleError(e);
      }
    },
  );
}
