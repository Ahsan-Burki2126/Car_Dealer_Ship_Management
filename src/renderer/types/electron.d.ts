// Type declarations for Electron API exposed via preload
export interface ElectronAPI {
  // Auth
  login: (username: string, password: string) => Promise<any>;
  verifyToken: (token: string) => Promise<any>;
  createUser: (adminId: string, data: any) => Promise<any>;
  getUsers: (requesterId: string) => Promise<any>;
  updateUser: (adminId: string, userId: string, data: any) => Promise<any>;
  deleteUser: (adminId: string, userId: string) => Promise<any>;
  changePassword: (
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) => Promise<any>;

  // Vehicles
  addVehicle: (userId: string, data: any) => Promise<any>;
  getVehicles: (filters: any) => Promise<any>;
  getVehicleById: (id: string) => Promise<any>;
  updateVehicle: (userId: string, id: string, data: any) => Promise<any>;
  deleteVehicle: (userId: string, id: string) => Promise<any>;
  restoreVehicle: (userId: string, id: string) => Promise<any>;

  // Vehicle Expenses
  addVehicleExpense: (
    userId: string,
    vehicleId: string,
    data: any,
  ) => Promise<any>;
  getVehicleExpenses: (userId: string, vehicleId: string) => Promise<any>;
  deleteVehicleExpense: (userId: string, expenseId: string) => Promise<any>;

  // Customers
  addCustomer: (userId: string, data: any) => Promise<any>;
  getCustomers: (filters: any) => Promise<any>;
  getCustomerById: (id: string) => Promise<any>;
  updateCustomer: (userId: string, id: string, data: any) => Promise<any>;
  deleteCustomer: (userId: string, id: string) => Promise<any>;

  // Sales
  createSale: (userId: string, data: any) => Promise<any>;
  updateSale: (userId: string, saleId: string, data: any) => Promise<any>;
  deleteSale: (
    userId: string,
    saleId: string,
    forceWithInstallments?: boolean,
  ) => Promise<any>;
  getSales: (userId: string, filters: any) => Promise<any>;
  getSaleById: (userId: string, id: string) => Promise<any>;
  getInstallments: (userId: string, saleId: string) => Promise<any>;
  payInstallment: (
    userId: string,
    installmentId: string,
    data: any,
  ) => Promise<any>;
  getOverdueInstallments: (userId: string) => Promise<any>;
  getCustomerLedger: (userId: string, customerId: string) => Promise<any>;

  // Showroom Expenses
  addShowroomExpense: (userId: string, data: any) => Promise<any>;
  getShowroomExpenses: (userId: string, filters: any) => Promise<any>;
  deleteShowroomExpense: (userId: string, id: string) => Promise<any>;

  // Reports
  getDashboardStats: (userId: string) => Promise<any>;
  getSalesReport: (
    userId: string,
    period: string,
    date?: string,
  ) => Promise<any>;
  getProfitReport: (userId: string) => Promise<any>;
  getInventoryReport: (userId: string) => Promise<any>;
  getAuditLogs: (userId: string, filters: any) => Promise<any>;

  // Bank Accounts
  getBankAccounts: (userId: string, activeOnly?: boolean) => Promise<any>;
  createBankAccount: (userId: string, data: any) => Promise<any>;
  updateBankAccount: (
    userId: string,
    accountId: string,
    data: any,
  ) => Promise<any>;

  // Backup
  createBackup: (userId: string, targetPath?: string) => Promise<any>;
  listBackups: (userId: string) => Promise<any>;
  restoreBackup: (userId: string, filePath: string) => Promise<any>;
  getBackupFolder: (userId: string) => Promise<any>;

  // File Operations
  saveImage: (sourcePath: string, category: string) => Promise<any>;
  selectImage: () => Promise<any>;
  selectMultipleImages: () => Promise<any>;
  selectBackupFile: (userId?: string) => Promise<any>;
  saveBackupAs: (userId: string, defaultName: string) => Promise<any>;
  savePdf: (pdfData: Uint8Array, defaultName: string) => Promise<any>;
}

declare global {
  interface Window {
    api: ElectronAPI;
  }
}
