import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("api", {
  // Auth
  login: (username: string, password: string) =>
    ipcRenderer.invoke("auth:login", username, password),
  verifyToken: (token: string) => ipcRenderer.invoke("auth:verify", token),
  createUser: (adminId: string, data: any) =>
    ipcRenderer.invoke("auth:createUser", adminId, data),
  getUsers: (requesterId: string) =>
    ipcRenderer.invoke("auth:getUsers", requesterId),
  updateUser: (adminId: string, userId: string, data: any) =>
    ipcRenderer.invoke("auth:updateUser", adminId, userId, data),
  deleteUser: (adminId: string, userId: string) =>
    ipcRenderer.invoke("auth:deleteUser", adminId, userId),
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

  verifySuperadminPassword: (password: string) =>
    ipcRenderer.invoke("auth:verifySuperadminPassword", password),

  // Vehicles
  addVehicle: (userId: string, data: any) =>
    ipcRenderer.invoke("vehicles:add", userId, data),
  getVehicles: (filters: any) => ipcRenderer.invoke("vehicles:getAll", filters),
  getVehicleById: (id: string) => ipcRenderer.invoke("vehicles:getById", id),
  updateVehicle: (userId: string, id: string, data: any) =>
    ipcRenderer.invoke("vehicles:update", userId, id, data),
  repurchaseVehicle: (userId: string, vehicleId: string, data: any) =>
    ipcRenderer.invoke("vehicles:repurchase", userId, vehicleId, data),
  checkChassisExists: (chassis: string) =>
    ipcRenderer.invoke("vehicles:checkChassis", chassis),
  deleteVehicle: (userId: string, id: string) =>
    ipcRenderer.invoke("vehicles:delete", userId, id),
  restoreVehicle: (userId: string, id: string) =>
    ipcRenderer.invoke("vehicles:restore", userId, id),
  getVehicleHistory: (vehicleId: string) =>
    ipcRenderer.invoke("vehicles:getHistory", vehicleId),
  getVehicleProfitReport: (userId: string, filters: any) =>
    ipcRenderer.invoke("vehicles:getProfitReport", userId, filters),

  // Vehicle Expenses
  addVehicleExpense: (userId: string, vehicleId: string, data: any) =>
    ipcRenderer.invoke("vehicleExpenses:add", userId, vehicleId, data),
  getVehicleExpenses: (userId: string, vehicleId: string) =>
    ipcRenderer.invoke("vehicleExpenses:getByVehicle", userId, vehicleId),
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
  updateSale: (userId: string, saleId: string, data: any) =>
    ipcRenderer.invoke("sales:update", userId, saleId, data),
  deleteSale: (
    userId: string,
    saleId: string,
    forceWithInstallments?: boolean,
  ) =>
    ipcRenderer.invoke("sales:delete", userId, saleId, forceWithInstallments),
  getSales: (userId: string, filters: any) =>
    ipcRenderer.invoke("sales:getAll", userId, filters),
  getSaleById: (userId: string, id: string) =>
    ipcRenderer.invoke("sales:getById", userId, id),
  getInstallments: (userId: string, saleId: string) =>
    ipcRenderer.invoke("sales:getInstallments", userId, saleId),
  payInstallment: (userId: string, installmentId: string, data: any) =>
    ipcRenderer.invoke("sales:payInstallment", userId, installmentId, data),
  getOverdueInstallments: (userId: string) =>
    ipcRenderer.invoke("sales:getOverdue", userId),
  getInstallmentSales: (userId: string) =>
    ipcRenderer.invoke("sales:getInstallmentSales", userId),
  getCustomerLedger: (userId: string, customerId: string) =>
    ipcRenderer.invoke("sales:getCustomerLedger", userId, customerId),
  transferOwnership: (userId: string, saleId: string) =>
    ipcRenderer.invoke("sales:transferOwnership", userId, saleId),

  // Showroom Expenses
  addShowroomExpense: (userId: string, data: any) =>
    ipcRenderer.invoke("showroomExpenses:add", userId, data),
  getShowroomExpenses: (userId: string, filters: any) =>
    ipcRenderer.invoke("showroomExpenses:getAll", userId, filters),
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
    data: { status: string; notes?: string; photo_paths?: string[] },
  ) =>
    ipcRenderer.invoke(
      "inspections:updateDamageMap",
      userId,
      inspectionId,
      panel,
      data,
    ),
  completeInspection: (userId: string, inspectionId: string) =>
    ipcRenderer.invoke("inspections:complete", userId, inspectionId),
  deleteInspection: (userId: string, inspectionId: string) =>
    ipcRenderer.invoke("inspections:delete", userId, inspectionId),
  addInspectionPhoto: (
    userId: string,
    inspectionId: string,
    category: string,
    photoPath: string,
    caption: string,
  ) =>
    ipcRenderer.invoke(
      "inspections:addPhoto",
      userId,
      inspectionId,
      category,
      photoPath,
      caption,
    ),

  // Reports
  getDashboardStats: (userId: string) =>
    ipcRenderer.invoke("reports:dashboard", userId),
  getSalesReport: (userId: string, period: string, startOrDate?: string, endDate?: string) =>
    ipcRenderer.invoke("reports:sales", userId, period, startOrDate, endDate),
  getProfitReport: (userId: string, period?: string, startOrDate?: string, endDate?: string) =>
    ipcRenderer.invoke("reports:profit", userId, period, startOrDate, endDate),
  getInventoryReport: (userId: string) =>
    ipcRenderer.invoke("reports:inventory", userId),
  getAuditLogs: (userId: string, filters: any) =>
    ipcRenderer.invoke("reports:auditLogs", userId, filters),
  getVehicleSearchReport: (userId: string, search: string) =>
    ipcRenderer.invoke("reports:vehicleSearch", userId, search),

  // Bank Accounts
  getBankAccounts: (userId: string, activeOnly = true) =>
    ipcRenderer.invoke("bankAccounts:getAll", userId, activeOnly),
  createBankAccount: (userId: string, data: any) =>
    ipcRenderer.invoke("bankAccounts:create", userId, data),
  updateBankAccount: (userId: string, accountId: string, data: any) =>
    ipcRenderer.invoke("bankAccounts:update", userId, accountId, data),
  deleteBankAccount: (userId: string, accountId: string) =>
    ipcRenderer.invoke("bankAccounts:delete", userId, accountId),

  // Backup
  createBackup: (userId: string, targetPath?: string) =>
    ipcRenderer.invoke("backup:create", userId, targetPath),
  listBackups: (userId: string) => ipcRenderer.invoke("backup:list", userId),
  restoreBackup: (userId: string, filePath: string) =>
    ipcRenderer.invoke("backup:restore", userId, filePath),
  getBackupFolder: (userId: string) =>
    ipcRenderer.invoke("backup:getFolder", userId),

  // Google Drive Backup
  googleDriveStartAuth: () => ipcRenderer.invoke("googledrive:startAuth"),
  googleDriveGetAuthUrl: () => ipcRenderer.invoke("googledrive:getAuthUrl"),
  googleDriveAuthenticate: (authCode: string) =>
    ipcRenderer.invoke("googledrive:authenticate", authCode),
  googleDriveIsAuthenticated: () =>
    ipcRenderer.invoke("googledrive:isAuthenticated"),
  googleDriveUploadBackup: (userId: string, filePath: string) =>
    ipcRenderer.invoke("googledrive:uploadBackup", userId, filePath),
  googleDriveListBackups: (userId: string) =>
    ipcRenderer.invoke("googledrive:listBackups", userId),
  googleDriveDownloadBackup: (
    userId: string,
    fileId: string,
    destinationPath: string,
  ) =>
    ipcRenderer.invoke(
      "googledrive:downloadBackup",
      userId,
      fileId,
      destinationPath,
    ),
  googleDriveDeleteBackup: (userId: string, fileId: string) =>
    ipcRenderer.invoke("googledrive:deleteBackup", userId, fileId),
  googleDriveGetFolderUrl: (userId: string) =>
    ipcRenderer.invoke("googledrive:getFolderUrl", userId),
  googleDriveGetSettings: (userId: string) =>
    ipcRenderer.invoke("googledrive:getSettings", userId),
  googleDriveUpdateSettings: (userId: string, settings: any) =>
    ipcRenderer.invoke("googledrive:updateSettings", userId, settings),
  googleDriveLogout: () => ipcRenderer.invoke("googledrive:logout"),

  // App Settings
  getLowStockThreshold: () =>
    ipcRenderer.invoke("settings:getLowStockThreshold"),
  setLowStockThreshold: (userId: string, threshold: number) =>
    ipcRenderer.invoke("settings:setLowStockThreshold", userId, threshold),

  // File Operations
  saveImage: (sourcePath: string, category: string) =>
    ipcRenderer.invoke("files:saveImage", sourcePath, category),
  selectImage: () => ipcRenderer.invoke("files:selectImage"),
  selectMultipleImages: () => ipcRenderer.invoke("files:selectMultipleImages"),
  selectBackupFile: (userId?: string) =>
    ipcRenderer.invoke("files:selectBackupFile", userId),
  saveBackupAs: (userId: string, defaultName: string) =>
    ipcRenderer.invoke("files:saveBackupAs", userId, defaultName),
  savePdf: (pdfData: Uint8Array, defaultName: string) =>
    ipcRenderer.invoke("files:savePdf", pdfData, defaultName),
  savePdfToBackup: (userId: string, pdfData: Uint8Array, fileName: string, uploadToGoogleDrive: boolean) =>
    ipcRenderer.invoke("files:savePdfToBackup", userId, pdfData, fileName, uploadToGoogleDrive),

  // Investors
  getInvestors: (userId: string) =>
    ipcRenderer.invoke("investors:getAll", userId),
  addInvestor: (userId: string, data: any) =>
    ipcRenderer.invoke("investors:add", userId, data),
  updateInvestor: (userId: string, investorId: string, data: any) =>
    ipcRenderer.invoke("investors:update", userId, investorId, data),
  deleteInvestor: (userId: string, investorId: string) =>
    ipcRenderer.invoke("investors:delete", userId, investorId),

  // Investor Withdrawals
  addInvestorWithdrawal: (userId: string, data: any) =>
    ipcRenderer.invoke("investorWithdrawals:add", userId, data),
  getInvestorWithdrawals: (userId: string, investorId: string) =>
    ipcRenderer.invoke("investorWithdrawals:getByInvestor", userId, investorId),
  deleteInvestorWithdrawal: (userId: string, withdrawalId: string) =>
    ipcRenderer.invoke("investorWithdrawals:delete", userId, withdrawalId),

  // Investor Additions
  addInvestorAddition: (userId: string, data: any) =>
    ipcRenderer.invoke("investorAdditions:add", userId, data),
  getInvestorAdditions: (userId: string, investorId: string) =>
    ipcRenderer.invoke("investorAdditions:getByInvestor", userId, investorId),
  deleteInvestorAddition: (userId: string, additionId: string) =>
    ipcRenderer.invoke("investorAdditions:delete", userId, additionId),
});
