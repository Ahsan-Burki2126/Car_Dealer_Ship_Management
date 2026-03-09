import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("api", {
  // Auth
  login: (username: string, password: string) =>
    ipcRenderer.invoke("auth:login", username, password),
  verifyToken: (token: string) => ipcRenderer.invoke("auth:verify", token),
  createUser: (adminId: string, data: any) =>
    ipcRenderer.invoke("auth:createUser", adminId, data),
  getUsers: () => ipcRenderer.invoke("auth:getUsers"),
  updateUser: (adminId: string, userId: string, data: any) =>
    ipcRenderer.invoke("auth:updateUser", adminId, userId, data),
  changePassword: (
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) =>
    ipcRenderer.invoke(
      "auth:changePassword",
      userId,
      currentPassword,
      newPassword,
    ),

  // Vehicles
  addVehicle: (userId: string, data: any) =>
    ipcRenderer.invoke("vehicles:add", userId, data),
  getVehicles: (filters: any) => ipcRenderer.invoke("vehicles:getAll", filters),
  getVehicleById: (id: string) => ipcRenderer.invoke("vehicles:getById", id),
  updateVehicle: (userId: string, id: string, data: any) =>
    ipcRenderer.invoke("vehicles:update", userId, id, data),
  deleteVehicle: (userId: string, id: string) =>
    ipcRenderer.invoke("vehicles:delete", userId, id),
  restoreVehicle: (userId: string, id: string) =>
    ipcRenderer.invoke("vehicles:restore", userId, id),

  // Vehicle Expenses
  addVehicleExpense: (userId: string, vehicleId: string, data: any) =>
    ipcRenderer.invoke("vehicleExpenses:add", userId, vehicleId, data),
  getVehicleExpenses: (vehicleId: string) =>
    ipcRenderer.invoke("vehicleExpenses:getByVehicle", vehicleId),
  deleteVehicleExpense: (userId: string, expenseId: string) =>
    ipcRenderer.invoke("vehicleExpenses:delete", userId, expenseId),

  // Customers
  addCustomer: (userId: string, data: any) =>
    ipcRenderer.invoke("customers:add", userId, data),
  getCustomers: (filters: any) =>
    ipcRenderer.invoke("customers:getAll", filters),
  getCustomerById: (id: string) => ipcRenderer.invoke("customers:getById", id),
  updateCustomer: (userId: string, id: string, data: any) =>
    ipcRenderer.invoke("customers:update", userId, id, data),
  deleteCustomer: (userId: string, id: string) =>
    ipcRenderer.invoke("customers:delete", userId, id),

  // Sales
  createSale: (userId: string, data: any) =>
    ipcRenderer.invoke("sales:create", userId, data),
  getSales: (filters: any) => ipcRenderer.invoke("sales:getAll", filters),
  getSaleById: (id: string) => ipcRenderer.invoke("sales:getById", id),
  getInstallments: (saleId: string) =>
    ipcRenderer.invoke("sales:getInstallments", saleId),
  payInstallment: (userId: string, installmentId: string, data: any) =>
    ipcRenderer.invoke("sales:payInstallment", userId, installmentId, data),
  getOverdueInstallments: () => ipcRenderer.invoke("sales:getOverdue"),
  getCustomerLedger: (customerId: string) =>
    ipcRenderer.invoke("sales:getCustomerLedger", customerId),

  // Showroom Expenses
  addShowroomExpense: (userId: string, data: any) =>
    ipcRenderer.invoke("showroomExpenses:add", userId, data),
  getShowroomExpenses: (filters: any) =>
    ipcRenderer.invoke("showroomExpenses:getAll", filters),
  deleteShowroomExpense: (userId: string, id: string) =>
    ipcRenderer.invoke("showroomExpenses:delete", userId, id),

  // Inspections
  createInspection: (userId: string, vehicleId: string) =>
    ipcRenderer.invoke("inspections:create", userId, vehicleId),
  getInspections: (filters: any) =>
    ipcRenderer.invoke("inspections:getAll", filters),
  getInspectionById: (id: string) =>
    ipcRenderer.invoke("inspections:getById", id),
  updateInspectionItem: (userId: string, itemId: string, data: any) =>
    ipcRenderer.invoke("inspections:updateItem", userId, itemId, data),
  updateDamageMap: (
    userId: string,
    inspectionId: string,
    panel: string,
    status: string,
  ) =>
    ipcRenderer.invoke(
      "inspections:updateDamageMap",
      userId,
      inspectionId,
      panel,
      status,
    ),
  completeInspection: (userId: string, inspectionId: string) =>
    ipcRenderer.invoke("inspections:complete", userId, inspectionId),
  addInspectionPhoto: (
    inspectionId: string,
    category: string,
    photoPath: string,
    caption: string,
  ) =>
    ipcRenderer.invoke(
      "inspections:addPhoto",
      inspectionId,
      category,
      photoPath,
      caption,
    ),

  // Reports
  getDashboardStats: () => ipcRenderer.invoke("reports:dashboard"),
  getSalesReport: (period: string, date?: string) =>
    ipcRenderer.invoke("reports:sales", period, date),
  getProfitReport: () => ipcRenderer.invoke("reports:profit"),
  getInventoryReport: () => ipcRenderer.invoke("reports:inventory"),
  getAuditLogs: (filters: any) =>
    ipcRenderer.invoke("reports:auditLogs", filters),

  // File Operations
  saveImage: (sourcePath: string, category: string) =>
    ipcRenderer.invoke("files:saveImage", sourcePath, category),
  selectImage: () => ipcRenderer.invoke("files:selectImage"),
  selectMultipleImages: () => ipcRenderer.invoke("files:selectMultipleImages"),
  savePdf: (pdfData: Uint8Array, defaultName: string) =>
    ipcRenderer.invoke("files:savePdf", pdfData, defaultName),
});
