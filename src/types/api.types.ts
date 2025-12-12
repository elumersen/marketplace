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
  city: string | null;
  state: string | null;
  zipCode: string | null;
  country: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
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
  invoices?: Invoice[];
}

export interface CreateCustomerData {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
}

// Vendor types
export interface Vendor {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  country: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  bills?: Bill[];
}

export interface CreateVendorData {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
}

// Item types
export interface Item {
  id: string;
  name: string;
  description: string | null;
  type: ItemType;
  amount: number;
  incomeAccountId: string | null;
  expenseAccountId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  incomeAccount?: Account | null;
  expenseAccount?: Account | null;
}

export enum ItemType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
}

export interface CreateItemData {
  name: string;
  description?: string;
  type: ItemType;
  amount: number;
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
  balanceDue?: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  lines?: InvoiceLine[];
  receivePayments?: ReceivePaymentInvoice[];
  journalEntry?: JournalEntry;
}

export interface InvoiceLine {
  id: string;
  invoiceId: string;
  itemId: string | null; // Optional - item may be deleted
  item?: Item | null;
  accountId?: string;
  account?: Account;
  description: string | null;
  quantity: number;
  unitPrice: number;
  amount: number;
  // Item snapshot data (preserved even if item is deleted/changed)
  itemName?: string | null;
  itemDescription?: string | null;
  itemAmount?: number | null;
}

export enum InvoiceStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  PAID = 'PAID',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  OVERDUE = 'OVERDUE',
  VOID = 'VOID',
}

export interface CreateInvoiceData {
  invoiceNumber: string;
  customerId: string;
  invoiceDate: string;
  dueDate: string;
  status?: InvoiceStatus;
  taxAmount?: number;
  notes?: string;
  lines: Array<{
    itemId: string;
    accountId?: string;
    description?: string;
    quantity: number;
    unitPrice: number;
  }>;
}

// Receive Payment types
export interface ReceivePaymentInvoice {
  id: string;
  receivePaymentId: string;
  invoiceId: string;
  amount: number;
  invoice?: Invoice;
  receivePayment?: ReceivePayment;
}

