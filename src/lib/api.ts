import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import type {
  LoginResponse,
  RegisterResponse,
  ProfileResponse,
  CreateUserData,
  UpdateUserData,
  User,
  Account,
  CreateAccountData,
  Customer,
  CreateCustomerData,
  Vendor,
  CreateVendorData,
  Item,
  CreateItemData,
  ItemType,
  Invoice,
  CreateInvoiceData,
  InvoiceQueryParams,
  ReceivePayment,
  CreateReceivePaymentData,
  UpdateReceivePaymentData,
  Deposit,
  CreateDepositData,
  UpdateDepositData,
  Bill,
  CreateBillData,
  BillQueryParams,
  BillPayment,
  CreateBillPaymentData,
  UpdateBillPaymentData,
  Transaction,
  CreateTransactionData,
  TransactionQueryParams,
  AccountRegister,
  BankAccount,
  CreateBankAccountData,
  JournalEntry,
  CreateJournalEntryData,
  UpdateJournalEntryData,
  JournalEntryQueryParams,
  Reconciliation,
  CreateReconciliationData,
  ReconciliationQueryParams,
  AccountQueryParams,
  PaginatedResponse,
  JournalEntryStatus,
  PlaidItem,
  CreateLinkTokenResponse,
  ExchangePublicTokenData,
  LinkPlaidAccountData,
  SyncTransactionsData,
  SyncTransactionsResponse,
  CompanySettings,
  UpdateCompanySettingsData,
  UpdateLockBooksAuthData,
  VerifyLockBooksAuthData,
  BookLock,
  CreateBookLockData,
  ProfitLossReportResponse,
  ProfitLossTransactionsResponse,
} from '@/types/api.types';

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL;

// Create axios instance with default config
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token management
export const tokenManager = {
  getToken: (): string | null => {
    return localStorage.getItem('token');
  },

  setToken: (token: string): void => {
    localStorage.setItem('token', token);
  },

  removeToken: (): void => {
    localStorage.removeItem('token');
  },
};

// Request interceptor - Add auth token to requests
apiClient.interceptors.request.use(
  (config) => {
    const token = tokenManager.getToken();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors globally
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error: AxiosError) => {
    // Handle different error scenarios
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;

      switch (status) {
        case 401:
          // Unauthorized - only redirect to login if not already on login page
          // and if there's a token (meaning the user was authenticated)
          const isLoginRequest = error.config?.url?.includes('/auth/login');
          if (!isLoginRequest && tokenManager.getToken()) {
            tokenManager.removeToken();
            localStorage.removeItem('user');
            window.location.href = '/login';
          }
          break;

        case 403:
          // Forbidden
          console.error('Access forbidden:', data);
          break;

        case 404:
          // Not found
          console.error('Resource not found:', data);
          break;

        case 500:
          // Server error
          console.error('Server error:', data);
          break;

        default:
          console.error('API error:', data);
      }
    } else if (error.request) {
      // Request made but no response received
      console.error('Network error - no response received:', error.request);
    } else {
      // Error in request setup
      console.error('Request error:', error.message);
    }

    return Promise.reject(error);
  }
);

// Generic API methods
export const api = {
  /**
   * GET request
   */
  get: async <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    const response = await apiClient.get<T>(url, config);
    return response.data;
  },

  /**
   * POST request
   */
  post: async <T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> => {
    const response = await apiClient.post<T>(url, data, config);
    return response.data;
  },

  /**
   * PUT request
   */
  put: async <T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> => {
    const response = await apiClient.put<T>(url, data, config);
    return response.data;
  },

  /**
   * PATCH request
   */
  patch: async <T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> => {
    const response = await apiClient.patch<T>(url, data, config);
    return response.data;
  },

  /**
   * DELETE request
   */
  delete: async <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    const response = await apiClient.delete<T>(url, config);
    return response.data;
  },
};

// API Error handling helper
export interface ApiErrorResponse {
  message: string;
  error?: string;
  statusCode?: number;
}

export const getErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiErrorResponse>;
    return (
      axiosError.response?.data?.message ||
      axiosError.response?.data?.error ||
      axiosError.message ||
      'An unexpected error occurred'
    );
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'An unexpected error occurred';
};

