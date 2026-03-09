// Type declarations for Electron API exposed via preload
export interface ElectronAPI {
  // Auth
  login: (username: string, password: string) => Promise<any>;
  verifyToken: (token: string) => Promise<any>;
  createUser: (adminId: string, data: any) => Promise<any>;
  getUsers: () => Promise<any>;
  updateUser: (adminId: string, userId: string, data: any) => Promise<any>;
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
  getVehicleExpenses: (vehicleId: string) => Promise<any>;
  deleteVehicleExpense: (userId: string, expenseId: string) => Promise<any>;

  // Customers
  addCustomer: (userId: string, data: any) => Promise<any>;
  getCustomers: (filters: any) => Promise<any>;
  getCustomerById: (id: string) => Promise<any>;
  updateCustomer: (userId: string, id: string, data: any) => Promise<any>;
  deleteCustomer: (userId: string, id: string) => Promise<any>;

  // Sales
  createSale: (userId: string, data: any) => Promise<any>;
  getSales: (filters: any) => Promise<any>;
  getSaleById: (id: string) => Promise<any>;
  getInstallments: (saleId: string) => Promise<any>;
  payInstallment: (
    userId: string,
    installmentId: string,
    data: any,
  ) => Promise<any>;
  getOverdueInstallments: () => Promise<any>;
  getCustomerLedger: (customerId: string) => Promise<any>;

  // Showroom Expenses
  addShowroomExpense: (userId: string, data: any) => Promise<any>;
  getShowroomExpenses: (filters: any) => Promise<any>;
  deleteShowroomExpense: (userId: string, id: string) => Promise<any>;

  // Inspections
  createInspection: (userId: string, vehicleId: string) => Promise<any>;
  getInspections: (filters: any) => Promise<any>;
  getInspectionById: (id: string) => Promise<any>;
  updateInspectionItem: (
    userId: string,
    itemId: string,
    data: any,
  ) => Promise<any>;
  updateDamageMap: (
    userId: string,
    inspectionId: string,
    panel: string,
    status: string,
  ) => Promise<any>;
  completeInspection: (userId: string, inspectionId: string) => Promise<any>;
  addInspectionPhoto: (
    inspectionId: string,
    category: string,
    photoPath: string,
    caption: string,
  ) => Promise<any>;

  // Reports
  getDashboardStats: () => Promise<any>;
  getSalesReport: (period: string, date?: string) => Promise<any>;
  getProfitReport: () => Promise<any>;
  getInventoryReport: () => Promise<any>;
  getAuditLogs: (filters: any) => Promise<any>;

  // File Operations
  saveImage: (sourcePath: string, category: string) => Promise<any>;
  selectImage: () => Promise<any>;
  selectMultipleImages: () => Promise<any>;
  savePdf: (pdfData: Uint8Array, defaultName: string) => Promise<any>;
}

declare global {
  interface Window {
    api: ElectronAPI;
  }
}