export interface ReceivePayment {
  id: string;
  paymentDate: string;
  amount: number;
  referenceNumber: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  invoices?: ReceivePaymentInvoice[];
  journalEntry?: JournalEntry;
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

export interface CreateReceivePaymentData {
  invoices: Array<{ invoiceId: string; amount: number }>;
  paymentDate: string;
  amount: number;
  referenceNumber?: string;
  notes?: string;
}

export interface UpdateReceivePaymentData {
  invoices?: Array<{ invoiceId: string; amount: number }>;
  paymentDate?: string;
  amount?: number;
  referenceNumber?: string;
  notes?: string;
}

// Deposit types
export interface Deposit {
  id: string;
  bankAccountId: string;
  depositDate: string;
  amount: number;
  referenceNumber: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  bankAccount?: {
    id: string;
    name: string;
    accountNumber: string;
    accountType: string;
  };
  journalEntry?: JournalEntry;
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

export interface CreateDepositData {
  bankAccountId: string;
  depositDate: string;
  amount: number;
  referenceNumber?: string;
  notes?: string;
}

export interface UpdateDepositData {
  bankAccountId?: string;
  depositDate?: string;
  amount?: number;
  referenceNumber?: string;
  notes?: string;
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
  lines?: BillLine[];
}

export interface BillLine {
  id: string;
  billId: string;
  itemId: string | null; // Optional - item may be deleted
  item?: Item | null;
  description: string | null;
  quantity: number;
  unitPrice: number;
  amount: number;
  // Item snapshot data (preserved even if item is deleted/changed)
  itemName?: string | null;
  itemDescription?: string | null;
  itemAmount?: number | null;
}

export enum BillStatus {
  DRAFT = 'DRAFT',
  OPEN = 'OPEN',
  PAID = 'PAID',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  OVERDUE = 'OVERDUE',
  VOID = 'VOID',
}

export interface CreateBillData {
  billNumber?: string;
  vendorId: string;
  billDate: string;
  dueDate: string;
  status?: BillStatus;
  taxAmount?: number;
  notes?: string;
  lines: Array<{
    itemId: string;
    description?: string;
    quantity: number;
    unitPrice: number;
  }>;
}

// Bill Payment types
export interface BillPaymentBill {
  id: string;
  billPaymentId: string;
  billId: string;
  amount: number;
  bill?: Bill;
}

export interface BillPayment {
  id: string;
  billId?: string | null; // Deprecated, kept for backward compatibility
  bill?: Bill;
  billPaymentBills?: BillPaymentBill[];
  bankAccountId: string;
  bankAccount?: BankAccount;
  paymentDate: string;
  amount: number;
  checkNumber: string | null;
  referenceNumber: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  journalEntry?: JournalEntry;
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

export interface CreateBillPaymentData {
  bills: Array<{ billId: string; amount: number }>;
  bankAccountId: string;
  paymentDate: string;
  amount: number;
  checkNumber?: string;
  referenceNumber?: string;
  notes?: string;
}

export interface UpdateBillPaymentData {
  bills?: Array<{ billId: string; amount: number }>;
  bankAccountId?: string;
  paymentDate?: string;
  amount?: number;
  checkNumber?: string;
  referenceNumber?: string;
  notes?: string;
}

// Transaction types
export interface Transaction {
  id: string;
  bankAccountId: string;
  bankAccount?: BankAccount;
  transactionDate: string;
  description: string;
  type: TransactionType;
  amount: number;
  payee?: string;
  referenceNumber?: string;
  expenseAccountId?: string | null;
  expenseAccount?: Account | null;
  incomeAccountId?: string | null;
  incomeAccount?: Account | null;
  isReconciled: boolean;
  createdAt: string;
  updatedAt: string;
}

export enum TransactionType {
  CHECK = 'CHECK',
  DEPOSIT = 'DEPOSIT',
  EXPENSE = 'EXPENSE',
  REFUND = 'REFUND',
  INVOICE = 'INVOICE',
  RECEIVE_PAYMENT = 'RECEIVE_PAYMENT',
  BILL = 'BILL',
  BILL_PAYMENT = 'BILL_PAYMENT',
  TRANSFER = 'TRANSFER',
  CREDIT_CARD_PAYMENT = 'CREDIT_CARD_PAYMENT',
  JOURNAL_ENTRY = 'JOURNAL_ENTRY',
}

// Register types
export interface RegisterTransaction {
  id: string;
  transactionDate: string;
  type: TransactionType;
  description: string;
  debitAmount: number;
  creditAmount: number;
  payee?: string;
  referenceNumber?: string;
  isReconciled: boolean;
  runningBalance: number;
  source: 'journal_entry' | 'bank_transaction';
  bankAccount?: {
    id: string;
    name: string;
    accountNumber: string;
  };
  journalEntry?: {
    id: string;
    entryNumber: string;
    entryDate: string;
    description?: string;
    createdByUser?: {
      email: string;
      firstName: string | null;
      lastName: string | null;
    };
  };
  pairedAccount?: string;
}

export interface AccountRegister {
  account: Account;
  transactions: RegisterTransaction[];
  currentBalance: number;
}

export interface CreateTransactionData {
  bankAccountId: string;
  transactionDate: string;
  description: string;
  type: TransactionType;
  amount: number;
  payee?: string;
  referenceNumber?: string;
  checkNumber?: string;
  expenseAccountId?: string;
  incomeAccountId?: string;
  toBankAccountId?: string;
  fromBankAccountId?: string;
  invoiceId?: string;
  billId?: string;
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
  entryDate: string;
  description: string | null;
  status: JournalEntryStatus;
  isActive: boolean;
  transactionType?: TransactionType;
  payee?: string | null;
  createdAt: string;
  updatedAt: string;
  lines?: JournalEntryLine[];
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
  VOID = 'VOID',
}

export interface CreateJournalEntryData {
  entryNumber?: string;
  entryDate: string;
  description?: string;
  status?: JournalEntryStatus;
  transactionType?: TransactionType;
  payee?: string;
  lines: Array<{
    accountId: string;
    description?: string;
    debit: number;
    credit: number;
  }>;
}

export interface UpdateJournalEntryData {
  entryDate?: string;
  description?: string;
  status?: JournalEntryStatus;
  transactionType?: TransactionType;
  payee?: string;
  lines?: Array<{
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
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  all?: string; // 'true' to fetch all accounts without pagination
}

// Plaid types
export interface PlaidAccount {
  id: string;
  plaidItemId: string;
  accountId: string;
  name: string;
  mask: string | null;
  type: string;
  subtype: string | null;
  officialName: string | null;
  balanceAvailable: number | null;
  balanceCurrent: number | null;
  balanceLimit: number | null;
  currencyCode: string;
  bankAccountId: string | null;
  bankAccount?: BankAccount;
  createdAt: string;
  updatedAt: string;
}

export interface PlaidItem {
  id: string;
  itemId: string;
  institutionId: string | null;
  institutionName: string | null;
  webhook: string | null;
  error: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  plaidAccounts: PlaidAccount[];
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

export interface CreateLinkTokenResponse {
  link_token: string;
  expiration: string;
}

export interface ExchangePublicTokenData {
  public_token: string;
}

export interface LinkPlaidAccountData {
  plaidAccountId: string;
  bankAccountId: string;
}

export interface SyncTransactionsData {
  itemId?: string;
  startDate?: string;
  endDate?: string;
}

export interface SyncTransactionsResponse {
  message: string;
  syncedCount: number;
  errors?: Array<{
    accountId?: string;
    itemId?: string;
    error: string;
  }>;
}