// Specific API endpoints
export const authAPI = {
  login: (email: string, password: string): Promise<LoginResponse> =>
    api.post<LoginResponse>('/auth/login', { email, password }),

  register: (data: CreateUserData): Promise<RegisterResponse> =>
    api.post<RegisterResponse>('/auth/register', data),

  getProfile: (): Promise<ProfileResponse> =>
    api.get<ProfileResponse>('/auth/profile'),

  updateProfile: (data: UpdateUserData): Promise<{ message: string; user: User }> =>
    api.put('/auth/profile', data),

  changePassword: (data: { currentPassword: string; newPassword: string }): Promise<{ message: string }> =>
    api.post('/auth/change-password', data),
};

export const userAPI = {
  getAll: (): Promise<User[]> => api.get<User[]>('/users'),
  getById: (id: string): Promise<User> => api.get<User>(`/users/${id}`),
  create: (data: CreateUserData): Promise<User> => api.post<User>('/users', data),
  update: (id: string, data: UpdateUserData): Promise<User> => api.put<User>(`/users/${id}`, data),
  delete: (id: string): Promise<void> => api.delete(`/users/${id}`),
};

export const accountAPI = {
  getAll: (params?: AccountQueryParams): Promise<PaginatedResponse<Account> & { success: boolean; message: string }> =>
    api.get<PaginatedResponse<Account> & { success: boolean; message: string }>('/accounts', { params }),
  getById: (id: string): Promise<{ success: boolean; message: string; data: Account }> =>
    api.get<{ success: boolean; message: string; data: Account }>(`/accounts/${id}`),
  create: (data: CreateAccountData): Promise<{ success: boolean; message: string; data: Account }> =>
    api.post<{ success: boolean; message: string; data: Account }>('/accounts', data),
  update: (id: string, data: Partial<CreateAccountData>): Promise<{ success: boolean; message: string; data: Account }> =>
    api.put<{ success: boolean; message: string; data: Account }>(`/accounts/${id}`, data),
  toggleStatus: (id: string): Promise<{ success: boolean; message: string; data: Account }> =>
    api.patch<{ success: boolean; message: string; data: Account }>(`/accounts/${id}/toggle-status`),
  delete: (id: string): Promise<{ success: boolean; message: string; data: null }> =>
    api.delete<{ success: boolean; message: string; data: null }>(`/accounts/${id}`),
};

export const transactionAPI = {
  getAll: (params?: TransactionQueryParams): Promise<{ transactions: Transaction[] }> => api.get<{ transactions: Transaction[] }>('/transactions', { params }),
  getById: (id: string): Promise<Transaction> => api.get<Transaction>(`/transactions/${id}`),
  create: (data: CreateTransactionData): Promise<Transaction> => api.post<Transaction>('/transactions', data),
  update: (id: string, data: Partial<CreateTransactionData>): Promise<Transaction> => api.put<Transaction>(`/transactions/${id}`, data),
  delete: (id: string): Promise<void> => api.delete(`/transactions/${id}`),
  getAccountRegister: (accountId: string, params?: { startDate?: string; endDate?: string }): Promise<AccountRegister> =>
    api.get<AccountRegister>(`/transactions/register/${accountId}`, { params }),
  findMatches: (id: string): Promise<{ transaction: Transaction; matches: Transaction[] }> =>
    api.get<{ transaction: Transaction; matches: Transaction[] }>(`/transactions/${id}/matches`),
  acceptMatch: (id: string, manualTransactionId: string): Promise<{ message: string; transaction: Transaction; matchedTransactionId: string }> =>
    api.post<{ message: string; transaction: Transaction; matchedTransactionId: string }>(`/transactions/${id}/match`, { manualTransactionId }),
};

export const reportAPI = {
  getProfitLoss: (
    params?: {
      startDate?: string;
      endDate?: string;
      preset?: string;
      comparison?: string;
      comparisonStartDate?: string;
      comparisonEndDate?: string;
      displayBy?: string;
      accountId?: string;
    },
    config?: { signal?: AbortSignal }
  ): Promise<ProfitLossReportResponse | ProfitLossTransactionsResponse> =>
    api.get<ProfitLossReportResponse | ProfitLossTransactionsResponse>('/reports/profit-loss', { params, ...config }),
};

