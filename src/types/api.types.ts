// Common API response types

export interface ApiResponse<T = any> {
  message?: string;
  data?: T;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Auth types
export interface LoginResponse {
  message: string;
  user: User;
  token: string;
}

export interface RegisterResponse {
  message: string;
  user: User;
  token: string;
}

export interface ProfileResponse {
  user: User;
}

// User types
export interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  isActive: boolean;
  isSystem?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateUserData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface UpdateUserData {
  firstName?: string;
  lastName?: string;
  isActive?: boolean;
}

// Account types (Chart of Accounts)
export interface Account {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  subType: string;
  description: string | null;
  balance: number;
  parentId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  parent?: {
    id: string;
    code: string;
    name: string;
  } | null;
  createdByUser?: {
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
  updatedByUser?: {
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
}

export enum AccountType {
  Income = 'Income',
  Other_Income = 'Other_Income',
  Expense = 'Expense',
  Other_Expense = 'Other_Expense',
  Cost_of_Goods_Sold = 'Cost_of_Goods_Sold',
  Current_Assets = 'Current_Assets',
  Fixed_Assets = 'Fixed_Assets',
  Current_Liabilities = 'Current_Liabilities',
  Equity = 'Equity',
}

export interface CreateAccountData {
  code: string;
  name: string;
  type: AccountType;
  subType: string;
  description?: string;
  parentId?: string;
}

// Customer types
export interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomerData {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
}

// Vendor types
export interface Vendor {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVendorData {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
}

// Item types
export interface Item {
  id: string;
  name: string;
  description: string | null;
  type: ItemType;
  unitPrice: number;
  incomeAccountId: string | null;
  expenseAccountId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export enum ItemType {
  SERVICE = 'SERVICE',
  PRODUCT = 'PRODUCT',
}

export interface CreateItemData {
  name: string;
  description?: string;
  type: ItemType;
  unitPrice: number;
  incomeAccountId?: string;
  expenseAccountId?: string;
}

// Invoice types
export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customer?: Customer;
  invoiceDate: string;
  dueDate: string;
  status: InvoiceStatus;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  items?: InvoiceItem[];
}

export interface InvoiceItem {
  id: string;
  invoiceId: string;
  itemId: string | null;
  item?: Item;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export enum InvoiceStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  PAID = 'PAID',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  OVERDUE = 'OVERDUE',
  CANCELLED = 'CANCELLED',
}

export interface CreateInvoiceData {
  customerId: string;
  invoiceDate: string;
  dueDate: string;
  notes?: string;
  items: Array<{
    itemId?: string;
    description: string;
    quantity: number;
    unitPrice: number;
  }>;
}

// Bill types
export interface Bill {
  id: string;
  billNumber: string;
  vendorId: string;
  vendor?: Vendor;
  billDate: string;
  dueDate: string;
  status: BillStatus;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  items?: BillItem[];
}

export interface BillItem {
  id: string;
  billId: string;
  itemId: string | null;
  item?: Item;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export enum BillStatus {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  PAID = 'PAID',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  OVERDUE = 'OVERDUE',
  CANCELLED = 'CANCELLED',
}

export interface CreateBillData {
  vendorId: string;
  billDate: string;
  dueDate: string;
  notes?: string;
  items: Array<{
    itemId?: string;
    description: string;
    quantity: number;
    unitPrice: number;
  }>;
}

// Transaction types
export interface Transaction {
  id: string;
  bankAccountId: string;
  bankAccount?: BankAccount;
  date: string;
  description: string;
  type: TransactionType;
  amount: number;
  category: string | null;
  isReconciled: boolean;
  reconciliationId: string | null;
  createdAt: string;
  updatedAt: string;
}

export enum TransactionType {
  DEPOSIT = 'DEPOSIT',
  WITHDRAWAL = 'WITHDRAWAL',
  TRANSFER = 'TRANSFER',
}

export interface CreateTransactionData {
  bankAccountId: string;
  date: string;
  description: string;
  type: TransactionType;
  amount: number;
  category?: string;
}

// Bank Account types
export interface BankAccount {
  id: string;
  name: string;
  accountNumber: string;
  bankName: string;
  accountType: string | null;
  balance: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBankAccountData {
  name: string;
  accountNumber: string;
  bankName: string;
  accountType?: string;
  balance: number;
}

// Journal Entry types
export interface JournalEntry {
  id: string;
  entryNumber: string;
  date: string;
  description: string;
  status: JournalEntryStatus;
  createdAt: string;
  updatedAt: string;
  lines?: JournalEntryLine[];
}

export interface JournalEntryLine {
  id: string;
  journalEntryId: string;
  accountId: string;
  account?: Account;
  description: string | null;
  debit: number;
  credit: number;
}

export enum JournalEntryStatus {
  DRAFT = 'DRAFT',
  POSTED = 'POSTED',
  VOIDED = 'VOIDED',
}

export interface CreateJournalEntryData {
  date: string;
  description: string;
  lines: Array<{
    accountId: string;
    description?: string;
    debit: number;
    credit: number;
  }>;
}

// Reconciliation types
export interface Reconciliation {
  id: string;
  bankAccountId: string;
  bankAccount?: BankAccount;
  statementDate: string;
  statementBalance: number;
  clearedBalance: number;
  difference: number;
  status: ReconciliationStatus;
  createdAt: string;
  updatedAt: string;
}

export enum ReconciliationStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export interface CreateReconciliationData {
  bankAccountId: string;
  statementDate: string;
  statementBalance: number;
}

// Query parameters
export interface TransactionQueryParams {
  bankAccountId?: string;
  startDate?: string;
  endDate?: string;
  type?: TransactionType;
  isReconciled?: boolean;
}

export interface InvoiceQueryParams {
  customerId?: string;
  status?: InvoiceStatus;
  startDate?: string;
  endDate?: string;
}

export interface BillQueryParams {
  vendorId?: string;
  status?: BillStatus;
  startDate?: string;
  endDate?: string;
}

export interface JournalEntryQueryParams {
  startDate?: string;
  endDate?: string;
  status?: JournalEntryStatus;
}

export interface ReconciliationQueryParams {
  bankAccountId?: string;
  status?: ReconciliationStatus;
}

export interface AccountQueryParams {
  isActive?: boolean;
  type?: string;
  page?: number;
  limit?: number;
}