export const customerAPI = {
  getAll: (): Promise<{ success: boolean; message: string; data: Customer[] }> =>
    api.get<{ success: boolean; message: string; data: Customer[] }>('/customers'),
  getById: (id: string): Promise<{ success: boolean; message: string; data: Customer }> =>
    api.get<{ success: boolean; message: string; data: Customer }>(`/customers/${id}`),
  create: (data: CreateCustomerData): Promise<{ success: boolean; message: string; data: Customer }> =>
    api.post<{ success: boolean; message: string; data: Customer }>('/customers', data),
  update: (id: string, data: Partial<CreateCustomerData>): Promise<{ success: boolean; message: string; data: Customer }> =>
    api.put<{ success: boolean; message: string; data: Customer }>(`/customers/${id}`, data),
  delete: (id: string): Promise<void> => api.delete(`/customers/${id}`),
};

export const vendorAPI = {
  getAll: (): Promise<{ success: boolean; message: string; data: Vendor[] }> =>
    api.get<{ success: boolean; message: string; data: Vendor[] }>('/vendors'),
  getById: (id: string): Promise<{ success: boolean; message: string; data: Vendor }> =>
    api.get<{ success: boolean; message: string; data: Vendor }>(`/vendors/${id}`),
  create: (data: CreateVendorData): Promise<{ success: boolean; message: string; data: Vendor }> =>
    api.post<{ success: boolean; message: string; data: Vendor }>('/vendors', data),
  update: (id: string, data: Partial<CreateVendorData>): Promise<{ success: boolean; message: string; data: Vendor }> =>
    api.put<{ success: boolean; message: string; data: Vendor }>(`/vendors/${id}`, data),
  delete: (id: string): Promise<void> => api.delete(`/vendors/${id}`),
};

export const invoiceAPI = {
  getAll: (params?: InvoiceQueryParams): Promise<{ invoices: Invoice[] }> =>
    api.get<{ invoices: Invoice[] }>('/invoices', { params }),
  getById: (id: string): Promise<{ invoice: Invoice }> =>
    api.get<{ invoice: Invoice }>(`/invoices/${id}`),
  create: (data: CreateInvoiceData): Promise<{ message: string; invoice: Invoice }> =>
    api.post<{ message: string; invoice: Invoice }>('/invoices', data),
  update: (id: string, data: Partial<CreateInvoiceData>): Promise<{ message: string; invoice: Invoice }> =>
    api.put<{ message: string; invoice: Invoice }>(`/invoices/${id}`, data),
  delete: (id: string): Promise<{ message: string }> =>
    api.delete<{ message: string }>(`/invoices/${id}`),
};

export const receivePaymentAPI = {
  getAll: (params?: { invoiceId?: string; bankAccountId?: string; startDate?: string; endDate?: string }): Promise<{ receivePayments: ReceivePayment[] }> =>
    api.get<{ receivePayments: ReceivePayment[] }>('/receive-payments', { params }),
  getById: (id: string): Promise<{ receivePayment: ReceivePayment }> =>
    api.get<{ receivePayment: ReceivePayment }>(`/receive-payments/${id}`),
  create: (data: CreateReceivePaymentData): Promise<{ message: string; receivePayment: ReceivePayment }> =>
    api.post<{ message: string; receivePayment: ReceivePayment }>('/receive-payments', data),
  update: (id: string, data: UpdateReceivePaymentData): Promise<{ message: string; receivePayment: ReceivePayment }> =>
    api.put<{ message: string; receivePayment: ReceivePayment }>(`/receive-payments/${id}`, data),
  delete: (id: string): Promise<{ message: string }> =>
    api.delete<{ message: string }>(`/receive-payments/${id}`),
};

export const depositAPI = {
  getAll: (params?: { bankAccountId?: string; startDate?: string; endDate?: string }): Promise<{ deposits: Deposit[] }> =>
    api.get<{ deposits: Deposit[] }>('/deposits', { params }),
  getById: (id: string): Promise<{ deposit: Deposit }> =>
    api.get<{ deposit: Deposit }>(`/deposits/${id}`),
  create: (data: CreateDepositData): Promise<{ message: string; deposit: Deposit }> =>
    api.post<{ message: string; deposit: Deposit }>('/deposits', data),
  update: (id: string, data: UpdateDepositData): Promise<{ message: string; deposit: Deposit }> =>
    api.put<{ message: string; deposit: Deposit }>(`/deposits/${id}`, data),
  delete: (id: string): Promise<{ message: string }> =>
    api.delete<{ message: string }>(`/deposits/${id}`),
};

export const billAPI = {
  getAll: (params?: BillQueryParams): Promise<{ bills: Bill[] }> =>
    api.get<{ bills: Bill[] }>('/bills', { params }),
  getById: (id: string): Promise<{ bill: Bill }> =>
    api.get<{ bill: Bill }>(`/bills/${id}`),
  create: (data: CreateBillData): Promise<{ message: string; bill: Bill }> =>
    api.post<{ message: string; bill: Bill }>('/bills', data),
  update: (id: string, data: Partial<CreateBillData>): Promise<{ message: string; bill: Bill }> =>
    api.put<{ message: string; bill: Bill }>(`/bills/${id}`, data),
  delete: (id: string): Promise<{ message: string }> =>
    api.delete<{ message: string }>(`/bills/${id}`),
};

export const billPaymentAPI = {
  getAll: (params?: { billId?: string; bankAccountId?: string; startDate?: string; endDate?: string }): Promise<{ billPayments: BillPayment[] }> =>
    api.get<{ billPayments: BillPayment[] }>('/bill-payments', { params }),
  getById: (id: string): Promise<{ billPayment: BillPayment }> =>
    api.get<{ billPayment: BillPayment }>(`/bill-payments/${id}`),
  create: (data: CreateBillPaymentData): Promise<{ message: string; billPayment: BillPayment }> =>
    api.post<{ message: string; billPayment: BillPayment }>('/bill-payments', data),
  update: (id: string, data: UpdateBillPaymentData): Promise<{ message: string; billPayment: BillPayment }> =>
    api.put<{ message: string; billPayment: BillPayment }>(`/bill-payments/${id}`, data),
  delete: (id: string): Promise<{ message: string }> =>
    api.delete<{ message: string }>(`/bill-payments/${id}`),
};

export const itemAPI = {
  getAll: (params?: { type?: ItemType }): Promise<{ items: Item[] }> =>
    api.get<{ items: Item[] }>('/items', { params }),
  getById: (id: string): Promise<{ item: Item }> => api.get<{ item: Item }>(`/items/${id}`),
  create: (data: CreateItemData & { description?: string; sku?: string }): Promise<{ message: string; item: Item }> =>
    api.post<{ message: string; item: Item }>('/items', data),
  update: (id: string, data: Partial<CreateItemData> & { description?: string; sku?: string }): Promise<{ message: string; item: Item }> =>
    api.put<{ message: string; item: Item }>(`/items/${id}`, data),
  delete: (id: string): Promise<{ message: string }> => api.delete<{ message: string }>(`/items/${id}`),
};

export const journalEntryAPI = {
  getAll: (params?: JournalEntryQueryParams): Promise<{ journalEntries: JournalEntry[] }> =>
    api.get<{ journalEntries: JournalEntry[] }>('/journal-entries', { params }),
  getById: (id: string): Promise<{ journalEntry: JournalEntry }> =>
    api.get<{ journalEntry: JournalEntry }>(`/journal-entries/${id}`),
  create: (data: CreateJournalEntryData): Promise<{ message: string; journalEntry: JournalEntry }> =>
    api.post<{ message: string; journalEntry: JournalEntry }>('/journal-entries', data),
  update: (id: string, data: UpdateJournalEntryData): Promise<{ message: string; journalEntry: JournalEntry }> =>
    api.put<{ message: string; journalEntry: JournalEntry }>(`/journal-entries/${id}`, data),
  updateStatus: (id: string, status: JournalEntryStatus): Promise<{ message: string; journalEntry: JournalEntry }> =>
    api.patch<{ message: string; journalEntry: JournalEntry }>(`/journal-entries/${id}/status`, { status }),
  delete: (id: string): Promise<{ message: string }> =>
    api.delete<{ message: string }>(`/journal-entries/${id}`),
};

export const bankAccountAPI = {
  getAll: (): Promise<BankAccount[]> => api.get<{ bankAccounts: BankAccount[] }>('/bank-accounts').then(res => res.bankAccounts),
  getById: (id: string): Promise<BankAccount> => api.get<{ bankAccount: BankAccount }>(`/bank-accounts/${id}`).then(res => res.bankAccount),
  create: (data: CreateBankAccountData): Promise<BankAccount> => api.post<{ bankAccount: BankAccount }>('/bank-accounts', data).then(res => res.bankAccount),
  update: (id: string, data: Partial<CreateBankAccountData>): Promise<BankAccount> => api.put<{ bankAccount: BankAccount }>(`/bank-accounts/${id}`, data).then(res => res.bankAccount),
  delete: (id: string): Promise<void> => api.delete(`/bank-accounts/${id}`),
};

export const reconciliationAPI = {
  getAll: (params?: ReconciliationQueryParams): Promise<Reconciliation[]> => api.get<Reconciliation[]>('/reconciliations', { params }),
  getById: (id: string): Promise<Reconciliation> => api.get<Reconciliation>(`/reconciliations/${id}`),
  create: (data: CreateReconciliationData): Promise<Reconciliation> => api.post<Reconciliation>('/reconciliations', data),
  update: (id: string, data: Partial<CreateReconciliationData>): Promise<Reconciliation> => api.put<Reconciliation>(`/reconciliations/${id}`, data),
  delete: (id: string): Promise<void> => api.delete(`/reconciliations/${id}`),
};

export const plaidAPI = {
  createLinkToken: (): Promise<CreateLinkTokenResponse> =>
    api.post<CreateLinkTokenResponse>('/plaid/create-link-token'),
  exchangePublicToken: (data: ExchangePublicTokenData): Promise<{ message: string; itemId: string }> =>
    api.post<{ message: string; itemId: string }>('/plaid/exchange-public-token', data),
  syncAccounts: (itemId?: string): Promise<{ message: string; syncedAccounts: number }> =>
    api.post<{ message: string; syncedAccounts: number }>('/plaid/sync-accounts', { itemId }),
  getItems: (): Promise<{ items: PlaidItem[] }> =>
    api.get<{ items: PlaidItem[] }>('/plaid/items'),
  linkAccount: (data: LinkPlaidAccountData): Promise<{ message: string }> =>
    api.post<{ message: string }>('/plaid/link-account', data),
  syncTransactions: (data?: SyncTransactionsData): Promise<SyncTransactionsResponse> =>
    api.post<SyncTransactionsResponse>('/plaid/sync-transactions', data),
  removeItem: (id: string): Promise<{ message: string }> =>
    api.delete<{ message: string }>(`/plaid/items/${id}`),
};

export const companySettingsAPI = {
  getSettings: (): Promise<{ settings: CompanySettings }> =>
    api.get<{ settings: CompanySettings }>('/company-settings'),
  updateSettings: (data: UpdateCompanySettingsData): Promise<{ message: string; settings: CompanySettings }> =>
    api.put<{ message: string; settings: CompanySettings }>('/company-settings', data),
  updateLockBooksAuth: (data: UpdateLockBooksAuthData): Promise<{ message: string }> =>
    api.put<{ message: string }>('/company-settings/lock-books-auth', data),
  removeLockBooksAuth: (): Promise<{ message: string }> =>
    api.delete<{ message: string }>('/company-settings/lock-books-auth'),
  verifyLockBooksAuth: (data: VerifyLockBooksAuthData): Promise<{ message: string; valid: boolean }> =>
    api.post<{ message: string; valid: boolean }>('/company-settings/lock-books-auth/verify', data),
  createBookLock: (data: CreateBookLockData): Promise<{ message: string; bookLock: BookLock }> =>
    api.post<{ message: string; bookLock: BookLock }>('/company-settings/book-locks', data),
  getBookLocks: (): Promise<{ bookLocks: BookLock[] }> =>
    api.get<{ bookLocks: BookLock[] }>('/company-settings/book-locks'),
  getActiveBookLock: (): Promise<{ activeLock: BookLock | null }> =>
    api.get<{ activeLock: BookLock | null }>('/company-settings/book-locks/active'),
  checkDateLocked: (date: string): Promise<{ isLocked: boolean; lockDate?: string }> =>
    api.get<{ isLocked: boolean; lockDate?: string }>('/company-settings/book-locks/check', { params: { date } }),
  deleteBookLock: (id: string, data: { authPassword?: string; authPIN?: string }): Promise<{ message: string }> =>
    api.delete<{ message: string }>(`/company-settings/book-locks/${id}`, { data }),
};

// Export the main axios instance for advanced use cases
export default apiClient;